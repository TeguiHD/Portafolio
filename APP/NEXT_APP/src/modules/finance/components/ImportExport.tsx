"use client";

import { useState, useRef, useId } from "react";
import { Download, Upload } from "lucide-react";
import {
    BOTON, CASILLA, CIFRA, ERROR, ETIQUETA, FOCO, GIRA, LISTA, OPCION, OPCION_NO, OPCION_SI, SECCION, SOBRE, SUAVE, SUBE,
    TARJETA, CAMPO,
} from "./estilos";

interface ExportOptions {
    accounts: boolean;
    categories: boolean;
    transactions: boolean;
    budgets: boolean;
    goals: boolean;
    recurring: boolean;
    format: "json" | "csv";
    startDate: string;
    endDate: string;
}

interface ImportResults {
    success: boolean;
    results: {
        accounts: { imported: number; skipped: number; errors: string[] };
        categories: { imported: number; skipped: number; errors: string[] };
        transactions: { imported: number; skipped: number; errors: string[] };
        budgets: { imported: number; skipped: number; errors: string[] };
        goals: { imported: number; skipped: number; errors: string[] };
    };
    summary: {
        totalImported: number;
        totalSkipped: number;
    };
}

const NOMBRE_ENTIDAD: Record<string, string> = {
    accounts: "Cuentas",
    categories: "Categorías",
    transactions: "Transacciones",
    budgets: "Presupuestos",
    goals: "Metas",
};

export function ImportExport() {
    const [activeTab, setActiveTab] = useState<"export" | "import">("export");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importResults, setImportResults] = useState<ImportResults | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uid = useId();

    const [exportOptions, setExportOptions] = useState<ExportOptions>({
        accounts: true,
        categories: true,
        transactions: true,
        budgets: true,
        goals: true,
        recurring: true,
        format: "json",
        startDate: "",
        endDate: "",
    });

    const handleExport = async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.set("format", exportOptions.format);
            params.set("accounts", String(exportOptions.accounts));
            params.set("categories", String(exportOptions.categories));
            params.set("transactions", String(exportOptions.transactions));
            params.set("budgets", String(exportOptions.budgets));
            params.set("goals", String(exportOptions.goals));
            params.set("recurring", String(exportOptions.recurring));
            if (exportOptions.startDate) params.set("startDate", exportOptions.startDate);
            if (exportOptions.endDate) params.set("endDate", exportOptions.endDate);

            const res = await fetch(`/api/finance/export?${params}`);
            if (!res.ok) throw new Error("Error al exportar");

            const blob = await res.blob();
            const filename = res.headers
                .get("Content-Disposition")
                ?.split("filename=")[1]
                ?.replace(/"/g, "") || `finanzas.${exportOptions.format}`;

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async (file: File) => {
        setLoading(true);
        setError(null);
        setImportResults(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/finance/import", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Error al importar");
            }

            setImportResults(data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Se limpia para que elegir otra vez el mismo archivo (ya corregido) vuelva a importar.
        e.target.value = "";
        if (file) {
            handleImport(file);
        }
    };

    return (
        <section aria-label="Importar y exportar datos" className="space-y-5">
            <div role="group" aria-label="Elegir acción" className="flex flex-wrap gap-2">
                <button
                    type="button"
                    aria-pressed={activeTab === "export"}
                    onClick={() => setActiveTab("export")}
                    className={`${OPCION} ${activeTab === "export" ? OPCION_SI : OPCION_NO}`}
                >
                    Exportar
                </button>
                <button
                    type="button"
                    aria-pressed={activeTab === "import"}
                    onClick={() => setActiveTab("import")}
                    className={`${OPCION} ${activeTab === "import" ? OPCION_SI : OPCION_NO}`}
                >
                    Importar
                </button>
            </div>

            {error && (
                <p role="alert" className={ERROR}>
                    {error}
                </p>
            )}

            {activeTab === "export" ? (
                <div className={`${TARJETA} space-y-6 p-5 sm:p-6`}>
                    <div>
                        <h2 className="text-lg font-semibold text-[var(--txt)]">Exportar datos</h2>
                        <p className={`${SUAVE} mt-1`}>
                            Descarga tus datos financieros en formato JSON o CSV
                        </p>
                    </div>

                    <fieldset>
                        <legend className={ETIQUETA}>Formato</legend>
                        <div className="flex flex-wrap gap-x-8 gap-y-3">
                            {(["json", "csv"] as const).map((format) => (
                                <label key={format} className="flex min-h-11 cursor-pointer items-center gap-3">
                                    <input
                                        type="radio"
                                        name={`${uid}-formato`}
                                        value={format}
                                        checked={exportOptions.format === format}
                                        onChange={(e) =>
                                            setExportOptions({ ...exportOptions, format: e.target.value as "json" | "csv" })
                                        }
                                        className={CASILLA}
                                    />
                                    <span>
                                        <span className="block font-medium text-[var(--txt)]">{format.toUpperCase()}</span>
                                        <span className="block text-xs text-[var(--mut)]">
                                            {format === "json" ? "Completo (todas las entidades)" : "Solo transacciones"}
                                        </span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    {exportOptions.format === "json" && (
                        <fieldset>
                            <legend className={ETIQUETA}>Datos a exportar</legend>
                            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 md:grid-cols-3">
                                {[
                                    { key: "accounts" as const, label: "Cuentas" },
                                    { key: "categories" as const, label: "Categorías" },
                                    { key: "transactions" as const, label: "Transacciones" },
                                    { key: "budgets" as const, label: "Presupuestos" },
                                    { key: "goals" as const, label: "Metas" },
                                    { key: "recurring" as const, label: "Recurrentes" },
                                ].map(({ key, label }) => (
                                    <label key={key} className="flex min-h-11 cursor-pointer items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={exportOptions[key]}
                                            onChange={(e) =>
                                                setExportOptions({ ...exportOptions, [key]: e.target.checked })
                                            }
                                            className={CASILLA}
                                        />
                                        <span className="text-[var(--txt)]">{label}</span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor={`${uid}-desde`} className={ETIQUETA}>Desde</label>
                            <input
                                id={`${uid}-desde`}
                                type="date"
                                value={exportOptions.startDate}
                                onChange={(e) => setExportOptions({ ...exportOptions, startDate: e.target.value })}
                                className={CAMPO}
                            />
                        </div>
                        <div>
                            <label htmlFor={`${uid}-hasta`} className={ETIQUETA}>Hasta</label>
                            <input
                                id={`${uid}-hasta`}
                                type="date"
                                value={exportOptions.endDate}
                                onChange={(e) => setExportOptions({ ...exportOptions, endDate: e.target.value })}
                                className={CAMPO}
                            />
                        </div>
                    </div>

                    <button type="button" onClick={handleExport} disabled={loading} className={`${BOTON} w-full`}>
                        {loading ? (
                            <>
                                <span aria-hidden="true" className={GIRA} />
                                Exportando...
                            </>
                        ) : (
                            <>
                                <Download aria-hidden="true" className="size-4" />
                                Descargar {exportOptions.format.toUpperCase()}
                            </>
                        )}
                    </button>
                </div>
            ) : (
                <div className={`${TARJETA} space-y-6 p-5 sm:p-6`}>
                    <div>
                        <h2 className="text-lg font-semibold text-[var(--txt)]">Importar datos</h2>
                        <p className={`${SUAVE} mt-1`}>
                            Sube un archivo JSON o CSV con tus datos financieros
                        </p>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                        className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[var(--linea-2)] px-4 py-8 text-center transition-colors duration-150 motion-reduce:transition-none hover:border-[var(--acento)] disabled:cursor-not-allowed disabled:opacity-60 ${SOBRE} ${FOCO}`}
                    >
                        {loading ? (
                            <span aria-hidden="true" className="size-6 shrink-0 animate-spin rounded-full border-2 border-[var(--mut)] border-t-transparent motion-reduce:animate-none" />
                        ) : (
                            <Upload aria-hidden="true" className="size-6 text-[var(--mut)]" />
                        )}
                        <span className="font-medium text-[var(--txt)]">
                            {loading ? "Importando..." : "Elegir archivo"}
                        </span>
                        <span className={SUAVE}>Soporta JSON y CSV</span>
                    </button>

                    <div aria-live="polite">
                        {importResults && (
                            <div className="space-y-3">
                                <div>
                                    <h3 className={`font-semibold ${importResults.success ? "text-emerald-400" : "text-red-400"}`}>
                                        {importResults.success ? "Importación completada" : "Importación con errores"}
                                    </h3>
                                    <p className={`${SUAVE} ${CIFRA}`}>
                                        {importResults.summary.totalImported} registros importados,{" "}
                                        {importResults.summary.totalSkipped} omitidos
                                    </p>
                                </div>

                                <dl className={`${LISTA} m-0`}>
                                    {Object.entries(importResults.results).map(([key, value]) => {
                                        if (value.imported === 0 && value.skipped === 0) return null;
                                        return (
                                            <div key={key} className="flex items-baseline justify-between gap-3 border-b border-[var(--linea)] px-1 py-2.5">
                                                <dt className="text-sm text-[var(--mut)]">{NOMBRE_ENTIDAD[key] ?? key}</dt>
                                                <dd className={`m-0 ${CIFRA}`}>
                                                    <span className={`font-semibold ${SUBE}`}>+{value.imported}</span>
                                                    {value.skipped > 0 && (
                                                        <span className="ml-2 text-sm text-[var(--mut)]">
                                                            ({value.skipped} omitidos)
                                                        </span>
                                                    )}
                                                </dd>
                                            </div>
                                        );
                                    })}
                                </dl>
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className={`${SECCION} mb-2`}>Formato esperado</h3>
                        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--mut)] marker:text-[var(--mut)]">
                            <li><strong className="font-semibold text-[var(--txt)]">JSON:</strong> Exportación completa del sistema</li>
                            <li><strong className="font-semibold text-[var(--txt)]">CSV:</strong> Columnas: Fecha, Tipo, Monto, Descripción, Categoría, Cuenta</li>
                            <li>Los registros duplicados serán omitidos automáticamente</li>
                        </ul>
                    </div>
                </div>
            )}
        </section>
    );
}
