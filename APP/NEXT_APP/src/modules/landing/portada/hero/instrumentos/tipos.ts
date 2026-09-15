/** Una demostración que se reproduce sola y se detiene al salir de escena. */
export interface Demo {
  start(): void;
  stop(): void;
}

/** Cada instrumento registra su demostración al montar y `null` al desmontar. */
export type Registrar = (demo: Demo | null) => void;

export interface InstrumentoProps {
  registrar: Registrar;
}

/** Descarga un lienzo como PNG con el nombre indicado. */
export function descargarLienzo(canvas: HTMLCanvasElement, nombre: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}

/** Pinta la escena de muestra (degradado, círculo y "Aa") que usan paleta y recorte. */
export function pintarMuestra(g: CanvasRenderingContext2D, W: number, H: number, radio: number, fuente: number) {
  const lg = g.createLinearGradient(0, 0, W, H);
  lg.addColorStop(0, "#0f766e");
  lg.addColorStop(0.5, "#f59e0b");
  lg.addColorStop(1, "#7c3aed");
  g.fillStyle = lg;
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#111827";
  g.beginPath();
  g.arc(W * 0.5, H * 0.5, radio, 0, 7);
  g.fill();
  g.fillStyle = "#f8fafc";
  g.font = `bold ${fuente}px Inter, sans-serif`;
  g.fillText("Aa", W * 0.5 - fuente * 0.62, H * 0.5 + fuente * 0.35);
}
