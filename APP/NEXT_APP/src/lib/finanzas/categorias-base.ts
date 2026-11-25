/**
 * Las categorías con que parte cualquiera en Finanzas (8 de gasto y 4 de ingreso). Las crea el servidor al guardar la
 * primera cuenta de una persona que no ve ninguna categoría: ni propia ni de sistema (las globales, userId null, que
 * todos ven; producción tiene 23 y crear estas encima repetía Alimentación, Transporte, Salario…). Antes las creaba el asistente de bienvenida al
 * terminar, y después el clic en «Crea tu primera cuenta»: con clic medio, o llegando por el menú, quedaban sin crear.
 */
export const CATEGORIAS_BASE = [
    { name: "Alimentación", icon: "🍔", color: "#F59E0B", type: "EXPENSE" },
    { name: "Transporte", icon: "🚌", color: "#3B82F6", type: "EXPENSE" },
    { name: "Entretenimiento", icon: "🎬", color: "#8B5CF6", type: "EXPENSE" },
    { name: "Salud", icon: "💊", color: "#EF4444", type: "EXPENSE" },
    { name: "Educación", icon: "📚", color: "#10B981", type: "EXPENSE" },
    { name: "Hogar", icon: "🏠", color: "#6366F1", type: "EXPENSE" },
    { name: "Servicios", icon: "⚡", color: "#F97316", type: "EXPENSE" },
    { name: "Otros", icon: "📦", color: "#6B7280", type: "EXPENSE" },
    { name: "Salario", icon: "💰", color: "#10B981", type: "INCOME" },
    { name: "Freelance", icon: "💻", color: "#3B82F6", type: "INCOME" },
    { name: "Inversiones", icon: "📈", color: "#8B5CF6", type: "INCOME" },
    { name: "Otros ingresos", icon: "✨", color: "#6B7280", type: "INCOME" },
] as const;

type Fila = (typeof CATEGORIAS_BASE)[number] & { userId: string };
/** Lo que se usa de Prisma (así se prueba sin base). */
export interface BdCategorias {
    financeCategory: {
        count(args: { where: { OR: ({ userId: string } | { userId: null })[] } }): Promise<number>;
        createMany(args: { data: Fila[] }): Promise<unknown>;
    };
}

/** Crea las categorías de siempre si la persona no ve ninguna (propia ni de sistema). Devuelve cuántas creó. */
export async function crearCategoriasBase(db: BdCategorias, userId: string): Promise<number> {
    if ((await db.financeCategory.count({ where: { OR: [{ userId }, { userId: null }] } })) > 0) return 0;
    const data = CATEGORIAS_BASE.map((c) => ({ ...c, userId }));
    await db.financeCategory.createMany({ data });
    return data.length;
}
