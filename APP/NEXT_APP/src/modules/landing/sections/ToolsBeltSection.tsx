"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowDownToLine, ArrowLeftRight, ArrowUpRight, Braces, Check,
  Crop, FileCode2, Fingerprint, Layers2, LockKeyhole, QrCode, ScanLine,
} from "lucide-react";
import { TOOL_COUNT } from "@/lib/tool-count";
import { useMotionActivity } from "../motion/LandingMotionProvider";
import { PlantPreview } from "../components/PlantPreview";
import { useRevelar } from "../portada/revelar";
import { onda, useInclinar, useMagnetico } from "../portada/interaccion";
import styles from "./ToolsBeltSection.module.css";

const quickTools = [
  { title: "Comprimir", detail: "Menos peso", href: "/herramientas/comprimir-imagen", icon: ArrowDownToLine },
  { title: "Contraseñas", detail: "Claves seguras", href: "/herramientas/claves", icon: LockKeyhole },
  { title: "Base64", detail: "Codifica y decodifica", href: "/herramientas/base64", icon: FileCode2 },
  { title: "Regex", detail: "Prueba tus patrones", href: "/herramientas/regex", icon: ScanLine },
] as const;

/** A light illustration, with a real comparison control and no model download. */
export function ToolsBeltSection() {
  const { ref, active } = useMotionActivity<HTMLElement>();
  const previewRef = useRef<HTMLDivElement>(null);
  const cabecera = useRevelar<HTMLDivElement>();
  const tarjetaFondo = useRef<HTMLElement>(null);
  const cta = useRef<HTMLAnchorElement>(null);
  useInclinar(tarjetaFondo, 5);
  useMagnetico(cta, 6);
  const [comparison, setComparison] = useState(50);
  const [interacted, setInteracted] = useState(false);

  // Follow the scroll only while visible. A user's adjustment always takes over.
  useEffect(() => {
    if (!active || interacted) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const element = previewRef.current;
      if (!element) return;
      const bounds = element.getBoundingClientRect();
      const progress = (window.innerHeight - bounds.top) / (window.innerHeight + bounds.height);
      setComparison(Math.round(Math.max(18, Math.min(82, 5 + progress * 90))));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [active, interacted]);

  return (
    <section ref={ref} id="tools-belt" data-motion-active={active} aria-labelledby="tools-heading" className={styles.section}>
      <div className={styles.container}>
        <div ref={cabecera} className={styles.heading}>
          <div>
            <div className={styles.eyebrow} data-revela="eyebrow"><span aria-hidden="true" /> {TOOL_COUNT} herramientas · sin registro</div>
            <h2 id="tools-heading">
              <span className="ln"><span>Las herramientas que uso a diario.</span></span>
              <span className="ln"><span className={styles.t2}>Úsalas tú también.</span></span>
            </h2>
            <p data-revela="sub">Quita el fondo de una foto, recorta, genera un QR o limpia un JSON: rápido, en tu navegador y sin cuenta.</p>
          </div>
          <Link ref={cta} href="/herramientas" prefetch={false} className={styles.allTools} data-magnetic onPointerDown={onda}>
            <span className={styles.count}>{TOOL_COUNT}</span>
            Explorar herramientas
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>

        <div className={styles.featureGrid}>
          <article ref={tarjetaFondo} className={`${styles.card} ${styles.backgroundCard}`}>
            <span className="p-brillo" aria-hidden="true" />
            <div className={styles.cardHeader}>
              <span className={styles.toolIcon}><Layers2 size={20} aria-hidden="true" /></span>
              <span className={styles.tag}>Imagen · IA</span>
            </div>
            <div
              ref={previewRef}
              className={styles.comparison}
              style={{ "--comparison": `${comparison}%` } as CSSProperties}
              data-tool-preview
            >
              <div className={styles.originalBackground} aria-hidden="true"><span /></div>
              <PlantPreview className={styles.plant} />
              <span className={`${styles.previewLabel} ${styles.beforeLabel}`} aria-hidden="true">Original</span>
              <span className={`${styles.previewLabel} ${styles.afterLabel}`} aria-hidden="true">Sin fondo</span>
              <div className={styles.comparisonLine} aria-hidden="true"><span><ArrowLeftRight size={17} /></span></div>
              <input
                type="range"
                min={0}
                max={100}
                value={comparison}
                aria-label="Comparar ilustración con fondo y sin fondo"
                aria-valuetext={`${comparison}% de la ilustración con fondo`}
                onPointerDown={() => setInteracted(true)}
                onKeyDown={() => setInteracted(true)}
                onFocus={() => setInteracted(true)}
                onChange={event => {
                  setInteracted(true);
                  setComparison(Number(event.target.value));
                }}
                className={styles.comparisonInput}
              />
            </div>
            <div className={styles.previewHint}><ArrowLeftRight size={13} aria-hidden="true" /> Arrastra para comparar <span>Vista previa</span></div>
            <Link href="/herramientas/quitar-fondo" prefetch={false} className={styles.cardLink}>
              <div><h3>Quitar fondo</h3><p>Quédate con lo que importa.</p></div>
              <span className={styles.openButton}><ArrowUpRight size={21} aria-hidden="true" /></span>
            </Link>
          </article>

          <div className={styles.sideGrid}>
            <Link href="/herramientas/recortar-imagen" prefetch={false} className={`${styles.card} ${styles.cropCard}`}>
              <div className={styles.cardHeader}><span className={styles.toolIcon}><Crop size={20} aria-hidden="true" /></span><span className={styles.tag}>El encuadre cambia todo</span></div>
              <div className={styles.cropPreview} aria-hidden="true">
                <svg viewBox="0 0 480 180" fill="none" className={styles.landscape}>
                  <circle cx="355" cy="50" r="26" fill="#fde1b6" />
                  <path d="M0 158 119 35 260 180H0Z" fill="#617d8e" />
                  <path d="m119 35 30 32-21-8-9 8-12-4-25 8Z" fill="#d7e6e9" />
                  <path d="M144 180 282 62 425 180Z" fill="#3c656b" />
                  <path d="M270 180 391 108 480 147V180Z" fill="#264d52" />
                  <path d="M0 151q92-35 199 17t281-20v32H0Z" fill="#183e42" />
                </svg>
                <div className={styles.cropFrame}>
                  <span /><span /><span /><span />
                  <div className={styles.cropThirds} />
                  <span className={styles.cropRatio}>16 : 9</span>
                </div>
              </div>
              <div className={styles.cardLink}><div><h3>Recortar imagen</h3><p>Tu imagen, en la proporción justa.</p></div><ArrowUpRight size={21} aria-hidden="true" /></div>
            </Link>

            <div className={styles.miniGrid}>
              <Link href="/herramientas/qr" prefetch={false} className={`${styles.card} ${styles.miniCard}`}>
                <QrCode size={42} strokeWidth={1.3} className={styles.qrIcon} aria-hidden="true" />
                <div><h3>Códigos QR</h3><span>Crea y comparte <ArrowUpRight size={15} aria-hidden="true" /></span></div>
              </Link>
              <Link href="/herramientas/json" prefetch={false} className={`${styles.card} ${styles.miniCard}`}>
                <Braces size={42} strokeWidth={1.3} className={styles.jsonIcon} aria-hidden="true" />
                <div><h3>Editor JSON</h3><span>Ordena tus datos <ArrowUpRight size={15} aria-hidden="true" /></span></div>
              </Link>
            </div>
          </div>
        </div>

        <div className={styles.quickGrid}>
          {quickTools.map(({ title, detail, href, icon: Icon }) => (
            <Link key={href} href={href} prefetch={false} className={styles.quickLink}>
              <Icon size={21} strokeWidth={1.6} aria-hidden="true" />
              <div><h3>{title}</h3><span>{detail}</span></div>
              <ArrowUpRight size={16} className={styles.quickArrow} aria-hidden="true" />
            </Link>
          ))}
        </div>
        <div className={styles.footnote}>
          <span><Fingerprint size={14} aria-hidden="true" /> Sin registro</span>
          <span><Check size={14} aria-hidden="true" /> Sin marcas de agua</span>
        </div>
      </div>
    </section>
  );
}
