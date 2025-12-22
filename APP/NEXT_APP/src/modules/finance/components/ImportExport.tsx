"use client";

import { useState, useRef } from "react";

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

export function ImportExport() {
    const [activeTab, setActiveTab] = useState<"export" | "import">("export");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importResults, setImportResults] = useState<ImportResults | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (file) {
            handleImport(file);
        }
    };

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-gray-900/50 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab("export")}
                    className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all
                              ${activeTab === "export"
                                  ? "bg-blue-600 text-white"
                                  : "text-gray-400 hover:text-white"
                              }`}
                >
                    Exportar
                </button>
                <button
                    onClick={() => setActiveTab("import")}
                    className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all
                              ${activeTab === "import"
                                  ? "bg-blue-600 text-white"
                                  : "text-gray-400 hover:text-white"
                              }`}
                >
                    Importar
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">
                    {error}
                </div>
            )}

            {activeTab === "export" ? (
                <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6 space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Exportar Datos</h3>
                        <p className="text-sm text-gray-400">
                            Descarga tus datos financieros en formato JSON o CSV
                        </p>
                    </div>

                    {/* Format Selection */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-300">Formato</label>
                        <div className="flex gap-4">
                            {(["json", "csv"] as const).map((format) => (
                                <label key={format} className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="format"
                                        value={format}
                                        checked={exportOptions.format === format}
                                        onChange={(e) =>
                                            setExportOptions({ ...exportOptions, format: e.target.value as "json" | "csv" })
                                        }
                                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600"
                                    />
                                    <div>
                                        <span className="text-white font-medium">{format.toUpperCase()}</span>
                                        <p className="text-xs text-gray-400">
                                            {format === "json" ? "Completo (todas las entidades)" : "Solo transacciones"}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Data Selection */}
                    {exportOptions.format === "json" && (
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-300">Datos a exportar</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {[
                                    { key: "accounts" as const, label: "Cuentas" },
                                    { key: "categories" as const, label: "Categorías" },
                                    { key: "transactions" as const, label: "Transacciones" },
                                    { key: "budgets" as const, label: "Presupuestos" },
                                    { key: "goals" as const, label: "Metas" },
                                    { key: "recurring" as const, label: "Recurrentes" },
                                ].map(({ key, label }) => (
                                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={exportOptions[key]}
                                            onChange={(e) =>
                                                setExportOptions({ ...exportOptions, [key]: e.target.checked })
                                            }
                                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                                        />
                                        <span className="text-gray-300">{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300">Desde</label>
                            <input
                                type="date"
                                value={exportOptions.startDate}
                                onChange={(e) => setExportOptions({ ...exportOptions, startDate: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl
                                         text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300">Hasta</label>
                            <input
                                type="date"
                                value={exportOptions.endDate}
                                onChange={(e) => setExportOptions({ ...exportOptions, endDate: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl
                                         text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleExport}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-blue-500
                                 text-white font-medium rounded-xl hover:from-blue-500 hover:to-blue-400
                                 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Exportando...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Descargar {exportOptions.format.toUpperCase()}
                            </>
                        )}
                    </button>
                </div>
            ) : (
                <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6 space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Importar Datos</h3>
                        <p className="text-sm text-gray-400">
                            Sube un archivo JSON o CSV con tus datos financieros
                        </p>
                    </div>

                    {/* File Upload */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center
                                 hover:border-blue-500/50 cursor-pointer transition-colors"
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json,.csv"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                        </div>
                        <p className="text-white font-medium mb-1">Arrastra un archivo o haz clic para seleccionar</p>
                        <p className="text-sm text-gray-400">Soporta JSON y CSV</p>
                    </div>

                    {/* Import Results */}
                    {importResults && (
                        <div className="space-y-4">
                            <div className={`p-4 rounded-xl ${importResults.success ? "bg-green-500/20 border border-green-500/30" : "bg-red-500/20 border border-red-500/30"}`}>
                                <h4 className={`font-semibold mb-2 ${importResults.success ? "text-green-400" : "text-red-400"}`}>
                                    {importResults.success ? "Importación Completada" : "Importación con Errores"}
                                </h4>
                                <p className="text-sm text-gray-300">
                                    {importResults.summary.totalImported} registros importados,{" "}
                                    {importResults.summary.totalSkipped} omitidos
                                </p>
                            </div>

                            {/* Detailed Results */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {Object.entries(importResults.results).map(([key, value]) => {
                                    if (value.imported === 0 && value.skipped === 0) return null;
                                    return (
                                        <div key={key} className="p-3 bg-gray-800/50 rounded-xl">
                                            <p className="text-sm text-gray-400 capitalize mb-1">
                                                {key === "accounts" ? "Cuentas" :
                                                 key === "categories" ? "Categorías" :
                                                 key === "transactions" ? "Transacciones" :
                                                 key === "budgets" ? "Presupuestos" : "Metas"}
                                            </p>
                                            <div className="flex items-center gap-3">
                                                <span className="text-green-400 text-lg font-semibold">
                                                    +{value.imported}
                                                </span>
                                                {value.skipped > 0 && (
                                                    <span className="text-gray-500 text-sm">
                                                        ({value.skipped} omitidos)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                        <h4 className="text-blue-400 font-medium mb-2">Formato esperado</h4>
                        <ul className="text-sm text-gray-300 space-y-1">
                            <li>• <strong>JSON:</strong> Exportación completa del sistema</li>
                            <li>• <strong>CSV:</strong> Columnas: Fecha, Tipo, Monto, Descripción, Categoría, Cuenta</li>
                            <li>• Los registros duplicados serán omitidos automáticamente</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
