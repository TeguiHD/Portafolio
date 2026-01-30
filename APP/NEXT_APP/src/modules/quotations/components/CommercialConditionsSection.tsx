"use client";

import type { CommercialConditions, WarrantyDelivery } from "../types";
import { RichTextEditor } from "./RichTextEditor";

interface CommercialConditionsSectionProps {
    conditions: CommercialConditions;
    warranty: WarrantyDelivery;
    footerNote: string;
    onConditionsChange: (conditions: CommercialConditions) => void;
    onWarrantyChange: (warranty: WarrantyDelivery) => void;
    onFooterNoteChange: (note: string) => void;
}

export function CommercialConditionsSection({
    conditions,
    warranty,
    footerNote,
    onConditionsChange,
    onWarrantyChange,
    onFooterNoteChange,
}: CommercialConditionsSectionProps) {
    return (
        <div className="space-y-4">
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Commercial Conditions */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <span className="text-lg">📋</span>
                        Condiciones Comerciales
                    </h4>
                    <div className="space-y-2.5">
                        <div className="flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">🕐</span>
                            <div className="flex-1">
                                <label className="text-xs text-neutral-400">Plazo</label>
                                <input
                                    type="text"
                                    value={conditions.deadline}
                                    onChange={(e) => onConditionsChange({ ...conditions, deadline: e.target.value })}
                                    className="w-full px-2 py-1 text-sm bg-white/5 border border-white/10 rounded text-white"
                                    placeholder="18 días hábiles"
                                />
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="text-yellow-400 mt-0.5">💰</span>
                            <div className="flex-1">
                                <label className="text-xs text-neutral-400">Pagos</label>
                                <input
                                    type="text"
                                    value={conditions.payments}
                                    onChange={(e) => onConditionsChange({ ...conditions, payments: e.target.value })}
                                    className="w-full px-2 py-1 text-sm bg-white/5 border border-white/10 rounded text-white"
                                    placeholder="50% Inicio / 50% entrega conforme"
                                />
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="text-purple-400 mt-0.5">🔄</span>
                            <div className="flex-1">
                                <label className="text-xs text-neutral-400">Revisiones</label>
                                <input
                                    type="text"
                                    value={conditions.revisions}
                                    onChange={(e) => onConditionsChange({ ...conditions, revisions: e.target.value })}
                                    className="w-full px-2 py-1 text-sm bg-white/5 border border-white/10 rounded text-white"
                                    placeholder="2 rondas de feedback incluidas"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Warranty & Delivery */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <span className="text-lg">🛡️</span>
                        Garantía y Entrega
                    </h4>
                    <div className="space-y-2.5">
                        <div className="flex items-start gap-2">
                            <span className="text-green-400 mt-0.5">🎓</span>
                            <div className="flex-1">
                                <label className="text-xs text-neutral-400">Capacitación</label>
                                <input
                                    type="text"
                                    value={warranty.training}
                                    onChange={(e) => onWarrantyChange({ ...warranty, training: e.target.value })}
                                    className="w-full px-2 py-1 text-sm bg-white/5 border border-white/10 rounded text-white"
                                    placeholder="Sesión online de uso"
                                />
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">🔧</span>
                            <div className="flex-1">
                                <label className="text-xs text-neutral-400">Garantía</label>
                                <input
                                    type="text"
                                    value={warranty.warranty}
                                    onChange={(e) => onWarrantyChange({ ...warranty, warranty: e.target.value })}
                                    className="w-full px-2 py-1 text-sm bg-white/5 border border-white/10 rounded text-white"
                                    placeholder="30 días de soporte técnico"
                                />
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="text-orange-400 mt-0.5">📦</span>
                            <div className="flex-1">
                                <label className="text-xs text-neutral-400">Contenidos</label>
                                <input
                                    type="text"
                                    value={warranty.content}
                                    onChange={(e) => onWarrantyChange({ ...warranty, content: e.target.value })}
                                    className="w-full px-2 py-1 text-sm bg-white/5 border border-white/10 rounded text-white"
                                    placeholder="Carga histórica a cargo del cliente"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Note with Rich Text */}
            <div className="space-y-2">
                <label className="text-xs text-neutral-400">Nota al pie (se muestra en gris y cursiva - puedes usar negritas)</label>
                <RichTextEditor
                    content={footerNote}
                    onChange={onFooterNoteChange}
                    placeholder="*No incluye: Redacción de notas de prensa, servicios de fotografía, diseño de logotipos ni costos mensuales de hosting/dominio."
                    minHeight="60px"
                />
            </div>
        </div>
    );
}
