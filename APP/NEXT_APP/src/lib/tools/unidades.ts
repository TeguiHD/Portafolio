/**
 * Magnitudes y unidades del conversor. Los factores son exactos por definición salvo los que la nota marca como aproximados.
 * Cada unidad lineal guarda cuánto vale en la unidad base de su magnitud; temperatura y consumo usan fórmulas.
 */
import { numeroCL } from "./numeros";

export type MagnitudId =
    | "longitud" | "masa" | "temperatura" | "area" | "volumen" | "velocidad"
    | "tiempo" | "datos" | "presion" | "energia" | "potencia" | "consumo";

export interface Unidad {
    id: string;
    nombre: string;
    simbolo: string;
    /** Valor de 1 unidad en la unidad base. En temperatura y consumo manda aBase/deBase. */
    factor: number;
    aBase?: (v: number) => number;
    deBase?: (v: number) => number;
    /** Fórmula respecto de la base, para las unidades no lineales. */
    formula?: string;
    /** De dónde sale la equivalencia. */
    nota?: string;
}

export interface Magnitud {
    id: MagnitudId;
    nombre: string;
    corto: string;
    emoji: string;
    color: string;
    unidades: Unidad[];
    porDefecto: [string, string];
    nota?: string;
}

const LUZ_M_S = 299_792_458;
const UA_M = 149_597_870_700;
const ANIO_LUZ_M = LUZ_M_S * 365.25 * 86_400; // 9.460.730.472.580.800 m
const PARSEC_M = (648_000 / Math.PI) * UA_M;
const LIBRA_KG = 0.45359237;
const LBF_N = LIBRA_KG * 9.80665;
const BTU_J = 1055.05585262;
const GALON_US_L = 3.785411784;
const GALON_UK_L = 4.54609;
const MILLA_KM = 1.609344;

export const MAGNITUDES: Magnitud[] = [
    {
        id: "longitud", nombre: "Longitud", corto: "Long.", emoji: "📏", color: "#FF8A00", porDefecto: ["km", "mi"],
        unidades: [
            { id: "m", nombre: "Metros", simbolo: "m", factor: 1, nota: "El metro es la distancia que recorre la luz en el vacío en 1/299.792.458 de segundo." },
            { id: "km", nombre: "Kilómetros", simbolo: "km", factor: 1000 },
            { id: "cm", nombre: "Centímetros", simbolo: "cm", factor: 0.01 },
            { id: "mm", nombre: "Milímetros", simbolo: "mm", factor: 0.001 },
            { id: "um", nombre: "Micrómetros", simbolo: "µm", factor: 1e-6 },
            { id: "in", nombre: "Pulgadas", simbolo: "in", factor: 0.0254, nota: "La pulgada mide 2,54 cm exactos desde el acuerdo internacional de 1959." },
            { id: "ft", nombre: "Pies", simbolo: "ft", factor: 0.3048, nota: "Un pie son 12 pulgadas: 30,48 cm exactos." },
            { id: "yd", nombre: "Yardas", simbolo: "yd", factor: 0.9144, nota: "Una yarda son 3 pies: 0,9144 m exactos." },
            { id: "mi", nombre: "Millas", simbolo: "mi", factor: 1609.344, nota: "La milla terrestre son 1.760 yardas: 1.609,344 m exactos." },
            { id: "nmi", nombre: "Millas náuticas", simbolo: "nmi", factor: 1852, nota: "La milla náutica mide 1.852 m exactos. Equivale a cerca de un minuto de arco de latitud, por eso se usa para navegar." },
            { id: "ua", nombre: "Unidades astronómicas", simbolo: "ua", factor: UA_M, nota: "La unidad astronómica mide 149.597.870.700 m exactos (UAI, 2012): cerca de la distancia media entre la Tierra y el Sol." },
            { id: "al", nombre: "Años luz", simbolo: "al", factor: ANIO_LUZ_M, nota: "Un año luz es lo que recorre la luz en un año juliano (365,25 días) a 299.792.458 m/s: 9.460.730.472.580.800 m. Mide distancia, no tiempo." },
            { id: "pc", nombre: "Pársecs", simbolo: "pc", factor: PARSEC_M, nota: "Un pársec es la distancia desde la que 1 ua se ve bajo un segundo de arco: 648.000/π ua, unos 3,26 años luz." },
        ],
    },
    {
        id: "masa", nombre: "Masa", corto: "Masa", emoji: "⚖️", color: "#00B8A9", porDefecto: ["kg", "lb"],
        unidades: [
            { id: "kg", nombre: "Kilogramos", simbolo: "kg", factor: 1, nota: "Desde 2019 el kilogramo se define a partir de la constante de Planck." },
            { id: "g", nombre: "Gramos", simbolo: "g", factor: 0.001 },
            { id: "mg", nombre: "Miligramos", simbolo: "mg", factor: 1e-6 },
            { id: "t", nombre: "Toneladas", simbolo: "t", factor: 1000, nota: "Tonelada métrica: 1.000 kg." },
            { id: "ct", nombre: "Quilates", simbolo: "ct", factor: 0.0002, nota: "El quilate de las gemas pesa 200 mg exactos. No es el «quilate» que mide la pureza del oro." },
            { id: "oz", nombre: "Onzas", simbolo: "oz", factor: LIBRA_KG / 16, nota: "La onza común (avoirdupois) es 1/16 de libra: 28,349523125 g exactos." },
            { id: "lb", nombre: "Libras", simbolo: "lb", factor: LIBRA_KG, nota: "La libra mide 0,45359237 kg exactos desde el acuerdo de 1959." },
        ],
    },
    {
        id: "temperatura", nombre: "Temperatura", corto: "Temp.", emoji: "🌡️", color: "#EF4444", porDefecto: ["c", "f"],
        nota: "La temperatura no se convierte multiplicando: las escalas tienen ceros distintos.",
        unidades: [
            { id: "c", nombre: "Celsius", simbolo: "°C", factor: 1, aBase: (v) => v, deBase: (c) => c, nota: "0 °C y 100 °C: el agua se congela y hierve a nivel del mar." },
            { id: "f", nombre: "Fahrenheit", simbolo: "°F", factor: 1, aBase: (v) => (v - 32) * 5 / 9, deBase: (c) => c * 9 / 5 + 32, formula: "°F = °C × 9/5 + 32", nota: "En Fahrenheit el agua se congela a 32 °F y hierve a 212 °F." },
            { id: "k", nombre: "Kelvin", simbolo: "K", factor: 1, aBase: (v) => v - 273.15, deBase: (c) => c + 273.15, formula: "K = °C + 273,15", nota: "El kelvin parte del cero absoluto (0 K = −273,15 °C) y no lleva «grado»." },
        ],
    },
    {
        id: "area", nombre: "Área", corto: "Área", emoji: "📐", color: "#10B981", porDefecto: ["ha", "m2"],
        unidades: [
            { id: "m2", nombre: "Metros cuadrados", simbolo: "m²", factor: 1 },
            { id: "km2", nombre: "Kilómetros cuadrados", simbolo: "km²", factor: 1e6 },
            { id: "cm2", nombre: "Centímetros cuadrados", simbolo: "cm²", factor: 1e-4 },
            { id: "ha", nombre: "Hectáreas", simbolo: "ha", factor: 1e4, nota: "Una hectárea son 10.000 m²: un cuadrado de 100 m de lado." },
            { id: "ft2", nombre: "Pies cuadrados", simbolo: "ft²", factor: 0.09290304, nota: "Un pie cuadrado son 0,3048² m² = 0,09290304 m² exactos." },
            { id: "acre", nombre: "Acres", simbolo: "ac", factor: 4046.8564224, nota: "Un acre son 43.560 pies cuadrados: 4.046,8564224 m² exactos." },
            { id: "mi2", nombre: "Millas cuadradas", simbolo: "mi²", factor: 1609.344 ** 2 },
        ],
    },
    {
        id: "volumen", nombre: "Volumen", corto: "Vol.", emoji: "🧪", color: "#0EA5E9", porDefecto: ["taza_us", "ml"],
        nota: "Para pasar tazas o cucharadas de un ingrediente a gramos hace falta su densidad: eso no lo resuelve un conversor de volumen.",
        unidades: [
            { id: "ml", nombre: "Mililitros", simbolo: "mL", factor: 0.001, nota: "1 mL = 1 cm³." },
            { id: "l", nombre: "Litros", simbolo: "L", factor: 1 },
            { id: "m3", nombre: "Metros cúbicos", simbolo: "m³", factor: 1000, nota: "1 m³ = 1.000 L." },
            { id: "cdta", nombre: "Cucharaditas (métricas)", simbolo: "cdta", factor: 0.005, nota: "La cucharadita métrica es de 5 mL; la de EE. UU., de 4,93 mL." },
            { id: "cda", nombre: "Cucharadas (métricas)", simbolo: "cda", factor: 0.015, nota: "La cucharada métrica es de 15 mL; la de EE. UU., de 14,79 mL." },
            { id: "taza", nombre: "Tazas métricas", simbolo: "taza", factor: 0.25, nota: "La taza métrica es de 250 mL." },
            { id: "taza_us", nombre: "Tazas de EE. UU.", simbolo: "taza EE. UU.", factor: GALON_US_L / 16, nota: "La taza de las recetas de EE. UU. es 1/16 de galón: 236,5882365 mL." },
            { id: "floz", nombre: "Onzas líquidas de EE. UU.", simbolo: "fl oz", factor: GALON_US_L / 128, nota: "La onza líquida de EE. UU. es 1/128 de galón: 29,5735295625 mL." },
            { id: "pinta", nombre: "Pintas de EE. UU.", simbolo: "pt", factor: GALON_US_L / 8 },
            { id: "gal", nombre: "Galones de EE. UU.", simbolo: "gal", factor: GALON_US_L, nota: "El galón de EE. UU. mide 3,785411784 L exactos." },
            { id: "gal_uk", nombre: "Galones imperiales", simbolo: "gal imp.", factor: GALON_UK_L, nota: "El galón imperial (Reino Unido) mide 4,54609 L exactos." },
            { id: "ft3", nombre: "Pies cúbicos", simbolo: "ft³", factor: 28.316846592 },
        ],
    },
    {
        id: "velocidad", nombre: "Velocidad", corto: "Veloc.", emoji: "⚡", color: "#F59E0B", porDefecto: ["kmh", "ms"],
        unidades: [
            { id: "ms", nombre: "Metros por segundo", simbolo: "m/s", factor: 1 },
            { id: "kmh", nombre: "Kilómetros por hora", simbolo: "km/h", factor: 1000 / 3600, nota: "De km/h a m/s se divide por 3,6 (1.000 m en 3.600 s)." },
            { id: "mph", nombre: "Millas por hora", simbolo: "mph", factor: 0.44704 },
            { id: "kn", nombre: "Nudos", simbolo: "kn", factor: 1852 / 3600, nota: "Un nudo es una milla náutica por hora: 1.852 m por hora." },
            { id: "fts", nombre: "Pies por segundo", simbolo: "ft/s", factor: 0.3048 },
            { id: "c", nombre: "Velocidad de la luz", simbolo: "c", factor: LUZ_M_S, nota: "La luz en el vacío va a 299.792.458 m/s exactos: el metro se define a partir de ella." },
        ],
    },
    {
        id: "tiempo", nombre: "Tiempo", corto: "Tiempo", emoji: "⏱️", color: "#8B5CF6", porDefecto: ["h", "min"],
        unidades: [
            { id: "ms", nombre: "Milisegundos", simbolo: "ms", factor: 0.001 },
            { id: "s", nombre: "Segundos", simbolo: "s", factor: 1 },
            { id: "min", nombre: "Minutos", simbolo: "min", factor: 60 },
            { id: "h", nombre: "Horas", simbolo: "h", factor: 3600 },
            { id: "d", nombre: "Días", simbolo: "d", factor: 86_400 },
            { id: "sem", nombre: "Semanas", simbolo: "sem", factor: 604_800 },
            { id: "mes", nombre: "Meses (promedio)", simbolo: "mes", factor: 2_629_746, nota: "Mes promedio: 1/12 del año gregoriano, 30,436875 días. Los meses reales duran de 28 a 31 días." },
            { id: "anio", nombre: "Años de 365 días", simbolo: "año", factor: 31_536_000, nota: "Aquí un año son 365 días; el año gregoriano promedio dura 365,2425 días." },
        ],
    },
    {
        id: "datos", nombre: "Datos", corto: "Datos", emoji: "💾", color: "#6366F1", porDefecto: ["gb", "gib"],
        nota: "kB, MB y GB usan potencias de 1.000 (así cuentan los discos y las conexiones). KiB, MiB y GiB usan potencias de 1.024; Windows las muestra con los nombres «KB», «MB» y «GB».",
        unidades: [
            { id: "bit", nombre: "Bits", simbolo: "bit", factor: 1 / 8, nota: "8 bits = 1 byte. Las velocidades de internet se miden en bits por segundo." },
            { id: "b", nombre: "Bytes", simbolo: "B", factor: 1 },
            { id: "kb", nombre: "Kilobytes", simbolo: "kB", factor: 1e3 },
            { id: "mb", nombre: "Megabytes", simbolo: "MB", factor: 1e6 },
            { id: "gb", nombre: "Gigabytes", simbolo: "GB", factor: 1e9 },
            { id: "tb", nombre: "Terabytes", simbolo: "TB", factor: 1e12 },
            { id: "pb", nombre: "Petabytes", simbolo: "PB", factor: 1e15 },
            { id: "kib", nombre: "Kibibytes", simbolo: "KiB", factor: 1024 },
            { id: "mib", nombre: "Mebibytes", simbolo: "MiB", factor: 1024 ** 2 },
            { id: "gib", nombre: "Gibibytes", simbolo: "GiB", factor: 1024 ** 3 },
            { id: "tib", nombre: "Tebibytes", simbolo: "TiB", factor: 1024 ** 4 },
            { id: "pib", nombre: "Pebibytes", simbolo: "PiB", factor: 1024 ** 5 },
        ],
    },
    {
        id: "presion", nombre: "Presión", corto: "Presión", emoji: "🎈", color: "#EC4899", porDefecto: ["psi", "bar"],
        unidades: [
            { id: "pa", nombre: "Pascales", simbolo: "Pa", factor: 1 },
            { id: "hpa", nombre: "Hectopascales (milibares)", simbolo: "hPa", factor: 100, nota: "1 hPa = 1 mbar: la unidad de los partes meteorológicos." },
            { id: "kpa", nombre: "Kilopascales", simbolo: "kPa", factor: 1000 },
            { id: "mpa", nombre: "Megapascales", simbolo: "MPa", factor: 1e6 },
            { id: "bar", nombre: "Bares", simbolo: "bar", factor: 1e5 },
            { id: "atm", nombre: "Atmósferas", simbolo: "atm", factor: 101_325, nota: "La atmósfera estándar mide 101.325 Pa exactos." },
            { id: "psi", nombre: "Libras por pulgada cuadrada", simbolo: "psi", factor: LBF_N / 0.0254 ** 2, nota: "psi es libra-fuerza por pulgada cuadrada: 6.894,757 Pa. Es la unidad habitual de los neumáticos." },
            { id: "mmhg", nombre: "Milímetros de mercurio", simbolo: "mmHg", factor: 133.322387415, nota: "1 mmHg ≈ 133,322 Pa. Es la unidad de los medidores de presión arterial." },
            { id: "kgfcm2", nombre: "Kilogramos-fuerza por cm²", simbolo: "kgf/cm²", factor: 98_066.5 },
        ],
    },
    {
        id: "energia", nombre: "Energía", corto: "Energía", emoji: "🔋", color: "#EAB308", porDefecto: ["kcal", "kj"],
        unidades: [
            { id: "j", nombre: "Joules", simbolo: "J", factor: 1 },
            { id: "kj", nombre: "Kilojoules", simbolo: "kJ", factor: 1000 },
            { id: "cal", nombre: "Calorías", simbolo: "cal", factor: 4.184, nota: "Caloría termoquímica: 4,184 J exactos." },
            { id: "kcal", nombre: "Kilocalorías", simbolo: "kcal", factor: 4184, nota: "La «caloría» de las etiquetas de alimentos es en realidad una kilocaloría." },
            { id: "wh", nombre: "Watts hora", simbolo: "Wh", factor: 3600 },
            { id: "kwh", nombre: "Kilowatts hora", simbolo: "kWh", factor: 3.6e6, nota: "1 kWh son 3,6 millones de joules: la unidad de la boleta de la luz." },
            { id: "btu", nombre: "BTU", simbolo: "BTU", factor: BTU_J, nota: "BTU de la tabla internacional: 1.055,05585262 J." },
            { id: "ev", nombre: "Electronvoltios", simbolo: "eV", factor: 1.602176634e-19, nota: "Energía que gana un electrón al cruzar 1 voltio: 1,602176634 × 10⁻¹⁹ J exactos." },
        ],
    },
    {
        id: "potencia", nombre: "Potencia", corto: "Potencia", emoji: "⚙️", color: "#F97316", porDefecto: ["hp", "kw"],
        unidades: [
            { id: "w", nombre: "Watts", simbolo: "W", factor: 1 },
            { id: "kw", nombre: "Kilowatts", simbolo: "kW", factor: 1000 },
            { id: "mw", nombre: "Megawatts", simbolo: "MW", factor: 1e6 },
            { id: "hp", nombre: "Caballos de fuerza", simbolo: "HP", factor: 550 * 0.3048 * LBF_N, nota: "El HP mecánico son 550 pies·libra-fuerza por segundo: 745,7 W." },
            { id: "cv", nombre: "Caballos de vapor", simbolo: "CV", factor: 735.49875, nota: "El CV métrico son 75 kgf·m/s: 735,49875 W exactos, algo menos que un HP." },
            { id: "btuh", nombre: "BTU por hora", simbolo: "BTU/h", factor: BTU_J / 3600, nota: "Es la unidad con que se venden los aires acondicionados." },
        ],
    },
    {
        id: "consumo", nombre: "Consumo de combustible", corto: "Consumo", emoji: "⛽", color: "#14B8A6", porDefecto: ["kml", "l100"],
        nota: "km/L y L/100 km van al revés: más km/L es mejor; menos L/100 km también.",
        unidades: [
            { id: "kml", nombre: "Kilómetros por litro", simbolo: "km/L", factor: 1, aBase: (v) => v, deBase: (b) => b },
            { id: "l100", nombre: "Litros cada 100 km", simbolo: "L/100 km", factor: 1, aBase: (v) => 100 / v, deBase: (b) => 100 / b, formula: "L/100 km = 100 ÷ km/L" },
            { id: "mpg", nombre: "Millas por galón (EE. UU.)", simbolo: "mpg", factor: 1, aBase: (v) => v * MILLA_KM / GALON_US_L, deBase: (b) => b * GALON_US_L / MILLA_KM, formula: "1 mpg (EE. UU.) = 0,425144 km/L" },
            { id: "mpg_uk", nombre: "Millas por galón imperial", simbolo: "mpg imp.", factor: 1, aBase: (v) => v * MILLA_KM / GALON_UK_L, deBase: (b) => b * GALON_UK_L / MILLA_KM, formula: "1 mpg imperial = 0,354006 km/L" },
        ],
    },
];

export const MAGNITUD_POR_ID = new Map(MAGNITUDES.map((m) => [m.id, m]));

export function unidadDe(m: Magnitud, id: string): Unidad | undefined {
    return m.unidades.find((u) => u.id === id);
}

export function esLineal(u: Unidad): boolean {
    return !u.aBase;
}

/** Convierte; null si el resultado no es un número finito (por ejemplo, 0 km/L en L/100 km). */
export function convertir(m: Magnitud, valor: number, deId: string, aId: string): number | null {
    const de = unidadDe(m, deId);
    const a = unidadDe(m, aId);
    if (!de || !a || !Number.isFinite(valor)) return null;
    const r = esLineal(de) && esLineal(a)
        ? valor * (de.factor / a.factor)
        : (a.deBase ?? ((b: number) => b / a.factor))((de.aBase ?? ((v: number) => v * de.factor))(valor));
    return Number.isFinite(r) ? r : null;
}

/** true si la temperatura queda bajo el cero absoluto. */
export function bajoCeroAbsoluto(m: Magnitud, valor: number, deId: string): boolean {
    if (m.id !== "temperatura") return false;
    const de = unidadDe(m, deId);
    return !!de?.aBase && de.aBase(valor) < -273.15 - 1e-9;
}

/** Acepta «1.234,5», «1234.5», «-40» (también con el signo menos tipográfico) y notación científica («1,5e6»). */
export function leerNumero(texto: string): number | null {
    const t = texto.trim().replace(/\u2212/g, "-");
    if (!t) return null;
    if (/^[+-]?\d+(?:[.,]\d+)?e[+-]?\d+$/i.test(t)) {
        const n = Number(t.replace(",", "."));
        return Number.isFinite(n) ? n : null;
    }
    if (!/^[+-]?[\d.,\s]+$/.test(t)) return null;
    return numeroCL(t.replace(/^\+/, ""));
}

const SUPERINDICE: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
// 12 cifras: suficientes para ver «1.609,344» completo y pocas para ocultar el ruido de coma flotante (3,6 km/h = 1,0000000000000002 m/s).
const cl12 = new Intl.NumberFormat("es-CL", { maximumSignificantDigits: 12 });
const cl6 = new Intl.NumberFormat("es-CL", { maximumSignificantDigits: 6 });

/** Número a la chilena (1.609,344). Muy grandes o muy chicos, como «9,46073 × 10¹⁵». Hasta 12 cifras significativas. */
export function formatoCL(n: number): string {
    if (!Number.isFinite(n)) return "—";
    if (n === 0) return "0";
    const abs = Math.abs(n);
    if (abs >= 1e15 || abs < 1e-6) {
        let exp = Math.floor(Math.log10(abs));
        let mantisa = Number((n / 10 ** exp).toPrecision(6));
        if (Math.abs(mantisa) >= 10) { mantisa /= 10; exp += 1; }
        return `${cl6.format(mantisa)} × 10${String(exp).replace(/[-0-9]/g, (c) => SUPERINDICE[c])}`;
    }
    return cl12.format(n);
}
