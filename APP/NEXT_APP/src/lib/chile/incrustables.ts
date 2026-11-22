/** Herramientas que se pueden insertar en otros sitios (/insertar/<slug>) y el alto sugerido del iframe, en px. */
export const INCRUSTABLES: Record<string, { nombre: string; alto: number }> = {
    impuestos: { nombre: "Calculadora de IVA", alto: 620 },
    rut: { nombre: "Validador de RUT", alto: 640 },
    "uf-utm": { nombre: "Conversor UF, UTM y dólar", alto: 600 },
    "sueldo-liquido": { nombre: "Calculadora de sueldo líquido", alto: 900 },
    "boleta-honorarios": { nombre: "Calculadora de boleta de honorarios", alto: 560 },
};
