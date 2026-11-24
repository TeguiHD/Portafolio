import type { EstudioHerramienta } from "./como-se-hizo";

/**
 * El estudio de cada herramienta (sección «Cómo se hizo»). Cada frase sale del código de la herramienta, de sus pruebas
 * (tests/e2e) o de los diseños de noviembre de 2026 (docs/superpowers/specs/2026-11-21-herramientas-*); los parámetros
 * chilenos, de la investigación del 22-11-2026 con fuentes primarias. Las fuentes enlazadas respondieron 200 el 24-11-2026.
 * Donde algo no tiene prueba, el texto lo dice.
 */
export const ESTUDIOS_HERRAMIENTAS: Record<string, EstudioHerramienta> = {
    "convertir-imagen": {
        para: "Pasar una imagen, o hasta 20 a la vez, a WebP, PNG o JPG cuando una web, un formulario o un programa pide otro formato.",
        reviso: "Las firmas de archivo de PNG (W3C), WebP (RFC 9649), GIF y AVIF, para reconocer cada imagen por sus bytes, y la especificación de canvas de WHATWG, que crea el archivo nuevo.",
        funciona: "Corre en tu navegador. Reconoce el formato por los primeros bytes y no por la extensión, que cualquiera cambia al renombrar. Un lote se procesa de a una imagen, porque decodificar 20 juntas puede agotar la memoria de un celular.",
        comprueba: "Las pruebas suben un PNG de 320 × 240 y reciben uno de la misma medida, bajan un lote de tres en ZIP, rechazan un audio disfrazado de WebP y avisan el límite al pasar de 16.000 px.",
        fuentes: [
            { nombre: "PNG, tercera edición: firma del archivo (W3C)", url: "https://www.w3.org/TR/png-3/#5PNG-file-signature" },
            { nombre: "RFC 9649: WebP Image Format", url: "https://www.rfc-editor.org/rfc/rfc9649" },
            { nombre: "HTML: canvas.toBlob (WHATWG)", url: "https://html.spec.whatwg.org/multipage/canvas.html#dom-canvas-toblob" },
        ],
    },
    "recortar-imagen": {
        para: "Recortar una foto a la proporción que pide una red (1:1, 16:9, 9:16, 4:5 y otras), girarla y bajarla en PNG, JPG o WebP.",
        reviso: "La documentación de react-easy-crop 5.5.6, para el encuadre, el zoom y el giro, y la de @imgly/background-removal 1.7.0, para encajar el recorte al sujeto.",
        funciona: "Corre en tu navegador. Para encajar al sujeto, un modelo de segmentación analiza en segundo plano una copia de 512 px como máximo, que basta para una caja de recorte. La máscara se guarda por imagen: cambiar el margen o la proporción no vuelve a correr el modelo.",
        comprueba: "Una prueba elige 1:1 y confirma que el archivo descargado tiene el mismo ancho y alto; otra revisa el modo «Marcar sujeto». El encaje con el modelo y el giro todavía no tienen prueba.",
        fuentes: [
            { nombre: "react-easy-crop", url: "https://github.com/ValentinH/react-easy-crop" },
            { nombre: "@imgly/background-removal", url: "https://github.com/imgly/background-removal-js" },
        ],
    },
    "quitar-fondo": {
        para: "Separar a la persona u objeto del fondo de una foto y bajar un PNG transparente o con un color, retocando el borde con un pincel.",
        reviso: "remove.bg, el 21-11-2026: frente a él se dejó a la vista que la descarga sale sin marca de agua, porque es cierto y es una diferencia. El recorte sigue la documentación de @imgly/background-removal 1.7.0.",
        funciona: "Corre en tu navegador con @imgly/background-removal 1.7.0 y su modelo IS-Net, que se descarga de staticimgly.com la primera vez y queda guardado. Trabaja en segundo plano para que el avance y el botón de cancelar sigan respondiendo; la foto no se sube.",
        comprueba: "Las pruebas bloquean el modelo y revisan el editor manual: el pincel deja el centro transparente, deshacer y rehacer funcionan y el PNG descargado mide 320 × 240. El recorte automático todavía no tiene prueba.",
        fuentes: [
            { nombre: "@imgly/background-removal", url: "https://github.com/imgly/background-removal-js" },
            { nombre: "DIS: el proyecto de IS-Net", url: "https://github.com/xuebinqin/DIS" },
        ],
    },
    "convertir-ico": {
        para: "Armar un archivo .ico con varios tamaños, de 16 a 256 px, desde un logo, para el favicon clásico o para íconos de Windows.",
        reviso: "La estructura de íconos que documenta Microsoft: una cabecera de 6 bytes y una entrada de 16 bytes por tamaño, con cada tamaño guardado como PNG dentro del archivo.",
        funciona: "Corre en tu navegador: dibuja cada tamaño sin deformar la imagen y arma el .ico byte a byte, sin bibliotecas externas. El generador de favicons usa ese mismo armado.",
        comprueba: "Una prueba agrega el tamaño de 256 px y lee el .ico descargado: cuatro imágenes, la de 256 anotada como 0 (así lo pide el formato) y la primera, un PNG de 16 px con la esquina transparente.",
        fuentes: [
            { nombre: "Icons (Microsoft Learn)", url: "https://learn.microsoft.com/en-us/previous-versions/ms997538(v=msdn.10)" },
        ],
    },
    "comprimir-imagen": {
        para: "Bajar el peso de una imagen, o de hasta 20, eligiendo la calidad o el máximo en KB que pide un formulario o una plataforma.",
        reviso: "TinyPNG, el 21-11-2026, junto a otras herramientas sueltas del rubro: de ahí salieron el título centrado y la línea que dice dónde se procesa. La calidad se pasa al codificador del navegador, como define la especificación de canvas.",
        funciona: "Corre en tu navegador. Con un peso objetivo, una búsqueda binaria encuentra la mayor calidad entre 40 y 92 que quepa; si ni con 40 alcanza, achica la imagen. No baja de 40 porque ahí los defectos de la compresión se vuelven muy visibles.",
        comprueba: "Las pruebas suben un JPEG y confirman que sale en JPEG, piden 1 KB y esperan el aviso de si se logró, y revisan que mantener «Comparar» muestre el original.",
        fuentes: [
            { nombre: "HTML: canvas.toBlob y su calidad (WHATWG)", url: "https://html.spec.whatwg.org/multipage/canvas.html#dom-canvas-toblob" },
        ],
    },
    "redimensionar": {
        para: "Cambiar el ancho y el alto de una imagen, o de hasta 20, con medidas listas para Instagram, YouTube, Facebook, LinkedIn, Full HD y 4K.",
        reviso: "La especificación de canvas de WHATWG: drawImage para ajustar, cubrir o estirar, el suavizado en calidad alta al escalar y toBlob para guardar el resultado.",
        funciona: "Corre en tu navegador: dibuja la imagen en un lienzo del tamaño pedido, con la proporción fija si así se elige. Lee «1.080» como mil ochenta y no como 1,08, que redondeado daba 1 px.",
        comprueba: "Una prueba sube un PNG de 320 × 240, escribe 160 de ancho con la proporción fija y confirma que el archivo descargado mide 160 × 120; otra, que un JPEG sale en JPEG.",
        fuentes: [
            { nombre: "HTML: imageSmoothingQuality (WHATWG)", url: "https://html.spec.whatwg.org/multipage/canvas.html#dom-context-2d-imagesmoothingquality" },
        ],
    },
    "paleta-colores": {
        para: "Sacar los colores principales de una foto o un logo, en HEX, RGB y HSL, y llevarlos a CSS como variables.",
        reviso: "CSS Color 4 del W3C, para pasar de RGB a HSL y escribir hsl(), y las propiedades personalizadas de CSS, para el archivo de variables.",
        funciona: "Corre en tu navegador: lee los píxeles de una copia de 320 px, agrupa los colores parecidos, descarta los casi iguales y cuenta cada píxel en el color más cercano, así el «Dominante» es el de mayor porcentaje. Cada color es el promedio de su grupo.",
        comprueba: "Una prueba descarga el CSS y confirma que trae :root, --palette-1 y al menos dos colores distintos; otra, que los porcentajes van de mayor a menor, con el «Dominante» primero.",
        fuentes: [
            { nombre: "CSS Color 4: de RGB a HSL (W3C)", url: "https://www.w3.org/TR/css-color-4/#rgb-to-hsl" },
            { nombre: "CSS Custom Properties (W3C)", url: "https://www.w3.org/TR/css-variables-1/" },
        ],
    },
    "marca-agua": {
        para: "Poner un texto o un logo sobre una foto, en una esquina, al centro o en mosaico, para que el crédito viaje con la imagen.",
        reviso: "La API de canvas 2D de WHATWG: la opacidad, la medida y el dibujo del texto, el giro y la exportación en el formato de la foto original.",
        funciona: "Corre en tu navegador. El tamaño y el espaciado van en porcentaje del ancho, para que la marca se vea igual en una foto de 800 px que en una de 6.000 px. La vista previa mide hasta 1.600 px; la descarga, la foto completa, con la misma composición.",
        comprueba: "Una prueba deja el texto vacío y confirma que no se puede descargar; con un texto al centro y al 100 %, el PNG descargado mide 320 × 240 y cambian más de 100 valores de color.",
        fuentes: [
            { nombre: "HTML: el elemento canvas (WHATWG)", url: "https://html.spec.whatwg.org/multipage/canvas.html" },
        ],
    },
    "favicon": {
        para: "Generar desde un logo los íconos de un sitio: ocho PNG de 16 a 512 px, un favicon.ico, el site.webmanifest y las etiquetas HTML, en un ZIP.",
        reviso: "El HTML de WHATWG para rel=\"icon\" con sizes, el manifiesto de aplicaciones web del W3C y la guía de Apple para el apple-touch-icon.",
        funciona: "Corre en tu navegador: dibuja los ocho tamaños sin deformar el logo, arma el .ico con 16, 32 y 48 px y empaqueta todo con JSZip. El ícono de Apple sale siempre opaco, porque iOS pinta de negro la transparencia.",
        comprueba: "Una prueba abre el ZIP y confirma que trae ocho PNG cuadrados, que cada ícono del manifiesto está adentro y que las instrucciones traen las etiquetas con href=\"/favicon.ico\".",
        fuentes: [
            { nombre: "HTML: rel=\"icon\" (WHATWG)", url: "https://html.spec.whatwg.org/multipage/links.html#rel-icon" },
            { nombre: "Web Application Manifest (W3C)", url: "https://www.w3.org/TR/appmanifest/" },
            { nombre: "Configuring Web Applications (Apple)", url: "https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html" },
        ],
    },
    "qr": {
        para: "Crear un código QR para un enlace, una red Wi-Fi, un contacto, un evento o un modelo 3D, listo para imprimir o compartir.",
        reviso: "QRCode Monkey y TQRCG, el 21-11-2026. El contenido sigue el formato de cada tipo: vCard 3.0 (RFC 2426), eventos iCalendar (RFC 5545), MECARD y Wi-Fi como los lee ZXing y BIP-21 para Bitcoin.",
        funciona: "Corre en tu navegador con la biblioteca qrcode 1.5.4; solo la vista 3D de realidad aumentada carga el modelo desde su dirección. La forma de cada módulo se define una vez como trazado SVG, así el PNG y el SVG salen iguales. Con logo se usa la corrección H, la que tolera más daño.",
        comprueba: "Las pruebas leen el QR de la vista previa y comparan el texto: un enlace, una red Wi-Fi con «año;2026» y un texto con ñ y emojis. El PNG de 512 px mide 512 × 512, también en pantallas de alta densidad.",
        fuentes: [
            { nombre: "RFC 2426: vCard 3.0", url: "https://www.rfc-editor.org/rfc/rfc2426" },
            { nombre: "RFC 5545: iCalendar", url: "https://www.rfc-editor.org/rfc/rfc5545" },
            { nombre: "Barcode Contents (ZXing)", url: "https://github.com/zxing/zxing/wiki/Barcode-Contents" },
            { nombre: "BIP-21: URI de Bitcoin", url: "https://github.com/bitcoin/bips/blob/master/bip-0021.mediawiki" },
            { nombre: "node-qrcode", url: "https://github.com/soldair/node-qrcode" },
        ],
    },
    "claves": {
        para: "Crear una contraseña al azar, de 8 a 128 caracteres, o una frase de 3 a 12 palabras en español, para una cuenta nueva o un gestor de contraseñas.",
        reviso: "Bitwarden y 1Password, el 21-11-2026: de ahí la clave ya generada al abrir y la línea que dice dónde se procesa. Los niveles usan como referencia los 112 bits de la NIST SP 800-131A.",
        funciona: "Corre en tu navegador con crypto.getRandomValues. Cada carácter se sortea descartando los valores que sesgarían el resultado, y la clave a la que le falta un grupo elegido se descarta entera, para que todas las válidas tengan la misma probabilidad. La entropía lo descuenta.",
        comprueba: "Las pruebas revisan que la frase de seis palabras marque 72 bits con número y 63 sin él, y que ocho claves de 128 caracteres sin ambiguos no traigan l, 1, I, |, o, O ni 0. El azar todavía no tiene prueba estadística.",
        fuentes: [
            { nombre: "Web Cryptography API: getRandomValues (W3C)", url: "https://www.w3.org/TR/WebCryptoAPI/#Crypto-method-getRandomValues" },
            { nombre: "NIST SP 800-131A Rev. 2", url: "https://csrc.nist.gov/pubs/sp/800/131/a/r2/final" },
        ],
    },
    "ascii": {
        para: "Convertir una imagen en arte ASCII para un README, una terminal o una firma en texto plano, en blanco y negro o en color.",
        reviso: "La recomendación ITU-R BT.601, cuyos pesos de luma dan el brillo de cada píxel: 0,299 para el rojo, 0,587 para el verde y 0,114 para el azul.",
        funciona: "Corre en tu navegador con la API de canvas: la imagen no se sube. Se reduce a una grilla de 30 a 200 columnas y el brillo elige el carácter. El PNG pinta cada carácter en su celda, para que los bloques ░▒▓█ no descuadren la grilla.",
        comprueba: "Una prueba sube una imagen y revisa que el resultado tenga «@» y que «Invertir» lo cambie. Las descargas en TXT, HTML y PNG todavía no tienen prueba.",
        fuentes: [
            { nombre: "ITU-R BT.601", url: "https://www.itu.int/rec/R-REC-BT.601" },
        ],
    },
    "enlaces": {
        para: "Armar enlaces de WhatsApp con mensaje, de correo con asunto y de eventos para Google Calendar, Outlook o un archivo .ics.",
        reviso: "RFC 5545 para el archivo .ics (texto escapado, identificador y fecha de creación, líneas plegadas a 75 octetos), RFC 6068 para los enlaces de correo y el formato wa.me de WhatsApp, que pide el código de país.",
        funciona: "Corre en tu navegador, sin acortador. Las horas van en UTC para que cada calendario las muestre en la zona de quien abre el enlace. Un celular chileno de 9 dígitos recibe el 56 solo. Sin hora, el evento es de día completo.",
        comprueba: "Las pruebas revisan que 912345678 pase a wa.me/56912345678 con «&» y «/» codificados, que un evento sin hora vaya del 20 al 21 de noviembre y que uno de 22:00 a 02:00 termine al día siguiente. El .ics todavía no tiene prueba.",
        fuentes: [
            { nombre: "RFC 5545: iCalendar", url: "https://www.rfc-editor.org/rfc/rfc5545" },
            { nombre: "RFC 6068: el esquema mailto", url: "https://www.rfc-editor.org/rfc/rfc6068" },
            { nombre: "Cómo usar la función de clic para chatear (WhatsApp)", url: "https://faq.whatsapp.com/5913398998672934" },
        ],
    },
    "aleatorio": {
        para: "Sortear uno o varios ganadores, o repartir una lista en grupos, con un método que se ve en pantalla, para sorteos en redes, cursos y turnos.",
        reviso: "La Web Cryptography API del W3C: el azar sale de crypto.getRandomValues, con muestreo por rechazo para que ningún nombre tenga más probabilidad, y los ganadores salen del barajado de Fisher-Yates.",
        funciona: "Corre en tu navegador: los nombres no se envían. Todos los ganadores se eligen al empezar, sin repetir, y la ruleta solo gira hasta ellos: la animación no decide nada. Si el sistema pide reducir el movimiento, el resultado sale sin giro.",
        comprueba: "Las pruebas sortean 3 ganadores entre 5 nombres, con giro y sin él, y revisan que salgan 3 distintos, que la ruleta gire una vez por ganador y que «Terminar ya» complete el sorteo.",
        fuentes: [
            { nombre: "Web Cryptography API (W3C)", url: "https://www.w3.org/TR/WebCryptoAPI/" },
        ],
    },
    "unidades": {
        para: "Convertir entre 95 unidades de 12 magnitudes, de la longitud al consumo de combustible, y ver de dónde sale cada equivalencia.",
        reviso: "Las definiciones exactas del Sistema Internacional (BIPM): el metro por la velocidad de la luz y el kilogramo por la constante de Planck desde 2019; la pulgada de 2,54 cm del acuerdo de 1959 y la unidad astronómica de la UAI de 2012.",
        funciona: "Corre en tu navegador, con los factores en el código. Cada unidad guarda su valor en la unidad base; la temperatura y el consumo usan fórmulas. Se muestran hasta 12 cifras: bastan para ver 1.609,344 entero y esconden el ruido de los decimales del computador.",
        comprueba: "Las pruebas revisan que abra con 1 km igual a 0,621 millas, que lea un valor con coma decimal desde la dirección y que lo escrito no viaje en la visita que se registra.",
        fuentes: [
            { nombre: "El Sistema Internacional de Unidades (BIPM)", url: "https://www.bipm.org/en/publications/si-brochure" },
            { nombre: "Resoluciones de la UAI", url: "https://www.iau.org/Iau/Publications/List-of-Resolutions" },
        ],
    },
    "base64": {
        para: "Pasar texto a Base64 y de vuelta, con tildes, ñ y emojis, o convertir una imagen en una data URL para incrustarla en HTML o CSS.",
        reviso: "La RFC 4648, para el alfabeto Base64 y su variante para URL; la RFC 2397, para las data URL, y el estándar Encoding de WHATWG, que define cómo se pasa el texto a bytes UTF-8.",
        funciona: "Corre en tu navegador. El texto pasa a bytes UTF-8 antes de codificarse, porque btoa solo acepta Latin-1 y falla con una ñ o un emoji. Al decodificar acepta Base64 para URL, data URL y cabeceras Basic, y avisa si lo que trae no es texto.",
        comprueba: "Las pruebas codifican un texto con ñ y emoji y lo comparan con el de Node.js, lo invierten, decodifican Base64 para URL sin relleno y rechazan «%%%invalid» y bytes que no son UTF-8. La pestaña de imagen todavía no tiene prueba.",
        fuentes: [
            { nombre: "RFC 4648: The Base16, Base32, and Base64 Data Encodings", url: "https://www.rfc-editor.org/rfc/rfc4648" },
            { nombre: "RFC 2397: The \"data\" URL scheme", url: "https://www.rfc-editor.org/rfc/rfc2397" },
            { nombre: "Encoding Standard (WHATWG)", url: "https://encoding.spec.whatwg.org/" },
        ],
    },
    "binario": {
        para: "Ver un texto como bytes en binario, de a 8 bits, o leer una tira de ceros y unos de un ejercicio, un acertijo o un reto de seguridad.",
        reviso: "La RFC 3629, que define UTF-8: una letra sin tilde es un byte, una ñ son dos y un emoji, cuatro. La conversión usa el estándar Encoding de WHATWG.",
        funciona: "Corre en tu navegador. Cada carácter pasa a sus bytes UTF-8; antes se usaba el código UTF-16, que daba un byte para la ñ y partía los emojis. Al leer binario avisa si sobran bits, en vez de cortar en silencio.",
        comprueba: "Las pruebas convierten «ñ&» en 11000011 10110001 00100110 sin escapar el «&», avisan que sobran 3 bits en una tira de 19 y leen «Ho» desde dos bytes de 7 bits. Los emojis todavía no tienen prueba.",
        fuentes: [
            { nombre: "RFC 3629: UTF-8", url: "https://www.rfc-editor.org/rfc/rfc3629" },
            { nombre: "Encoding Standard (WHATWG)", url: "https://encoding.spec.whatwg.org/" },
        ],
    },
    "impuestos": {
        para: "Agregar o quitar el IVA de un monto sin el error de restar el 19 % a un total, para cotizar, facturar o revisar una boleta.",
        reviso: "La tasa de Chile es la general del DL 825, artículo 14: 19 % sobre la base imponible (texto revisado en la BCN el 24-11-2026). Las de otros países son atajos; la de EE. UU. es un promedio aproximado del impuesto a las ventas.",
        funciona: "Corre en tu navegador. Calcula en la unidad que se muestra (pesos en Chile, centavos en otros países): al agregar se redondea el IVA; al quitar, el neto, y el IVA es la resta. Así el neto más el IVA da siempre el total.",
        comprueba: "Las pruebas quitan el IVA a $47 y esperan $39 de neto más $8 de IVA (antes daba 40 y 8), agregan IVA a 1.190.000 y esperan 1.416.100, y revisan que el ejemplo de 10.000 muestre 11.900.",
        fuentes: [
            { nombre: "DL 825, Ley sobre Impuesto a las Ventas y Servicios (BCN)", url: "https://www.bcn.cl/leychile/navegar?idNorma=6369" },
        ],
    },
    "regex": {
        para: "Probar una expresión regular de JavaScript sobre un texto real: ver cada coincidencia con sus grupos, entender el patrón parte por parte y revisar un reemplazo antes de usarlo.",
        reviso: "La especificación ECMAScript de expresiones regulares, porque el motor es el de JavaScript, y la de workers de WHATWG, que permite detener una ejecución colgada. Para las funciones con IA, la documentación de OpenRouter.",
        funciona: "La expresión corre en tu navegador, en un worker que se detiene si pasa de 500 ms, porque la página no puede cortar una regex colgada. Con IA, nuestro servidor manda a Mistral, vía OpenRouter, la descripción o el patrón, nunca el texto de prueba.",
        comprueba: "Las pruebas revisan grupos con nombre, el reemplazo, que «x*» sobre «abc» da 4 coincidencias y que un worker lento no se confunda con una regex colgada. El corte de 500 ms y las funciones con IA todavía no tienen prueba.",
        fuentes: [
            { nombre: "ECMAScript: objetos RegExp (TC39)", url: "https://tc39.es/ecma262/#sec-regexp-regular-expression-objects" },
            { nombre: "HTML: Web Workers (WHATWG)", url: "https://html.spec.whatwg.org/multipage/workers.html" },
            { nombre: "Mistral Small 24B Instruct (OpenRouter)", url: "https://openrouter.ai/mistralai/mistral-small-24b-instruct-2501" },
        ],
    },
    "jwt": {
        para: "Leer la cabecera y el payload de un JWT, ver sus fechas y comprobar si la firma corresponde al secreto o a la clave pública que se espera.",
        reviso: "Las RFC 7519 (JWT), 7515 (firma), 7517 (formato de las claves) y 7518, que fija los algoritmos y pide que el secreto de HS256 mida al menos 32 bytes, y la Web Cryptography API del W3C.",
        funciona: "Corre en tu navegador y verifica con WebCrypto. La firma se calcula sobre los segmentos tal como llegaron, no sobre el JSON reformateado. Una clave anunciada en jku o x5u no se descarga, para no pedirle al navegador una dirección ajena.",
        comprueba: "Las pruebas verifican el token HS256 de ejemplo con su secreto y lo rechazan con otro, aceptan «Bearer» y comillas, y avisan un exp que no es número. La verificación con clave pública (RS, PS, ES) todavía no tiene prueba.",
        fuentes: [
            { nombre: "RFC 7519: JSON Web Token", url: "https://www.rfc-editor.org/rfc/rfc7519" },
            { nombre: "RFC 7515: JSON Web Signature", url: "https://www.rfc-editor.org/rfc/rfc7515" },
            { nombre: "RFC 7518: JSON Web Algorithms", url: "https://www.rfc-editor.org/rfc/rfc7518" },
            { nombre: "Web Cryptography API (W3C)", url: "https://www.w3.org/TR/WebCryptoAPI/" },
        ],
    },
    "json": {
        para: "Leer, validar e indentar un JSON que llega en una sola línea o con errores: ver dónde falla, recorrerlo como árbol y bajarlo formateado o compacto.",
        reviso: "JSON Formatter, el 21-11-2026: de ahí sale «Probar con un ejemplo». Y la RFC 8259, que advierte que las claves repetidas y los enteros muy grandes no se leen igual en todos los programas.",
        funciona: "Corre en tu navegador con JSON.parse, sin eval; sobre 200.000 caracteres el análisis pasa a un worker para que la página no se congele. El error se ubica con un lector propio, porque Safari no da la posición. Acepta hasta 5 MB.",
        comprueba: "Las pruebas revisan la línea y la columna de una coma final, los avisos de un entero de 20 cifras y de una clave repetida, una marca invisible al inicio y una descarga con la ñ intacta. El árbol y el worker todavía no tienen prueba.",
        fuentes: [
            { nombre: "RFC 8259: The JSON Data Interchange Format", url: "https://www.rfc-editor.org/rfc/rfc8259" },
        ],
    },
    "dns": {
        para: "Ver si un cambio de DNS ya llegó a seis resolvedores públicos, y revisar el SPF y el DMARC de un dominio cuando el correo rebota o cae en spam.",
        reviso: "La RFC 1035, base de las consultas; la RFC 7208, que limita el SPF a 10 consultas DNS; la RFC 7489, que define DMARC, y la documentación del módulo dns de Node.js, que hace las consultas.",
        funciona: "La consulta la hace nuestro servidor con el módulo dns de Node.js, preguntando por separado a Google, Cloudflare, Quad9, OpenDNS, AdGuard y CleanBrowsing. Cada respuesta se guarda 30 segundos, para no repetir seis consultas. AdGuard y CleanBrowsing filtran: un dominio que bloquean no va a coincidir.",
        comprueba: "Las pruebas revisan que un nombre .localhost se rechace en el navegador sin consultar y que el servidor responda con error a un tipo de registro inexistente. Las consultas reales y el SPF y el DMARC todavía no tienen prueba.",
        fuentes: [
            { nombre: "RFC 1035: Domain Names", url: "https://www.rfc-editor.org/rfc/rfc1035" },
            { nombre: "RFC 7208: Sender Policy Framework", url: "https://www.rfc-editor.org/rfc/rfc7208" },
            { nombre: "RFC 7489: DMARC", url: "https://www.rfc-editor.org/rfc/rfc7489" },
            { nombre: "Node.js: el módulo dns", url: "https://nodejs.org/api/dns.html" },
        ],
    },
    "nginx": {
        para: "Armar un bloque server de Nginx, o un .htaccess de Apache, para servir un sitio o una app tras un proxy, con HTTPS, caché, compresión y cabeceras de seguridad.",
        reviso: "La documentación de nginx.org (http2 on desde la versión 1.25.1, el map para WebSocket, cómo se heredan los add_header y el límite de peticiones), la RFC 6797 para HSTS y la de mod_headers de Apache.",
        funciona: "Corre en tu navegador y arma la configuración desde el formulario, quitando los caracteres que nginx interpretaría. El location de los archivos estáticos no lleva add_header, porque uno ahí anula las cabeceras de seguridad del server.",
        comprueba: "Las pruebas activan SSL y encuentran listen 443 ssl y http2 on; con proxy, la cabecera para WebSocket, y sin dominio, server_name _. Que la salida pase nginx -t y el .htaccess todavía no tienen prueba.",
        fuentes: [
            { nombre: "ngx_http_core_module (nginx.org)", url: "https://nginx.org/en/docs/http/ngx_http_core_module.html" },
            { nombre: "ngx_http_headers_module (nginx.org)", url: "https://nginx.org/en/docs/http/ngx_http_headers_module.html" },
            { nombre: "WebSocket proxying (nginx.org)", url: "https://nginx.org/en/docs/http/websocket.html" },
            { nombre: "RFC 6797: HTTP Strict Transport Security", url: "https://www.rfc-editor.org/rfc/rfc6797" },
        ],
    },
    "esteganografia": {
        para: "Esconder un mensaje entre emojis o en un texto con caracteres invisibles, y revisar si un correo, un mensaje o un prompt ya trae invisibles que esconden algo.",
        reviso: "Los documentos de Unicode sobre etiquetas, secuencias de emoji, límites de grafema y texto bidireccional, y el registro del ataque Trojan Source en la base de vulnerabilidades del NIST, que usa los controles bidireccionales.",
        funciona: "Corre en tu navegador. Cada byte UTF-8 del mensaje va en 8 caracteres de ancho cero tras una marca U+2060; antes se separaban con U+200D, que los emojis compuestos también llevan y rompía el mensaje. El detector no marca los invisibles propios de un emoji.",
        comprueba: "Las pruebas revisan que el ejemplo muestre 10 invisibles en 2 lugares y lea «secreto» en etiquetas, y que un espacio de ancho cero suelto no cuente como mensaje. Esconder y volver a leer todavía no tiene prueba.",
        fuentes: [
            { nombre: "UTS #51: Unicode Emoji", url: "https://www.unicode.org/reports/tr51/" },
            { nombre: "UAX #29: Unicode Text Segmentation", url: "https://www.unicode.org/reports/tr29/" },
            { nombre: "CVE-2021-42574, Trojan Source (NIST NVD)", url: "https://nvd.nist.gov/vuln/detail/CVE-2021-42574" },
        ],
    },
    "esteganografia-imagen": {
        para: "Esconder un mensaje de texto en los píxeles de un PNG y volver a leerlo, para aprender la técnica LSB o armar retos de seguridad.",
        reviso: "El estándar Encoding de WHATWG, para guardar el mensaje en UTF-8, y la especificación de canvas sobre el alfa premultiplicado, que explica por qué los píxeles con transparencia no sirven para guardar datos.",
        funciona: "Corre en tu navegador, en segundo plano: guarda una firma, el largo y el mensaje en el último bit del rojo, el verde y el azul de cada píxel opaco. Salta los transparentes, porque el lienzo borra ahí esos bits.",
        comprueba: "Una prueba esconde un mensaje con ñ y un emoji en un PNG con transparencia, lo descarga y, al volver a cargarlo, lee el mismo texto. Otra confirma el aviso cuando el mensaje no cabe.",
        fuentes: [
            { nombre: "HTML: alfa premultiplicado en el canvas (WHATWG)", url: "https://html.spec.whatwg.org/multipage/canvas.html#premultiplied-alpha-and-the-2d-rendering-context" },
            { nombre: "Encoding Standard (WHATWG)", url: "https://encoding.spec.whatwg.org/" },
        ],
    },
    "metadatos": {
        para: "Ver qué datos guarda una foto (cámara, fecha, ubicación GPS) antes de publicarla, y bajar una copia sin ellos.",
        reviso: "La estructura Exif de CIPA (DC-008), los marcadores de JPEG (ITU-T T.81), los bloques de texto de PNG (W3C) y los de EXIF y XMP de WebP (RFC 9649).",
        funciona: "Corre en tu navegador y trabaja sobre los bytes: quita los bloques de metadatos sin volver a codificar la imagen. En JPEG deja la orientación, porque sin ella una foto vertical se ve acostada, y el perfil de color; no copia lo que algunos celulares pegan después de la foto, como el video de una foto en movimiento.",
        comprueba: "Una prueba sube un JPEG con XMP antes del EXIF y ve la cámara y la orientación; la copia limpia ya no los trae, salvo la orientación. Otra pega un video con coordenadas tras la foto y confirma que la copia termina donde termina la imagen.",
        fuentes: [
            { nombre: "Estándares de CIPA (Exif, DC-008)", url: "https://www.cipa.jp/e/std/std-sec.html" },
            { nombre: "ITU-T T.81: JPEG (copia del W3C)", url: "https://www.w3.org/Graphics/JPEG/itu-t81.pdf" },
            { nombre: "PNG, tercera edición: bloques de texto (W3C)", url: "https://www.w3.org/TR/png-3/#11tEXt" },
            { nombre: "RFC 9649: WebP Image Format", url: "https://www.rfc-editor.org/rfc/rfc9649" },
        ],
    },
    "reverse-shell": {
        para: "Armar el comando de conexión inversa para una prueba de penetración autorizada o para practicar en un entorno propio, con la IP y el puerto de la máquina que escucha.",
        reviso: "La guía NIST SP 800-115, que describe cómo se hacen las pruebas de seguridad autorizadas, y la técnica T1059 de MITRE ATT&CK, donde los equipos de defensa documentan este tipo de comando para reconocerlo.",
        funciona: "Corre en tu navegador y solo arma el texto del comando: no se conecta a ninguna parte. La IP se acepta si es IPv4 o IPv6 válida y el puerto, si va de 1 a 65.535, para no armar un comando que no sirve.",
        comprueba: "Una prueba revisa que abra con la IP de ejemplo 10.10.14.5 y los comandos ya armados, sin el aviso de IP inválida. La validación de la IP y el puerto todavía no tiene prueba propia.",
        fuentes: [
            { nombre: "NIST SP 800-115: Technical Guide to Information Security Testing and Assessment", url: "https://csrc.nist.gov/pubs/sp/800/115/final" },
            { nombre: "T1059: Command and Scripting Interpreter (MITRE ATT&CK)", url: "https://attack.mitre.org/techniques/T1059/" },
        ],
    },
    "banner-ascii": {
        para: "Escribir un título grande con caracteres para el mensaje de bienvenida de un servidor, un banner SSH o la cabecera de un script.",
        reviso: "El estilo de FIGlet, del que Standard es un subconjunto escrito en el código, y la guía NIST SP 800-123, que recomienda configurar avisos en todos los servicios que los admiten: el script los trae.",
        funciona: "Corre en tu navegador, con las letras escritas en el código. Las tildes y la ñ pasan a su letra base y se avisa qué signos no dibuja la fuente. El script .sh escapa las comillas, el $ y el acento grave para que el texto no se ejecute.",
        comprueba: "Una prueba escribe «¿Ñandú?» y revisa que la Ñ salga como N y que se avisen «¿» y «?»; otra, que en Banner el 0 y el 1 no se dibujen igual. El script .sh todavía no tiene prueba.",
        fuentes: [
            { nombre: "NIST SP 800-123: Guide to General Server Security", url: "https://csrc.nist.gov/pubs/sp/800/123/final" },
            { nombre: "sshd_config: la directiva Banner (OpenBSD)", url: "https://man.openbsd.org/sshd_config" },
        ],
    },
    "subredes": {
        para: "Calcular la red, el broadcast, la máscara y los hosts de una IPv4, o el rango de un prefijo IPv6, y repartir una red IPv4 en subredes VLSM del tamaño que pide cada una.",
        reviso: "La RFC 4632 (CIDR), la 3021 para los /31 punto a punto, la 6890 para los rangos especiales (privados, loopback, documentación), la 5952 para escribir IPv6 y la 4180 para el CSV.",
        funciona: "Corre en tu navegador. IPv6 se calcula con BigInt, para tener precisión exacta en sus 128 bits; en VLSM las direcciones se manejan como números comunes, sin operadores de bits, que en JavaScript usan 32 bits con signo.",
        comprueba: "Las pruebas revisan que «192.168.100.0/24» pegado no se corte en /2, que un /31 no invente broadcast, que 127.0.0.1 salga como loopback y que el plan VLSM de ejemplo deje libres 192.168.10.228/30, .232/29 y .240/28. El CSV todavía no tiene prueba.",
        fuentes: [
            { nombre: "RFC 4632: CIDR", url: "https://www.rfc-editor.org/rfc/rfc4632" },
            { nombre: "RFC 3021: prefijos /31", url: "https://www.rfc-editor.org/rfc/rfc3021" },
            { nombre: "RFC 6890: Special-Purpose IP Address Registries", url: "https://www.rfc-editor.org/rfc/rfc6890" },
            { nombre: "RFC 5952: IPv6 Address Text Representation", url: "https://www.rfc-editor.org/rfc/rfc5952" },
        ],
    },
    "rut": {
        para: "Comprobar que el dígito verificador de un RUT, o de una lista entera, calza con sus números, y generar RUT de prueba para formularios y planillas.",
        reviso: "La regla de módulo 11 del dígito verificador: pesos de 2 a 7 desde la derecha, 0 cuando el cálculo da 11 y K cuando da 10. No se consulta ninguna base de datos de personas.",
        funciona: "Corre en tu navegador: los RUT no se envían. Acepta puntos, guion, espacios y k minúscula, pero rechaza cualquier otra letra en vez de borrarla en silencio, porque «12.345.678-X» no es un RUT. Si el dígito no calza, dice cuál corresponde.",
        comprueba: "Las pruebas calculan el dígito de 12.345.678 (5) y de 6 (K), aceptan el RUT con o sin puntos, rechazan «12.345.678-X» y revisan que los RUT de prueba que genera la página sean válidos.",
        fuentes: [],
    },
    "uf-utm": {
        para: "Pasar montos en UF, UTM, dólares o euros a pesos chilenos, y al revés, con el valor del día, para arriendos, multas, créditos y cotizaciones.",
        reviso: "El 22-11-2026 se compararon los valores de mindicador.cl con los que publica el SII: la UF de ese día, $41.384,81, y la UTM de noviembre, $72.440. Coincidieron.",
        funciona: "El servidor pide la UF, la UTM, el dólar y el euro a mindicador.cl y los pone en el HTML, así se leen sin esperar al JavaScript. Los guarda 30 minutos; si la fuente no responde, se pueden escribir a mano: no se inventa ninguno. La conversión corre en tu navegador.",
        comprueba: "Las pruebas abren la página sin JavaScript y encuentran en el HTML la UF con su fecha y la UTM del mes; luego convierten 2 UF y esperan el doble de la UF mostrada, al peso.",
        fuentes: [
            { nombre: "Valores de la UF 2026 (SII)", url: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm" },
            { nombre: "Valores de la UTM 2026 (SII)", url: "https://www.sii.cl/valores_y_fechas/utm/utm2026.htm" },
            { nombre: "mindicador.cl", url: "https://mindicador.cl/" },
        ],
    },
    "sueldo-liquido": {
        para: "Saber cuánto llega a la cuenta desde un sueldo bruto, o qué bruto pedir para un líquido, con cada descuento legal por separado.",
        reviso: "El 22-11-2026, en fuentes primarias: las comisiones de las siete AFP y los topes de 90 UF y 135,2 UF (Superintendencia de Pensiones), la tabla del impuesto único (SII y Ley sobre Impuesto a la Renta, art. 43) y el seguro de cesantía (Ley 19.728).",
        funciona: "Corre en tu navegador, con la UF y la UTM que trae el servidor. Descuenta AFP, salud y cesantía al peso y aplica el tramo del impuesto único. Los topes usan la UF del último día del mes, como pide la Superintendencia de Pensiones.",
        comprueba: "Las pruebas calculan $1.500.000 brutos con Habitat, Fonasa y contrato indefinido y esperan $1.207.390 líquidos, el mismo caso hecho a mano con los parámetros del 22-11-2026. También prueban el tope imponible, la Isapre y la vuelta de líquido a bruto.",
        fuentes: [
            { nombre: "Comisiones de las AFP (Superintendencia de Pensiones)", url: "https://www.spensiones.cl/apps/GetFile.php?id=002&namefile=traspasos" },
            { nombre: "Topes imponibles 2026 (Superintendencia de Pensiones)", url: "https://spensiones.cl/portal/institucional/594/w3-article-16921.html" },
            { nombre: "Impuesto de segunda categoría 2026 (SII)", url: "https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto2026.htm" },
            { nombre: "Ley 19.728, seguro de desempleo (BCN)", url: "https://www.bcn.cl/leychile/navegar?idLey=19728" },
            { nombre: "Ley sobre Impuesto a la Renta (BCN)", url: "https://www.bcn.cl/leychile/navegar?idNorma=6368" },
        ],
    },
    "boleta-honorarios": {
        para: "Saber cuánto se recibe de una boleta de honorarios, o qué bruto cobrar para recibir un monto exacto, con la retención de cada año.",
        reviso: "El 22-11-2026 se verificó en el SII la retención de 15,25 % para 2026 y, en la Ley 21.133, el 16 % de 2027 y el 17 % desde 2028. Una pregunta frecuente del SII trae el divisor mal escrito (0,08475): es 0,8475.",
        funciona: "Corre en tu navegador. La retención es el bruto por la tasa del año, al peso. Para ir del líquido al bruto se divide por 1 menos la tasa y se ajusta de a un peso hasta que el líquido calce exacto.",
        comprueba: "Las pruebas revisan la tasa de cada año (14,5 %, 15,25 %, 16 % y 17 %), que $100.000 brutos dejan $84.750 y que, en la página, recibir $500.000 en 2026 pide una boleta de $589.971.",
        fuentes: [
            { nombre: "Retención de honorarios en 2026 (SII, 26-12-2025)", url: "https://www.sii.cl/noticias/2025/261225noti01smn.htm" },
            { nombre: "Ley 21.133 (BCN)", url: "https://www.bcn.cl/leychile/navegar?idLey=21133" },
        ],
    },
};
