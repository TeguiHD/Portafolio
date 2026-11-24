/**
 * Las herramientas del menú de la barra: las 6 destacadas de respaldo y dos de la familia Chile, cada una con una frase
 * corta que cabe en una línea del panel (la primera frase de la descripción quedaba cortada a media palabra). Vive aparte del registro, como tool-count.ts, porque la barra es un componente cliente y está en
 * todas las páginas: importar el registro mandaría al navegador los títulos y descripciones de todas las herramientas, que no usa.
 * Una prueba (herramientas-ronda2, «datos: el menú…») revisa slugs, nombres y largo de cada frase.
 */
export const MENU_HERRAMIENTAS = [
    { slug: "qr", nombre: "Generador de QR", que: "Enlaces, Wi-Fi, contactos o WhatsApp" },
    { slug: "quitar-fondo", nombre: "Quitar fondo", que: "En tu navegador, con PNG transparente" },
    { slug: "comprimir-imagen", nombre: "Compresor de imágenes", que: "Por calidad o por tamaño máximo en KB" },
    { slug: "claves", nombre: "Generador de contraseñas", que: "Contraseñas o frases de paso al azar" },
    { slug: "json", nombre: "Formateador JSON", que: "Formatea y valida, con vista de árbol" },
    { slug: "impuestos", nombre: "Calculadora de IVA", que: "Agrega o quita el IVA de un monto" },
    { slug: "sueldo-liquido", nombre: "Calculadora de sueldo líquido", que: "Del bruto al líquido, o al revés" },
    { slug: "uf-utm", nombre: "Conversor UF, UTM y dólar", que: "A pesos chilenos, con los valores de hoy" },
];
