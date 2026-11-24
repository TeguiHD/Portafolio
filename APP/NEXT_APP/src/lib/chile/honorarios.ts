/**
 * Boleta de honorarios: el cliente retiene un porcentaje del bruto y lo paga al SII; tú recibes el resto (líquido).
 * Se calcula al peso (el SII no publica su regla de redondeo: investigación del 22-11-2026): retención = bruto × tasa redondeado.
 */
export interface Boleta {
    bruto: number;
    retencion: number;
    liquido: number;
}

const alPeso = (n: number) => Math.round(Number(n.toPrecision(15)));

export function liquidoDesdeBruto(bruto: number, tasa: number): Boleta {
    const b = alPeso(bruto), retencion = alPeso(b * tasa);
    return { bruto: b, retencion, liquido: b - retencion };
}

/** El bruto que hay que poner en la boleta para recibir `liquido`, cuadrando al peso (se ajusta el redondeo). */
export function brutoDesdeLiquido(liquido: number, tasa: number): Boleta {
    const meta = alPeso(liquido);
    let bruto = alPeso(meta / (1 - tasa));
    for (let i = 0; i < 4; i++) {
        const r = liquidoDesdeBruto(bruto, tasa);
        if (r.liquido === meta) return r;
        bruto += r.liquido < meta ? 1 : -1;
    }
    return liquidoDesdeBruto(bruto, tasa);
}
