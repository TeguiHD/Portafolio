"use client";

import { CAMPO } from "./estilos";

interface SelectOption {
    value: string;
    label: string;
    preview?: string; // Fuente con la que se muestra la opción elegida
}

interface CustomSelectProps {
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    /** Id para asociarlo a su <label>. */
    id?: string;
}

/**
 * Selector del panel de diseño. Antes era un desplegable hecho a mano (con hoja inferior en celular); ahora es el
 * <select> nativo: el sistema pone el teclado, el lector de pantalla y la hoja de opciones del celular.
 */
export function CustomSelect({ value, options, onChange, label, placeholder = "Seleccionar…", id }: CustomSelectProps) {
    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <select
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={id ? undefined : label}
            className={CAMPO}
            style={selectedOption?.preview ? { fontFamily: selectedOption.preview } : undefined}
        >
            {!selectedOption && (
                <option value={value} disabled>
                    {placeholder}
                </option>
            )}
            {options.map((opt) => (
                <option key={opt.value} value={opt.value} style={opt.preview ? { fontFamily: opt.preview } : undefined}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
}
