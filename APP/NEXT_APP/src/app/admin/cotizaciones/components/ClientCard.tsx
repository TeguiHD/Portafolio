"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Eye, ChevronRight, Share2, User } from "lucide-react";
import ContactInfoModal from "../../clientes/contact-info-modal";
import ShareModal from "@/components/quotations/ShareModal";

interface Client {
    id: string;
    name: string;
    email: string | null;
    contactPhone?: string | null;
    slug: string;
    company?: string | null;
    _count: { quotations: number };
    user?: { id: string; name: string | null; email: string | null } | null;
    sharedWith?: {
        permission: string;
        sharedByUserId: string;
        createdAt: string | Date;
    }[];
}

interface Props {
    client: Client;
    currentUserId?: string;
    isSuperAdmin: boolean;
    isSpyMode?: boolean;
}

// Generate a consistent color based on client name
function getAvatarColor(name: string): string {
    const colors = [
        "from-indigo-500 to-purple-600",
        "from-emerald-500 to-teal-600",
        "from-amber-500 to-orange-600",
        "from-rose-500 to-pink-600",
        "from-cyan-500 to-blue-600",
        "from-violet-500 to-indigo-600",
        "from-fuchsia-500 to-purple-600",
        "from-lime-500 to-green-600",
    ];
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
}

export default function ClientCard({ client, currentUserId, isSuperAdmin, isSpyMode }: Props) {
    const [isHovered, setIsHovered] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    const avatarColor = getAvatarColor(client.name);
    const initials = client.name
        .split(" ")
        .map(w => w[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();

    const isOwner = currentUserId && client.user?.id === currentUserId;
    // isSharedWithMe logic removed as it was unused

    // Wait, sharedWith contains who it is shared WITH.
    // If I am browsing, and I see a client...
    // If it's my client, sharedWith shows who *I* shared it with.
    // If it's a shared client, the API returns it because I am in sharedWith list.
    // So if !isOwner, it must be shared with me (or I am superadmin/spy).

    const sharedBy = !isOwner && !isSuperAdmin ? client.user?.name : null;

    return (
        <div
            className="group relative bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl overflow-hidden transition-all duration-300 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Gradient overlay on hover */}
            <div
                className={`absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"
                    }`}
            />

            <div className="relative p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    {/* Avatar */}
                    <div
                        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-bold text-lg shadow-lg relative`}
                    >
                        {initials}

                        {/* Shared Badge (if shared with me) */}
                        {sharedBy && (
                            <div className="absolute -bottom-2 -right-2 bg-indigo-600 border-2 border-slate-900 rounded-full p-1" title={`Compartido por ${sharedBy}`}>
                                <User size={10} className="text-white" />
                            </div>
                        )}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-col items-end gap-2">
                        <span className="bg-slate-800/80 backdrop-blur text-slate-300 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium">
                            <FileText size={12} />
                            {client._count.quotations}
                        </span>
                        {isSpyMode && (
                            <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                <Eye size={10} />
                                Spy
                            </span>
                        )}
                        {/* Share button for owner */}
                        {isOwner && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    setShowShareModal(true);
                                }}
                                className="bg-slate-800/80 hover:bg-indigo-500/20 hover:text-indigo-400 backdrop-blur text-slate-300 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium transition-colors"
                            >
                                <Share2 size={12} />
                                Compartir
                            </button>
                        )}


                    </div>
                </div>

                {/* Client Info */}
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors mb-1 truncate">
                        {client.name}
                    </h3>
                    {client.company && (
                        <p className="text-sm text-slate-400 truncate mb-1">{client.company}</p>
                    )}
                    <p className="text-xs text-slate-500 font-mono">/{client.slug}</p>
                    {sharedBy && (
                        <p className="text-xs text-indigo-400 mt-1 flex items-center gap-1">
                            <Share2 size={10} /> Compartido por {sharedBy}
                        </p>
                    )}
                </div>

                {/* Owner info (superadmin spy mode) */}
                {isSuperAdmin && client.user && !isOwner && (
                    <div className="mb-4 py-2 px-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                        <p className="text-xs text-amber-400/80 truncate">
                            <span className="opacity-70">Propietario:</span>{" "}
                            <span className="font-medium">{client.user.name || client.user.email}</span>
                        </p>
                    </div>
                )}

                {/* Contact Actions */}
                <div className="mb-4">
                    <ContactInfoModal client={{
                        id: client.id,
                        name: client.name,
                        email: client.email || undefined,
                        contactPhone: client.contactPhone || undefined,
                        company: client.company || undefined,
                        slug: client.slug,
                    }} canDelete={isSuperAdmin || !!isOwner} />
                </div>

                {/* Main Action */}
                <Link
                    href={`/admin/cotizaciones/${client.id}`}
                    className="flex items-center justify-center gap-2 w-full bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/30 hover:border-indigo-500 text-indigo-400 hover:text-white px-4 py-2.5 rounded-xl font-medium transition-all duration-300 group/btn"
                >
                    <span>Ver cotizaciones</span>
                    <ChevronRight size={16} className="transform group-hover/btn:translate-x-1 transition-transform" />
                </Link>
            </div>

            {isOwner && currentUserId && (
                <ShareModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    client={client}
                    // @ts-expect-error - Prop exists in share modal but interface lagging
                    currentUserId={currentUserId}
                />
            )}
        </div>
    );
}
