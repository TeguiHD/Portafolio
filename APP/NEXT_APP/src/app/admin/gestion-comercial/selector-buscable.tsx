"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { campo, etiqueta } from "./estilos";

export interface OpcionBuscable {
    id: string;
    label: string;
    sublabel?: string;
}

/**
 * Lista desplegable con buscador (cliente, contrato…). Antes había tres copias casi iguales en Oportunidades, Contratos
 * y Gastos. El nombre accesible del botón es la etiqueta más lo elegido («Cliente * Seleccionar cliente...»).
 * Escape cierra solo la lista (no el diálogo que la contiene) y devuelve el foco al botón.
 */
export default function SelectorBuscable({
    label,
    value,
    onChange,
    options,
    placeholder = "Seleccionar...",
    emptyText = "Sin resultados",
    disabled = false,
    searchPlaceholder = "Buscar...",
}: {
    label: string;
    value: string;
    onChange: (id: string) => void;
    options: OpcionBuscable[];
    placeholder?: string;
    emptyText?: string;
    disabled?: boolean;
    searchPlaceholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef<HTMLDivElement>(null);
    const boton = useRef<HTMLButtonElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const id = useId();

    const selected = options.find(o => o.id === value);
    const q = search.trim().toLowerCase();
    const filtered = q
        ? options.filter(o => o.label.toLowerCase().includes(q) || (o.sublabel && o.sublabel.toLowerCase().includes(q)))
        : options;

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    useEffect(() => {
        if (open && inputRef.current) inputRef.current.focus();
    }, [open]);

    const elegir = (nuevo: string) => {
        onChange(nuevo);
        setOpen(false);
        setSearch("");
        boton.current?.focus();
    };

    const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== "Escape" || !open) return;
        // Sin esto, Escape también cerraría el <dialog> del formulario.
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        setSearch("");
        boton.current?.focus();
    };

    const opcion = (elegida: boolean, apagada = false) =>
        `flex w-full min-h-11 sm:min-h-10 items-center justify-between gap-2 px-3 text-left text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--acento)] ${apagada ? "text-[var(--mut)]" : "text-[var(--txt)]"} ${elegida
            ? "bg-[color-mix(in_srgb,var(--acento)_13%,transparent)]"
            : "hover:bg-[color-mix(in_srgb,var(--txt)_5%,transparent)]"}`;

    return (
        <div ref={ref} className="relative" onKeyDown={alTeclear}>
            <p id={`${id}-l`} className={etiqueta}>{label}</p>
            <button
                ref={boton}
                type="button"
                onClick={() => !disabled && setOpen(!open)}
                aria-labelledby={`${id}-l ${id}-v`}
                aria-expanded={open}
                aria-controls={open ? `${id}-p` : undefined}
                disabled={disabled}
                className={`${campo} flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50`}
            >
                <span id={`${id}-v`} className={`min-w-0 truncate ${selected ? "" : "text-[var(--mut)]"}`}>
                    {selected ? (selected.sublabel ? `${selected.label}, ${selected.sublabel}` : selected.label) : placeholder}
                </span>
                <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-[var(--mut)] motion-safe:transition-transform motion-safe:duration-150 ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div id={`${id}-p`} className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-lg border border-[var(--linea-2)] bg-[var(--sup)] shadow-lg">
                    <div className="border-b border-[var(--linea)] p-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            aria-label={searchPlaceholder}
                            placeholder={searchPlaceholder}
                            autoComplete="off"
                            className={campo}
                        />
                    </div>
                    <div className="max-h-56 overflow-y-auto overscroll-contain">
                        <button type="button" onClick={() => elegir("")} aria-current={!value ? "true" : undefined} className={opcion(!value, true)}>
                            {placeholder}
                        </button>
                        {filtered.map(o => (
                            <button key={o.id} type="button" onClick={() => elegir(o.id)} aria-current={value === o.id ? "true" : undefined} className={opcion(value === o.id)}>
                                <span className="min-w-0 truncate">
                                    {o.label}
                                    {o.sublabel && <span className="ml-1.5 text-xs text-[var(--mut)]">({o.sublabel})</span>}
                                </span>
                                {value === o.id && <Check size={16} aria-hidden="true" className="shrink-0 text-[var(--acento)]" />}
                            </button>
                        ))}
                        {filtered.length === 0 && (
                            <p className="px-3 py-3 text-center text-sm text-[var(--mut)]">{emptyText}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
