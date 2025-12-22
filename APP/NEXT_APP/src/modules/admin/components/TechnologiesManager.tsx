"use client";

import { useState, useMemo } from "react";
import { technologies, type Technology } from "@/modules/admin/data/technologies";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2, Star, StarOff } from "lucide-react";
import { v4 as uuid } from "uuid";

export function TechnologiesManager() {
  const [techs, setTechs] = useState<Technology[]>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("technologies") : null;
    return saved ? JSON.parse(saved) : technologies;
  });
  const [filter, setFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = ["Frontend", "Backend", "Database", "DevOps", "Automation", "BI", "Animation", "ORM"];

  const saveTechs = (newTechs: Technology[]) => {
    setTechs(newTechs);
    if (typeof window !== "undefined") {
      localStorage.setItem("technologies", JSON.stringify(newTechs));
    }
  };

  const filtered = useMemo(() => {
    let result = techs.filter(
      (t) =>
        t.name.toLowerCase().includes(filter.toLowerCase()) &&
        (selectedCategory === "all" || t.category === selectedCategory)
    );
    return result.sort((a, b) => (a.order || 999) - (b.order || 999));
  }, [techs, filter, selectedCategory]);

  const addTech = () => {
    const newTech: Technology = {
      id: uuid(),
      name: "Nueva tecnología",
      category: "Frontend",
      featured: false,
      order: techs.length + 1,
    };
    saveTechs([...techs, newTech]);
  };

  const updateTech = (id: string, patch: Partial<Technology>) => {
    const newTechs = techs.map((t) => (t.id === id ? { ...t, ...patch } : t));
    saveTechs(newTechs);
  };

  const deleteTech = (id: string) => {
    if (!confirm("¿Eliminar esta tecnología?")) return;
    saveTechs(techs.filter((t) => t.id !== id));
  };

  const toggleFeatured = (id: string) => {
    const tech = techs.find((t) => t.id === id);
    if (!tech) return;
    updateTech(id, { featured: !tech.featured });
  };

  const moveOrder = (id: string, direction: "up" | "down") => {
    const index = techs.findIndex((t) => t.id === id);
    if (index === -1) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= techs.length) return;

    const newTechs = [...techs];
    [newTechs[index], newTechs[newIndex]] = [newTechs[newIndex], newTechs[index]];
    newTechs[index].order = index + 1;
    newTechs[newIndex].order = newIndex + 1;
    saveTechs(newTechs);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Gestión de Tecnologías</h3>
          <p className="text-sm text-neutral-400">
            Administra las tecnologías que se muestran en el portafolio. Organízalas por categoría y marca las destacadas.
          </p>
        </div>
        <Button onClick={addTech} className="gap-2">
          <Plus className="h-4 w-4" />
          Agregar tecnología
        </Button>
      </div>

      {/* Filtros */}
      <div className="glass-panel rounded-xl border border-accent-1/20 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-neutral-300 mb-2 block">Buscar</label>
            <input
              placeholder="Filtrar por nombre..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full rounded-lg border border-accent-1/20 bg-white/5 px-3 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:border-accent-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-300 mb-2 block">Categoría</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-lg border border-accent-1/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-1"
            >
              <option value="all">Todas</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de tecnologías */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((tech) => (
          <div
            key={tech.id}
            className={`glass-panel rounded-xl border p-4 ${
              tech.featured
                ? "border-accent-2/40 bg-accent-2/10"
                : "border-accent-1/20 bg-white/5"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <input
                  value={tech.name}
                  onChange={(e) => updateTech(tech.id, { name: e.target.value })}
                  className="w-full rounded-lg border border-accent-1/20 bg-white/5 px-2 py-1 text-sm font-semibold text-white outline-none focus:border-accent-1 mb-2"
                />
                <select
                  value={tech.category}
                  onChange={(e) => updateTech(tech.id, { category: e.target.value as Technology["category"] })}
                  className="w-full rounded-lg border border-accent-1/20 bg-white/5 px-2 py-1 text-xs text-neutral-300 outline-none focus:border-accent-1"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => toggleFeatured(tech.id)}
                className={`ml-2 p-1.5 rounded-lg transition ${
                  tech.featured
                    ? "bg-accent-2/20 text-accent-2"
                    : "bg-white/5 text-neutral-400 hover:text-accent-2"
                }`}
                title={tech.featured ? "Quitar destacado" : "Marcar como destacado"}
              >
                {tech.featured ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => moveOrder(tech.id, "up")}
                className="flex-1 text-xs"
                disabled={techs.findIndex((t) => t.id === tech.id) === 0}
              >
                ↑
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => moveOrder(tech.id, "down")}
                className="flex-1 text-xs"
                disabled={techs.findIndex((t) => t.id === tech.id) === techs.length - 1}
              >
                ↓
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => deleteTech(tech.id)}
                className="text-red-400 border-red-400/30 hover:bg-red-400/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-neutral-400 py-12">
          <p>No se encontraron tecnologías con los filtros aplicados</p>
        </div>
      )}
    </div>
  );
}


