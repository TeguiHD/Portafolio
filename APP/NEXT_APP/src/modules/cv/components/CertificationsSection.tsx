"use client";

import { useId, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Award, BadgeCheck, Plus, Trophy } from "lucide-react";
import { BOTON, CAMPO, ETIQUETA, INTERRUPTOR } from "./estilos";
import { ElementoPlegable, SeccionEditor, Vacio } from "./piezas";

const TIPOS = [
    { value: "certification" as const, label: "Certificación", icono: BadgeCheck },
    { value: "award" as const, label: "Premio", icono: Trophy },
    { value: "honor" as const, label: "Reconocimiento", icono: Award },
];
import type { Certification } from "../utils/latex-templates-enhanced";

interface CertificationsSectionProps {
    certifications: Certification[];
    onChange: (certifications: Certification[]) => void;
}

export function CertificationsSection({ certifications, onChange }: CertificationsSectionProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const base = useId();

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
        <SeccionEditor
            titulo="Certificaciones"
            descripcion="Cursos, certificaciones, premios y reconocimientos."
            acciones={
                <button type="button" onClick={addCertification} className={BOTON}>
                    <Plus className="size-4" aria-hidden="true" />
                    Agregar certificación
                </button>
            }
        >
            {certifications.length === 0 ? (
                <Vacio titulo="Aún no hay certificaciones." detalle="Agrega tus certificaciones profesionales." />
            ) : (
                <ul className="border-t border-[var(--linea)]">
                    {certifications.map((cert, index) => {
                        const fid = `${base}-${cert.id}`;
                        const tipo = TIPOS.find((t) => t.value === (cert.type || "certification")) ?? TIPOS[0];
                        const IconoTipo = tipo.icono;
                        return (
                            <ElementoPlegable
                                key={cert.id}
                                numero={index + 1}
                                marca={
                                    cert.type === "award" || cert.type === "honor" ? (
                                        <IconoTipo className="size-4 text-amber-400" aria-hidden="true" />
                                    ) : undefined
                                }
                                titulo={cert.name || "Certificación sin nombre"}
                                subtitulo={`${tipo.label} · ${cert.issuer || "Emisor"} · ${cert.date || "Sin fecha"}`}
                                abierto={expandedId === cert.id}
                                alAlternar={() => setExpandedId(expandedId === cert.id ? null : cert.id)}
                                alEliminar={() => removeCertification(cert.id)}
                                etiquetaEliminar={`Eliminar certificación ${index + 1}`}
                            >
                                <fieldset className="m-0 border-0 p-0">
                                    <legend className={ETIQUETA}>Tipo</legend>
                                    <div className="flex flex-wrap gap-2">
                                        {TIPOS.map(({ value, label, icono: Icono }) => (
                                            <button
                                                key={value}
                                                type="button"
                                                aria-pressed={(cert.type || "certification") === value}
                                                onClick={() => updateCertification(cert.id, { type: value })}
                                                className={INTERRUPTOR}
                                            >
                                                <Icono className="size-4" aria-hidden="true" />
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </fieldset>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label htmlFor={`${fid}-nombre`} className={ETIQUETA}>Nombre</label>
                                        <input
                                            id={`${fid}-nombre`}
                                            type="text"
                                            value={cert.name || ""}
                                            onChange={(e) => updateCertification(cert.id, { name: e.target.value })}
                                            placeholder="AWS Solutions Architect"
                                            className={CAMPO}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor={`${fid}-emisor`} className={ETIQUETA}>Organización emisora</label>
                                        <input
                                            id={`${fid}-emisor`}
                                            type="text"
                                            value={cert.issuer || ""}
                                            onChange={(e) => updateCertification(cert.id, { issuer: e.target.value })}
                                            placeholder="Amazon Web Services"
                                            className={CAMPO}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor={`${fid}-fecha`} className={ETIQUETA}>Fecha de obtención</label>
                                        <input
                                            id={`${fid}-fecha`}
                                            type="month"
                                            value={cert.date || ""}
                                            onChange={(e) => updateCertification(cert.id, { date: e.target.value })}
                                            className={CAMPO}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor={`${fid}-credencial`} className={ETIQUETA}>ID de credencial (opcional)</label>
                                        <input
                                            id={`${fid}-credencial`}
                                            type="text"
                                            value={cert.credentialId || ""}
                                            onChange={(e) => updateCertification(cert.id, { credentialId: e.target.value })}
                                            placeholder="ABC123XYZ"
                                            className={CAMPO}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label htmlFor={`${fid}-url`} className={ETIQUETA}>URL de verificación (opcional)</label>
                                        <input
                                            id={`${fid}-url`}
                                            type="url"
                                            value={cert.url || ""}
                                            onChange={(e) => updateCertification(cert.id, { url: e.target.value })}
                                            placeholder="https://www.credly.com/badges/…"
                                            className={CAMPO}
                                        />
                                    </div>
                                </div>
                            </ElementoPlegable>
                        );
                    })}
                </ul>
            )}
        </SeccionEditor>
    );
}
