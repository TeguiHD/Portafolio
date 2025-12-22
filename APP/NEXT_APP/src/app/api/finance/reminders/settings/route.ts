import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface ReminderSettings {
    dailyLogReminder: {
        enabled: boolean;
        time: string;
    };
    budgetAlerts: {
        enabled: boolean;
        threshold: number;
    };
    weeklyReview: {
        enabled: boolean;
        dayOfWeek: number;
        time: string;
    };
    emailNotifications: {
        enabled: boolean;
        email: string;
    };
}

const defaultSettings: ReminderSettings = {
    dailyLogReminder: { enabled: true, time: "20:00" },
    budgetAlerts: { enabled: true, threshold: 80 },
    weeklyReview: { enabled: true, dayOfWeek: 0, time: "10:00" },
    emailNotifications: { enabled: false, email: "" },
};

// In-memory cache for settings (in production, use Redis or database)
const settingsCache = new Map<string, ReminderSettings>();

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const userId = session.user.id;
        const cachedSettings = settingsCache.get(userId);

        return NextResponse.json({ data: cachedSettings || defaultSettings });
    } catch (error) {
        console.error("Error fetching reminder settings:", error);
        return NextResponse.json({ data: defaultSettings });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const userId = session.user.id;
        const newSettings = await request.json() as ReminderSettings;

        // Store in cache
        settingsCache.set(userId, newSettings);

        return NextResponse.json({ success: true, data: newSettings });
    } catch (error) {
        console.error("Error saving reminder settings:", error);
        return NextResponse.json(
            { error: "Error al guardar configuración" },
            { status: 500 }
        );
    }
}
