"use client";

import { useMemo, useState, useRef } from "react";
import { quoteTemplates, type QuoteTemplate } from "@/modules/admin/data/quote-templates";
import { Button } from "@/components/ui/Button";
import { v4 as uuid } from "uuid";
import { Copy, Download, Plus, Trash2, Upload, Save } from "lucide-react";

interface QuoteBoardProps {
  onLogout: () => void;
}

export function QuoteBoard({ onLogout }: QuoteBoardProps) {
  const [templates, setTemplates] = useState<QuoteTemplate[]>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("quote-templates") : null;
    return saved ? JSON.parse(saved) : quoteTemplates;
  });
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<QuoteTemplate | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Guardar en localStorage
  const saveTemplates = (newTemplates: QuoteTemplate[]) => {
    setTemplates(newTemplates);
    if (typeof window !== "undefined") {
      localStorage.setItem("quote-templates", JSON.stringify(newTemplates));
    }
  };

  const filtered = useMemo(
    () => templates.filter((t) => t.title.toLowerCase().includes(filter.toLowerCase())),
    [templates, filter]
  );

  const duplicate = (id: string) => {
    const base = templates.find((t) => t.id === id);
    if (!base) return;
    const copy: QuoteTemplate = {
      ...base,
      id: uuid(),
      title: `${base.title} (copia)`,
      updatedAt: new Date().toISOString(),
    };
    const newTemplates = [copy, ...templates];
    saveTemplates(newTemplates);
    setSelected(copy);
  };

  const deleteTemplate = (id: string) => {
    if (!confirm("¿Eliminar esta plantilla?")) return;
    const newTemplates = templates.filter((t) => t.id !== id);
    saveTemplates(newTemplates);
    if (selected?.id === id) setSelected(null);
  };

  const updateSelected = (patch: Partial<QuoteTemplate>) => {
    if (!selected) return;
    const next = { ...selected, ...patch, updatedAt: new Date().toISOString() };
    setSelected(next);
    const newTemplates = templates.map((t) => (t.id === next.id ? next : t));
    saveTemplates(newTemplates);
  };

  const addNew = () => {
    const fresh: QuoteTemplate = {
      id: uuid(),
      title: "Nueva cotización",
      scope: "Alcance del proyecto",
      deliverables: ["Entregable 1", "Entregable 2"],
      timeline: "4-6 semanas",
      price: "$0",
      customFields: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const newTemplates = [fresh, ...templates];
    saveTemplates(newTemplates);
    setSelected(fresh);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      updateSelected({ clientLogo: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const addCustomField = () => {
    if (!selected) return;
    const newFields = [...(selected.customFields || []), { label: "Nuevo campo", value: "" }];
    updateSelected({ customFields: newFields });
  };

  const updateCustomField = (index: number, field: { label: string; value: string }) => {
    if (!selected?.customFields) return;
    const newFields = [...selected.customFields];
    newFields[index] = field;
    updateSelected({ customFields: newFields });
  };

  const removeCustomField = (index: number) => {
    if (!selected?.customFields) return;
    const newFields = selected.customFields.filter((_, i) => i !== index);
    updateSelected({ customFields: newFields });
  };

  const exportText = (tpl: QuoteTemplate) => {
    const lines = [
      `═══════════════════════════════════════`,
      `COTIZACIÓN: ${tpl.title}`,
      `═══════════════════════════════════════`,
      ``,
      tpl.clientName ? `Cliente: ${tpl.clientName}` : "",
      `Alcance: ${tpl.scope}`,
      ``,
      `Entregables:`,
      ...tpl.deliverables.map((d) => `  • ${d}`),
      ``,
      `Timeline: ${tpl.timeline}`,
      `Precio: ${tpl.price}`,
      ``,
      ...(tpl.customFields || []).map((f) => `${f.label}: ${f.value}`),
      ``,
      tpl.notes ? `Notas: ${tpl.notes}` : "",
      ``,
      `Generado: ${new Date().toLocaleDateString("es-ES")}`,
    ].filter(Boolean);
    return lines.join("\n");
  };

  const exportPDF = () => {
    // Placeholder para exportación PDF (requeriría librería como jsPDF)
    alert("Exportación PDF próximamente. Por ahora usa 'Copiar resumen' o 'Exportar .txt'");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
      {/* Sidebar de plantillas */}
      <div className="glass-panel rounded-2xl border border-accent-1/20 bg-white/5 p-4 shadow-lg">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="text-lg font-semibold text-white">Plantillas</h3>
          <Button size="sm" onClick={addNew} className="gap-1">
            <Plus className="h-4 w-4" />
            Nueva
          </Button>
        </div>
        <input
          placeholder="Filtrar..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full rounded-lg border border-accent-1/20 bg-white/5 px-3 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:border-accent-1"
        />
        <div className="mt-3 space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
          {filtered.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => setSelected(tpl)}
              className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition ${
                selected?.id === tpl.id
                  ? "border-accent-1 bg-accent-1/10 text-white"
                  : "border-white/10 bg-white/5 text-neutral-200 hover:border-accent-1/30"
              }`}
            >
              <p className="font-semibold">{tpl.title}</p>
              <p className="text-xs text-neutral-400 mt-1">{tpl.timeline} · {tpl.price}</p>
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-neutral-400 pt-4 border-t border-white/10">
          <button onClick={onLogout} className="underline hover:text-accent-1 transition-colors">
            Cerrar sesión
          </button>
          <span>{templates.length} plantillas</span>
        </div>
      </div>

      {/* Editor principal */}
      <div className="glass-panel rounded-2xl border border-accent-1/20 bg-white/5 p-6 shadow-xl">
        {selected ? (
          <div className="space-y-6">
            {/* Header con acciones */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <input
                value={selected.title}
                onChange={(e) => updateSelected({ title: e.target.value })}
                className="flex-1 min-w-[200px] rounded-lg border border-accent-1/20 bg-white/5 px-4 py-2 text-xl font-semibold text-white outline-none focus:border-accent-1"
                placeholder="Título de la cotización"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => duplicate(selected.id)}>
                  Duplicar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteTemplate(selected.id)}
                  className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Logo y nombre del cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">Nombre del cliente</label>
                <input
                  value={selected.clientName || ""}
                  onChange={(e) => updateSelected({ clientName: e.target.value })}
                  className="w-full rounded-lg border border-accent-1/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-1"
                  placeholder="Ej: Empresa XYZ"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">Logo del cliente</label>
                <div className="flex items-center gap-3">
                  {selected.clientLogo && (
                    <img
                      src={selected.clientLogo}
                      alt="Logo"
                      className="h-12 w-12 rounded-lg object-contain border border-accent-1/20"
                    />
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => logoInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {selected.clientLogo ? "Cambiar logo" : "Subir logo"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Alcance */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Alcance del proyecto</label>
              <textarea
                value={selected.scope}
                onChange={(e) => updateSelected({ scope: e.target.value })}
                className="w-full rounded-lg border border-accent-1/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-1 resize-none"
                rows={4}
                placeholder="Describe el alcance del proyecto..."
              />
            </div>

            {/* Entregables */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">
                Entregables (uno por línea)
              </label>
              <textarea
                value={selected.deliverables.join("\n")}
                onChange={(e) =>
                  updateSelected({ deliverables: e.target.value.split("\n").filter(Boolean) })
                }
                className="w-full rounded-lg border border-accent-1/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-1 resize-none"
                rows={5}
                placeholder="Entregable 1&#10;Entregable 2&#10;..."
              />
            </div>

            {/* Timeline y Precio */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">Timeline</label>
                <input
                  value={selected.timeline}
                  onChange={(e) => updateSelected({ timeline: e.target.value })}
                  className="w-full rounded-lg border border-accent-1/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-1"
                  placeholder="Ej: 4-6 semanas"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">Precio</label>
                <input
                  value={selected.price}
                  onChange={(e) => updateSelected({ price: e.target.value })}
                  className="w-full rounded-lg border border-accent-1/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-1"
                  placeholder="Ej: $8k - $15k"
                />
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Notas adicionales</label>
              <textarea
                value={selected.notes || ""}
                onChange={(e) => updateSelected({ notes: e.target.value })}
                className="w-full rounded-lg border border-accent-1/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-1 resize-none"
                rows={3}
                placeholder="Notas, condiciones, etc..."
              />
            </div>

            {/* Campos personalizados */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-neutral-300">Campos personalizados</label>
                <Button size="sm" variant="outline" onClick={addCustomField} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Agregar campo
                </Button>
              </div>
              <div className="space-y-2">
                {selected.customFields?.map((field, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      value={field.label}
                      onChange={(e) =>
                        updateCustomField(idx, { ...field, label: e.target.value })
                      }
                      className="flex-1 rounded-lg border border-accent-1/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-1"
                      placeholder="Etiqueta"
                    />
                    <input
                      value={field.value}
                      onChange={(e) =>
                        updateCustomField(idx, { ...field, value: e.target.value })
                      }
                      className="flex-1 rounded-lg border border-accent-1/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-1"
                      placeholder="Valor"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeCustomField(idx)}
                      className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones de exportación */}
            <div className="flex items-center gap-3 pt-4 border-t border-accent-1/20">
              <Button
                variant="outline"
                onClick={() => {
                  const text = exportText(selected);
                  navigator.clipboard.writeText(text);
                  alert("¡Copiado al portapapeles!");
                }}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copiar resumen
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const text = exportText(selected);
                  const blob = new Blob([text], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${selected.title.replace(/\s+/g, "-")}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar .txt
              </Button>
              <Button onClick={exportPDF} variant="outline" className="gap-2">
                <Save className="h-4 w-4" />
                Exportar PDF
              </Button>
            </div>

            {/* Vista previa de la plantilla */}
            <div className="mt-6 pt-6 border-t border-accent-1/20">
              <h4 className="text-sm font-semibold text-white mb-4">Vista previa</h4>
              <div className="glass-panel rounded-xl border border-accent-1/20 p-6 bg-white/5">
                <div className="space-y-4">
                  {selected.clientLogo && (
                    <div className="flex justify-center">
                      <img
                        src={selected.clientLogo}
                        alt="Logo cliente"
                        className="h-16 object-contain"
                      />
                    </div>
                  )}
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-white mb-2">{selected.title}</h3>
                    {selected.clientName && (
                      <p className="text-sm text-neutral-400">Cliente: {selected.clientName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-neutral-300">
                      <strong>Alcance:</strong> {selected.scope}
                    </p>
                    <div>
                      <p className="text-sm font-semibold text-neutral-300 mb-1">Entregables:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-neutral-400">
                        {selected.deliverables.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-neutral-300">
                        <strong>Timeline:</strong> {selected.timeline}
                      </span>
                      <span className="text-accent-1">
                        <strong>Precio:</strong> {selected.price}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-neutral-400 py-12">
            <p className="mb-2">Selecciona o crea una plantilla para comenzar</p>
            <Button onClick={addNew} className="mt-4">
              Crear nueva cotización
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
