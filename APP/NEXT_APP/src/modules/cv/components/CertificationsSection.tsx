"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import type { Certification } from "../utils/latex-templates-enhanced";

interface CertificationsSectionProps {
    certifications: Certification[];
    onChange: (certifications: Certification[]) => void;
}

export function CertificationsSection({ certifications, onChange }: CertificationsSectionProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const addCertification = () => {
        const newCert: Certification = {
            id: uuidv4(),
            name: "",
            issuer: "",
            date: "",
            url: "",
            credentialId: "",
        };
        onChange([...certifications, newCert]);
        setExpandedId(newCert.id);
    };

    const updateCertification = (id: string, updates: Partial<Certification>) => {
        onChange(certifications.map((cert) => (cert.id === id ? { ...cert, ...updates } : cert)));
    };

    const removeCertification = (id: string) => {
        onChange(certifications.filter((cert) => cert.id !== id));
        if (expandedId === id) setExpandedId(null);
    };

    return (
        <div className="glass-panel rounded-2xl border border-accent-1/20 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-semibold text-white">Certificaciones</h3>
                    <p className="text-sm text-neutral-400 mt-1">
                        Cursos, certificaciones y credenciales profesionales
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={addCertification}
                    className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 text-sm font-medium flex items-center gap-2 hover:bg-amber-500/30 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar Certificación
                </motion.button>
            </div>

            {certifications.length === 0 ? (
                <div className="text-center py-12 text-neutral-400">
                    <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    <p>No hay certificaciones agregadas</p>
                    <p className="text-sm mt-1">Agrega tus certificaciones profesionales</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <AnimatePresence>
                        {certifications.map((cert, index) => (
                            <motion.div
                                key={cert.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="border border-amber-500/20 rounded-xl bg-white/5 overflow-hidden"
                            >
                                {/* Header */}
                                <div
                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                    onClick={() => setExpandedId(expandedId === cert.id ? null : cert.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">
                                                {cert.name || "Nueva certificación"}
                                            </p>
                                            <p className="text-sm text-neutral-400">
                                                {cert.issuer || "Emisor"} • {cert.date || "Fecha"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeCertification(cert.id);
                                            }}
                                            className="p-2 rounded-lg text-red-400 hover:bg-red-400/20 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                        <svg
                                            className={`w-5 h-5 text-neutral-400 transition-transform ${expandedId === cert.id ? "rotate-180" : ""}`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Expanded content */}
                                <AnimatePresence>
                                    {expandedId === cert.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-4 pt-0 space-y-4 border-t border-white/10">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                                    <div>
                                                        <label className="block text-sm text-neutral-400 mb-2">
                                                            Nombre de la certificación
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={cert.name || ""}
                                                            onChange={(e) => updateCertification(cert.id, { name: e.target.value })}
                                                            placeholder="AWS Solutions Architect"
                                                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-500/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-neutral-400 mb-2">
                                                            Organización emisora
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={cert.issuer || ""}
                                                            onChange={(e) => updateCertification(cert.id, { issuer: e.target.value })}
                                                            placeholder="Amazon Web Services"
                                                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-500/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-neutral-400 mb-2">
                                                            Fecha de obtención
                                                        </label>
                                                        <input
                                                            type="month"
                                                            value={cert.date || ""}
                                                            onChange={(e) => updateCertification(cert.id, { date: e.target.value })}
                                                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-500/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-neutral-400 mb-2">
                                                            ID de credencial (opcional)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={cert.credentialId || ""}
                                                            onChange={(e) => updateCertification(cert.id, { credentialId: e.target.value })}
                                                            placeholder="ABC123XYZ"
                                                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-500/50"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="block text-sm text-neutral-400 mb-2">
                                                            URL de verificación (opcional)
                                                        </label>
                                                        <input
                                                            type="url"
                                                            value={cert.url || ""}
                                                            onChange={(e) => updateCertification(cert.id, { url: e.target.value })}
                                                            placeholder="https://www.credly.com/badges/..."
                                                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-500/50"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
