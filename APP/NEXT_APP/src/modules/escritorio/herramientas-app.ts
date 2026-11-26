/**
 * Cada herramienta pública como app del modo escritorio: el mapa de su slug a la misma página que se ve en /herramientas.
 * Solo lo importa la ruta de servidor /escritorio/app/[slug]: cada página es un componente aparte y al navegador viaja
 * solo el de la herramienta abierta. Si se agrega una herramienta al catálogo, va aquí también (la prueba de la ruta lo nota).
 */
import type { ComponentType } from "react";
import Aleatorio from "@/app/herramientas/aleatorio/page";
import Ascii from "@/app/herramientas/ascii/page";
import BannerAscii from "@/app/herramientas/banner-ascii/page";
import Base64 from "@/app/herramientas/base64/page";
import Binario from "@/app/herramientas/binario/page";
import BoletaHonorarios from "@/app/herramientas/boleta-honorarios/page";
import Claves from "@/app/herramientas/claves/page";
import ComprimirImagen from "@/app/herramientas/comprimir-imagen/page";
import ConvertirIco from "@/app/herramientas/convertir-ico/page";
import ConvertirImagen from "@/app/herramientas/convertir-imagen/page";
import Dns from "@/app/herramientas/dns/page";
import Enlaces from "@/app/herramientas/enlaces/page";
import Esteganografia from "@/app/herramientas/esteganografia/page";
import EsteganografiaImagen from "@/app/herramientas/esteganografia-imagen/page";
import Favicon from "@/app/herramientas/favicon/page";
import Impuestos from "@/app/herramientas/impuestos/page";
import Json from "@/app/herramientas/json/page";
import Jwt from "@/app/herramientas/jwt/page";
import MarcaAgua from "@/app/herramientas/marca-agua/page";
import Metadatos from "@/app/herramientas/metadatos/page";
import Nginx from "@/app/herramientas/nginx/page";
import PaletaColores from "@/app/herramientas/paleta-colores/page";
import Qr from "@/app/herramientas/qr/page";
import QuitarFondo from "@/app/herramientas/quitar-fondo/page";
import RecortarImagen from "@/app/herramientas/recortar-imagen/page";
import Redimensionar from "@/app/herramientas/redimensionar/page";
import Regex from "@/app/herramientas/regex/page";
import ReverseShell from "@/app/herramientas/reverse-shell/page";
import Rut from "@/app/herramientas/rut/page";
import Subredes from "@/app/herramientas/subredes/page";
import SueldoLiquido from "@/app/herramientas/sueldo-liquido/page";
import UfUtm from "@/app/herramientas/uf-utm/page";
import Unidades from "@/app/herramientas/unidades/page";

export const HERRAMIENTAS_APP: Record<string, ComponentType> = {
    "aleatorio": Aleatorio,
    "ascii": Ascii,
    "banner-ascii": BannerAscii,
    "base64": Base64,
    "binario": Binario,
    "boleta-honorarios": BoletaHonorarios,
    "claves": Claves,
    "comprimir-imagen": ComprimirImagen,
    "convertir-ico": ConvertirIco,
    "convertir-imagen": ConvertirImagen,
    "dns": Dns,
    "enlaces": Enlaces,
    "esteganografia": Esteganografia,
    "esteganografia-imagen": EsteganografiaImagen,
    "favicon": Favicon,
    "impuestos": Impuestos,
    "json": Json,
    "jwt": Jwt,
    "marca-agua": MarcaAgua,
    "metadatos": Metadatos,
    "nginx": Nginx,
    "paleta-colores": PaletaColores,
    "qr": Qr,
    "quitar-fondo": QuitarFondo,
    "recortar-imagen": RecortarImagen,
    "redimensionar": Redimensionar,
    "regex": Regex,
    "reverse-shell": ReverseShell,
    "rut": Rut,
    "subredes": Subredes,
    "sueldo-liquido": SueldoLiquido,
    "uf-utm": UfUtm,
    "unidades": Unidades,
};
