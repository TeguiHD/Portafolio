import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permission-check";
import type { Role } from "@prisma/client";

// GET: Security statistics for dashboard
export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const canView = await hasPermission(
            session.user.id,
            session.user.role as Role,
            "security.view"
        );

        if (!canView) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const range = searchParams.get("range") || "24h";

        const now = new Date();

        // Calculate trend date range
        let trendStartDate: Date;

        switch (range) {
            case "7d":
                trendStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case "30d":
                trendStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case "365d":
                trendStartDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                trendStartDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }

        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Main queries
        const [severityCounts, typeCounts, unresolvedCount, topIps, recentIncidents] = await Promise.all([
            prisma.securityIncident.groupBy({
                by: ["severity"],
                where: { createdAt: { gte: last24h } },
                _count: true,
            }),
            prisma.securityIncident.groupBy({
                by: ["type"],
                where: { createdAt: { gte: last24h } },
                _count: true,
                orderBy: { _count: { type: "desc" } },
                take: 10,
            }),
            prisma.securityIncident.count({
                where: { resolved: false },
            }),
            prisma.securityIncident.groupBy({
                by: ["ipHash"],
                where: { createdAt: { gte: last7d } },
                _count: true,
                orderBy: { _count: { ipHash: "desc" } },
                take: 5,
            }),
            prisma.securityIncident.findMany({
                orderBy: { createdAt: "desc" },
                take: 10,
            }),
        ]);

        // Trend query - using separate queries for each interval type to avoid GROUP BY issues
        let trendData: Array<{ hour: Date; count: bigint }> = [];
        try {
            if (range === "24h") {
                trendData = await prisma.$queryRaw<Array<{ hour: Date; count: bigint }>>`
                    SELECT 
                        DATE_TRUNC('hour', "createdAt") as hour,
                        COUNT(*) as count
                    FROM "SecurityIncident"
                    WHERE "createdAt" >= ${trendStartDate}
                    GROUP BY DATE_TRUNC('hour', "createdAt")
                    ORDER BY hour ASC
                `;
            } else if (range === "7d" || range === "30d") {
                trendData = await prisma.$queryRaw<Array<{ hour: Date; count: bigint }>>`
                    SELECT 
                        DATE_TRUNC('day', "createdAt") as hour,
                        COUNT(*) as count
                    FROM "SecurityIncident"
                    WHERE "createdAt" >= ${trendStartDate}
                    GROUP BY DATE_TRUNC('day', "createdAt")
                    ORDER BY hour ASC
                `;
            } else {
                trendData = await prisma.$queryRaw<Array<{ hour: Date; count: bigint }>>`
                    SELECT 
                        DATE_TRUNC('month', "createdAt") as hour,
                        COUNT(*) as count
                    FROM "SecurityIncident"
                    WHERE "createdAt" >= ${trendStartDate}
                    GROUP BY DATE_TRUNC('month', "createdAt")
                    ORDER BY hour ASC
                `;
            }
        } catch (trendError) {
            console.error("Error in trend query:", trendError);
        }

        // Format severity counts
        const bySeverity = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
        severityCounts.forEach(item => {
            bySeverity[item.severity] = item._count;
        });

        // Format type counts
        const byType = typeCounts.map(item => ({
            type: item.type,
            count: item._count,
        }));

        // Format trend data based on range
        const hourlyData: { hour: string; count: number }[] = [];

        if (range === "24h") {
            for (let i = 23; i >= 0; i--) {
                const targetHour = new Date(now);
                targetHour.setMinutes(0, 0, 0);
                targetHour.setHours(targetHour.getHours() - i);

                const found = trendData.find(
                    h => new Date(h.hour).getHours() === targetHour.getHours() &&
                        new Date(h.hour).getDate() === targetHour.getDate()
                );

                hourlyData.push({
                    hour: targetHour.toISOString(),
                    count: found ? Number(found.count) : 0,
                });
            }
        } else if (range === "7d" || range === "30d") {
            const days = range === "7d" ? 7 : 30;
            for (let i = days - 1; i >= 0; i--) {
                const targetDay = new Date(now);
                targetDay.setHours(0, 0, 0, 0);
                targetDay.setDate(targetDay.getDate() - i);

                const found = trendData.find(
                    h => new Date(h.hour).toDateString() === targetDay.toDateString()
                );

                hourlyData.push({
                    hour: targetDay.toISOString(),
                    count: found ? Number(found.count) : 0,
                });
            }
        } else {
            for (let i = 11; i >= 0; i--) {
                const targetMonth = new Date(now);
                targetMonth.setDate(1);
                targetMonth.setHours(0, 0, 0, 0);
                targetMonth.setMonth(targetMonth.getMonth() - i);

                const found = trendData.find(
                    h => new Date(h.hour).getMonth() === targetMonth.getMonth() &&
                        new Date(h.hour).getFullYear() === targetMonth.getFullYear()
                );

                hourlyData.push({
                    hour: targetMonth.toISOString(),
                    count: found ? Number(found.count) : 0,
                });
            }
        }

        // Format top IPs
        const suspiciousIps = topIps.map(item => ({
            ipHash: item.ipHash.substring(0, 8) + "...",
            count: item._count,
        }));

        return NextResponse.json({
            bySeverity,
            byType,
            unresolvedCount,
            hourlyTrend: hourlyData,
            suspiciousIps,
            recentIncidents,
            range,
            lastUpdated: now.toISOString(),
        });
    } catch (error) {
        console.error("Error fetching security stats:", error);
        return NextResponse.json(
            { error: "Error fetching stats" },
            { status: 500 }
        );
    }
}
