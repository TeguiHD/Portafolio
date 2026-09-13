import type { SVGProps } from "react";

type IconoProps = SVGProps<SVGSVGElement>;

/** Iconos propios con ganchos de clase (.arr, .sp, .brush, .chk, .bgi) que mesa.css anima por intención. */
function Svg({ nombre, children, className, ...rest }: IconoProps & { nombre: string }) {
    return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={`mesa-ico mesa-ico-${nombre}${className ? ` ${className}` : ""}`} {...rest}>{children}</svg>;
}

export function IconoSubir(p: IconoProps) { return <Svg nombre="subir" {...p}><path d="M7 18a4 4 0 0 1-.7-7.9A5.5 5.5 0 0 1 17 9a4.5 4.5 0 0 1 0 9" /><g className="arr"><path d="M12 12v8M8.5 15.5 12 12l3.5 3.5" /></g></Svg>; }
export function IconoVarita(p: IconoProps) { return <Svg nombre="varita" {...p}><path d="M15 4 4 15l5 5L20 9z" /><path d="m14 5 5 5" /><g className="sp"><path d="M19 3v2M18 4h2" /></g><g className="sp"><path d="M21.5 8.5v2M20.5 9.5h2" /></g><g className="sp"><path d="M5 19.5v2M4 20.5h2" /></g></Svg>; }
export function IconoPincel(p: IconoProps) { return <Svg nombre="pincel" {...p}><g className="brush"><path d="m18.4 3.6 2 2-9 9-3.5 1.5L9.4 12.6z" /><path d="M9.2 12.8c-1.6 0-3.2.8-3.9 2.3C4.5 16.8 4 19 3 21c2.5 0 5-.5 6.8-1.5 1.6-.9 2.2-2.8 1.7-4.4" /></g></Svg>; }
export function IconoGoma(p: IconoProps) { return <Svg nombre="goma" {...p}><path d="m7 21-4-4 9.5-9.5 4 4L11 17" /><path d="m12.5 7.5 4-4 4 4-4 4" /><path d="M7 21h10" /></Svg>; }
export function IconoFondo(p: IconoProps) { return <Svg nombre="fondo" {...p}><g className="bgi"><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" /></g></Svg>; }
export function IconoDescargar({ listo, ...p }: IconoProps & { listo?: boolean }) { return <Svg nombre="descargar" data-listo={listo ? "true" : "false"} {...p}><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /><g className="arr"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" /></g><path className="chk" d="m7 12 3.5 3.5L17 9" /></Svg>; }
export function IconoCopiar(p: IconoProps) { return <Svg nombre="copiar" {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></Svg>; }
export function IconoDeshacer(p: IconoProps) { return <Svg nombre="deshacer" {...p}><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></Svg>; }
export function IconoRehacer(p: IconoProps) { return <Svg nombre="rehacer" {...p}><path d="m15 14 5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></Svg>; }
export function IconoOjo(p: IconoProps) { return <Svg nombre="ojo" {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Svg>; }
export function IconoCapas(p: IconoProps) { return <Svg nombre="capas" {...p}><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5M3 17l9 5 9-5" /></Svg>; }
export function IconoCuadricula(p: IconoProps) { return <Svg nombre="cuadricula" {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></Svg>; }
export function IconoGirar(p: IconoProps) { return <Svg nombre="girar" {...p}><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></Svg>; }
export function IconoRestablecer(p: IconoProps) { return <Svg nombre="restablecer" {...p}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 3v6h6" /></Svg>; }
export function IconoEncuadre(p: IconoProps) { return <Svg nombre="encuadre" {...p}><path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M18 22V8a2 2 0 0 0-2-2H2" /></Svg>; }
export function IconoAjustes(p: IconoProps) { return <Svg nombre="ajustes" {...p}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></Svg>; }
export function IconoImagen(p: IconoProps) { return <Svg nombre="imagen" {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="m21 16-5-5-8 8" /></Svg>; }
export function IconoCerrar(p: IconoProps) { return <Svg nombre="cerrar" {...p}><path d="m6 6 12 12M18 6 6 18" /></Svg>; }
export function IconoCodigo(p: IconoProps) { return <Svg nombre="codigo" {...p}><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 4l-4 16" /></Svg>; }
export function IconoGota(p: IconoProps) { return <Svg nombre="gota" {...p}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /></Svg>; }
