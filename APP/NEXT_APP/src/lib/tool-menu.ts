/**
 * Las herramientas del menú de la barra: las 6 destacadas de respaldo y dos de la familia Chile, con la primera frase
 * de su descripción. Vive aparte del registro, como tool-count.ts, porque la barra es un componente cliente y está en
 * todas las páginas: importar el registro mandaría al navegador los títulos y descripciones de todas las herramientas, que no usa.
 * Una prueba (herramientas-ronda2, «datos: el menú…») falla si deja de coincidir con el registro.
 */
export const MENU_HERRAMIENTAS = [
    { slug: "qr", nombre: "Generador de QR", que: "Crea un código QR para un enlace, texto, Wi-Fi, contacto o WhatsApp y descárgalo en PNG o SVG" },
    { slug: "quitar-fondo", nombre: "Quitar fondo", que: "Quita el fondo de una foto en tu navegador, retoca el borde y descarga un PNG transparente o con color" },
    { slug: "comprimir-imagen", nombre: "Compresor de imágenes", que: "Reduce el peso de una o varias imágenes eligiendo la calidad o un tamaño máximo en KB" },
    { slug: "claves", nombre: "Generador de contraseñas", que: "Genera contraseñas o frases de paso al azar, con la longitud y los caracteres que elijas" },
    { slug: "json", nombre: "Formateador JSON", que: "Formatea, minifica y valida JSON, con vista de árbol y aviso de claves duplicadas" },
    { slug: "impuestos", nombre: "Calculadora de IVA", que: "Agrega o quita el IVA de un monto, con la tasa de Chile (19 %), la de otros países o la que indiques" },
    { slug: "sueldo-liquido", nombre: "Calculadora de sueldo líquido", que: "Calcula el sueldo líquido desde el bruto, o el bruto que necesitas, con AFP, salud, cesantía e impuesto" },
    { slug: "uf-utm", nombre: "Conversor UF, UTM y dólar", que: "Convierte UF, UTM, dólares y euros a pesos chilenos y al revés, con los valores de hoy" },
];
