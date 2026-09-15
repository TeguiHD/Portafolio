/** Cartas del mazo de sistemas privados (#vault). El dorso describe qué hace cada sistema. */
export const cartasMazo = [
  {
    id: "finance",
    titulo: "Control Financiero",
    subtitulo: "Ingresos, gastos y planificación",
    color: "#5eead4",
    dorso: "Movimientos por categoría, presupuestos con alertas de desvío y planificación mensual desde un panel propio.",
  },
  {
    id: "cv",
    titulo: "Optimizador CV",
    subtitulo: "Revisión y estructura del documento",
    color: "#a78bfa",
    dorso: "Analiza la estructura del currículo, señala qué falta y propone un orden más claro para cada puesto.",
  },
  {
    id: "audit",
    titulo: "Auditoría de Seguridad",
    subtitulo: "Roles, sesiones y registro de actividad",
    color: "#f59e0b",
    dorso: "Registro de actividad por rol y sesión, con eventos revisables y alertas cuando algo se sale de lo esperado.",
  },
] as const;

export type CartaMazoId = (typeof cartasMazo)[number]["id"];
