/**
 * Contenido editorial de cada herramienta.
 *
 * Vive separado de `tools-content.ts` (que es metadata: title, description,
 * keywords) porque son cosas distintas y cambian a ritmos distintos: la
 * metadata la gobierna el auditor con reglas de longitud, esto es prosa.
 *
 * Formato answer-first en las FAQ: la respuesta directa primero, en 40-60
 * palabras, y el matiz después. Es el formato que los motores de respuesta
 * extraen y citan; una respuesta que empieza con "depende" no se cita nunca.
 */

export interface ToolCopyStep {
    title: string;
    body: string;
}

export interface ToolCopyFaq {
    question: string;
    answer: string;
}

export interface ToolCopy {
    /** 60-90 palabras. Qué es y para quién, sin rodeos. */
    intro: string;
    /** Guía de uso, 3-4 pasos. */
    steps: ToolCopyStep[];
    /** Casos de uso reales, 3-4. */
    useCases: ToolCopyStep[];
    /** 4-5 preguntas. Alimenta el schema FAQPage. */
    faq: ToolCopyFaq[];
}

export const TOOLS_COPY: Record<string, ToolCopy> = {
    qr: {
        intro:
            "Un código QR es un enlace que se puede mirar. Este generador crea códigos para URL, texto plano, redes WiFi, contactos, correos, eventos de calendario y coordenadas, y los exporta en PNG o SVG a la resolución que necesites. No lleva marca de agua, no caduca y no pasa por un acortador: el contenido queda codificado en el propio dibujo, así que el código funciona aunque este sitio deje de existir.",
        steps: [
            {
                title: "Elige el tipo de contenido",
                body: "URL es lo más común, pero WiFi ahorra dictar contraseñas y vCard entrega tus datos de contacto completos con un escaneo. El tipo cambia qué campos se piden, no la dificultad.",
            },
            {
                title: "Rellena los datos",
                body: "El código se regenera mientras escribes. Cuanto más texto codifiques, más denso queda el patrón y más difícil resulta escanearlo de lejos o impreso en pequeño.",
            },
            {
                title: "Ajusta tamaño y color",
                body: "Mantén contraste alto entre el código y el fondo. Un QR claro sobre fondo oscuro falla en muchos lectores: conviene invertirlo antes que arriesgarse.",
            },
            {
                title: "Descarga en PNG o SVG",
                body: "PNG sirve para pantalla y redes. Para imprimir usa SVG: es vectorial y se amplía a cualquier tamaño sin pixelarse, desde una tarjeta hasta un pendón.",
            },
        ],
        useCases: [
            {
                title: "WiFi para visitas",
                body: "Genera el código con el SSID y la contraseña, imprímelo y déjalo a la vista. Quien llegue se conecta escaneando, sin que nadie tenga que deletrear la clave.",
            },
            {
                title: "Menús y catálogos",
                body: "Un QR sobre la mesa que apunta a la carta actualizada evita reimprimir cada vez que cambia un precio. El código sigue sirviendo aunque el contenido detrás cambie.",
            },
            {
                title: "Tarjetas de presentación",
                body: "Un QR de tipo vCard pasa nombre, teléfono, correo y empresa a la agenda del otro sin que tenga que teclear nada ni transcribir mal un dígito.",
            },
        ],
        faq: [
            {
                question: "¿Los códigos QR caducan?",
                answer: "No. El contenido está codificado dentro del propio patrón, así que el código funciona indefinidamente mientras el destino siga existiendo. Lo que sí caduca son los QR de servicios que redirigen a través de sus servidores: si esa empresa cierra o cobra, el código deja de funcionar. Los de aquí no redirigen.",
            },
            {
                question: "¿Cuántos caracteres caben en un código QR?",
                answer: "Hasta unos 4.296 caracteres alfanuméricos en el tamaño máximo. Pero mucho antes de ese límite el patrón se vuelve tan denso que los lectores fallan. Para uso práctico conviene quedarse bajo los 300 caracteres, y para impresión pequeña bajo los 100.",
            },
            {
                question: "¿Puedo cambiar el destino después de imprimir el código?",
                answer: "No directamente: el destino está grabado en el patrón. La solución es codificar una URL propia que tú controles y redirigir desde tu servidor. Así cambias el destino sin reimprimir nada, a costa de depender de que esa URL siga viva.",
            },
            {
                question: "¿Qué formato conviene para imprimir?",
                answer: "SVG. Es vectorial, así que escala a cualquier tamaño sin perder nitidez, desde una etiqueta hasta una valla. PNG sirve para pantalla, pero al ampliarlo aparecen bordes borrosos que confunden a los lectores y bajan la tasa de escaneo.",
            },
            {
                question: "¿Se puede escanear un QR de color?",
                answer: "Sí, siempre que haya contraste fuerte entre el patrón y el fondo. La regla práctica: patrón oscuro sobre fondo claro. Invertirlo funciona en cámaras modernas, pero falla en lectores antiguos y en condiciones de poca luz, así que no conviene arriesgarse.",
            },
        ],
    },

    claves: {
        intro:
            "Una contraseña fuerte no es la que resulta difícil de recordar, sino la que resulta cara de adivinar. Este generador crea claves aleatorias con la longitud y el juego de caracteres que definas, usando el generador criptográfico del propio navegador. Nada viaja por la red: la clave se produce en tu equipo y no se registra en ningún lado, ni siquiera de forma temporal.",
        steps: [
            {
                title: "Define la longitud",
                body: "La longitud pesa más que cualquier otra cosa. Doce caracteres es el mínimo razonable hoy; dieciséis o más para lo que de verdad importa, como el correo principal o el gestor de contraseñas.",
            },
            {
                title: "Elige los tipos de carácter",
                body: "Mayúsculas, minúsculas, números y símbolos. Si un sistema antiguo rechaza símbolos, compénsalo alargando la clave: cada carácter extra multiplica el espacio de búsqueda.",
            },
            {
                title: "Genera y copia",
                body: "Genera tantas veces como quieras. Ninguna de las claves descartadas queda guardada; se pierden en cuanto cierras la pestaña.",
            },
            {
                title: "Guárdala en un gestor",
                body: "Una clave aleatoria fuerte que terminas anotando en un papel pegado al monitor deja de ser fuerte. Un gestor de contraseñas es el complemento obligatorio de esta herramienta.",
            },
        ],
        useCases: [
            {
                title: "Cuentas nuevas",
                body: "Cada servicio con su clave única. Así una filtración en un sitio cualquiera no abre la puerta de todos los demás, que es como se pierde el acceso en cadena.",
            },
            {
                title: "Claves de WiFi",
                body: "La contraseña por defecto del router suele derivarse del modelo o del número de serie. Una clave aleatoria larga elimina esa relación y con ella los ataques de diccionario.",
            },
            {
                title: "Credenciales de servicio",
                body: "Bases de datos, APIs y cuentas de despliegue no las teclea nadie, así que no hay razón para que sean cortas ni memorizables. Genera cadenas largas y guárdalas cifradas.",
            },
        ],
        faq: [
            {
                question: "¿Es seguro generar una contraseña en una página web?",
                answer: "Depende de dónde se genere. Esta usa la API criptográfica del navegador, así que la clave se crea en tu equipo y nunca se envía. Puedes comprobarlo desconectando la red antes de generarla: sigue funcionando. Desconfía de cualquier generador que necesite conexión para producir la clave.",
            },
            {
                question: "¿Qué longitud debería tener mi contraseña?",
                answer: "Doce caracteres aleatorios es el mínimo sensato en 2026, y dieciséis para cuentas críticas como el correo o el gestor de contraseñas. La longitud aporta más resistencia que la complejidad: una clave larga de solo letras aguanta más que una corta llena de símbolos.",
            },
            {
                question: "¿Sirve de algo cambiar la contraseña cada tres meses?",
                answer: "Poco, y suele ser contraproducente. Forzar cambios frecuentes empuja a la gente a variaciones predecibles del tipo Clave1, Clave2. Las guías actuales del NIST recomiendan claves largas y únicas, cambiadas solo ante sospecha real de filtración.",
            },
            {
                question: "¿Los símbolos hacen la contraseña más segura?",
                answer: "Amplían el alfabeto, así que sí, pero menos de lo que la gente cree. Pasar de 62 a 94 caracteres posibles equivale a añadir un par de caracteres de longitud. Si un sistema rechaza símbolos, alargar la clave compensa de sobra.",
            },
            {
                question: "¿Puedo reutilizar una contraseña fuerte en varios sitios?",
                answer: "No. La fortaleza no protege contra la reutilización: si el sitio más débil que la usa filtra su base de datos, esa clave queda expuesta para todos los demás. Una contraseña única por servicio es lo que contiene el daño de una filtración ajena.",
            },
        ],
    },

    base64: {
        intro:
            "Base64 convierte datos binarios en texto imprimible usando 64 caracteres seguros. No es cifrado ni compresión: es una forma de meter una imagen o un archivo por un canal que solo acepta texto, como un correo, un JSON o una hoja de CSS. Aquí puedes codificar y decodificar texto e imágenes en ambos sentidos, íntegramente en el navegador.",
        steps: [
            {
                title: "Elige el sentido",
                body: "Codificar convierte tu contenido en una cadena Base64. Decodificar hace lo contrario y recupera el original. La herramienta detecta imágenes y texto por separado.",
            },
            {
                title: "Pega el contenido o suelta el archivo",
                body: "Para texto, escribe o pega directamente. Para imágenes, arrastra el archivo: obtendrás la cadena y también el data URI listo para usar en CSS o HTML.",
            },
            {
                title: "Copia el resultado",
                body: "El data URI incluye el prefijo con el tipo MIME, que es lo que el navegador necesita para saber qué está recibiendo. Sin ese prefijo la cadena no se renderiza.",
            },
        ],
        useCases: [
            {
                title: "Iconos pequeños en CSS",
                body: "Incrustar un icono como data URI ahorra una petición HTTP. Compensa solo en archivos de pocos kilobytes: por encima de eso, el peso extra supera lo ahorrado.",
            },
            {
                title: "Depurar APIs",
                body: "Muchas APIs devuelven adjuntos y firmas en Base64. Decodificarlos aquí permite ver qué llegó de verdad sin escribir un script para inspeccionar la respuesta.",
            },
            {
                title: "Cabeceras de autenticación",
                body: "La autenticación básica de HTTP codifica usuario y contraseña en Base64. Decodificar la cabecera muestra exactamente qué credenciales viajan, que casi nunca es lo que uno cree.",
            },
        ],
        faq: [
            {
                question: "¿Base64 cifra la información?",
                answer: "No, y confundirlo con cifrado es un error de seguridad frecuente. Base64 es una codificación reversible sin clave: cualquiera puede decodificarla al instante. Nunca lo uses para proteger contraseñas, tokens ni datos personales; para eso hace falta cifrado real.",
            },
            {
                question: "¿Por qué la cadena Base64 pesa más que el archivo original?",
                answer: "Porque representa cada 3 bytes con 4 caracteres, lo que añade aproximadamente un 33% de tamaño. Es el precio de convertir binario en texto imprimible. Por eso incrustar imágenes grandes como data URI perjudica el rendimiento en vez de ayudarlo.",
            },
            {
                question: "¿Qué es un data URI y en qué se diferencia?",
                answer: "Un data URI es la cadena Base64 con un prefijo que declara el tipo de contenido, por ejemplo data:image/png;base64. Ese prefijo es lo que permite al navegador interpretarla como imagen. La cadena suelta, sin prefijo, no se renderiza en ningún lado.",
            },
            {
                question: "¿Se suben mis archivos a algún servidor?",
                answer: "No. La conversión ocurre en tu navegador mediante la API FileReader, y el archivo nunca sale de tu equipo. Puedes comprobarlo desconectando la red: la herramienta sigue codificando y decodificando con normalidad.",
            },
        ],
    },

    json: {
        intro:
            "JSON mal formateado es ilegible, y el error casi siempre es una coma de más, una comilla suelta o una llave sin cerrar. Este formateador indenta la estructura, la colorea por tipo de dato y señala el punto exacto donde la sintaxis se rompe, en lugar del mensaje genérico que suelen dar las consolas. Todo se procesa en tu navegador.",
        steps: [
            {
                title: "Pega el JSON",
                body: "Da igual si viene en una sola línea o mal indentado. La herramienta lo analiza tal como llega, incluidas las respuestas de API sin formato ninguno.",
            },
            {
                title: "Lee el resultado",
                body: "Si es válido, verás la estructura indentada y coloreada. Si no, verás la posición del error: casi siempre está una línea antes de donde parece.",
            },
            {
                title: "Copia o compacta",
                body: "El formato indentado sirve para leer y depurar. El compacto, sin espacios, es el que conviene enviar por la red porque pesa bastante menos.",
            },
        ],
        useCases: [
            {
                title: "Depurar respuestas de API",
                body: "Una respuesta anidada en una sola línea es imposible de leer. Formatearla muestra la jerarquía real y hace evidente qué campo falta o llega nulo.",
            },
            {
                title: "Validar antes de desplegar",
                body: "Un archivo de configuración con una coma de más rompe el arranque en producción. Validarlo antes cuesta segundos; descubrirlo en el despliegue cuesta bastante más.",
            },
            {
                title: "Revisar payloads de webhooks",
                body: "Los webhooks llegan compactados. Formatearlos permite comparar lo que el proveedor documenta con lo que de verdad envía, que no siempre coincide.",
            },
        ],
        faq: [
            {
                question: "¿Por qué mi JSON es inválido si se ve bien?",
                answer: "Las causas más frecuentes son invisibles a simple vista: una coma final después del último elemento, comillas simples en lugar de dobles, o comentarios. JSON no admite ninguna de las tres, aunque JavaScript sí las tolere en su propia sintaxis de objetos.",
            },
            {
                question: "¿JSON admite comentarios?",
                answer: "No. La especificación no los contempla, y cualquier parser estándar falla al encontrarlos. Algunas herramientas aceptan variantes como JSONC o JSON5 que sí los permiten, pero no son JSON válido y no se pueden enviar a una API que espere el formato estándar.",
            },
            {
                question: "¿Se envía mi JSON a algún servidor?",
                answer: "No. El análisis ocurre íntegramente en tu navegador, así que puedes pegar payloads con datos reales sin que salgan de tu equipo. Es la razón por la que esta herramienta sirve para depurar respuestas que contienen información de clientes.",
            },
            {
                question: "¿Cuál es la diferencia entre formatear y minificar?",
                answer: "Formatear añade saltos de línea e indentación para que un humano pueda leerlo. Minificar quita todo espacio innecesario para que pese menos al viajar por la red. El contenido es idéntico en ambos casos; solo cambia la presentación.",
            },
        ],
    },

    jwt: {
        intro:
            "Un JWT son tres bloques separados por puntos: cabecera, payload y firma. Los dos primeros son Base64 y cualquiera puede leerlos — no están cifrados, solo codificados. Este decodificador los muestra formateados y traduce las fechas de expiración a algo legible, para que puedas ver qué afirma realmente un token. La decodificación ocurre en tu navegador y el token no se envía a ningún lado.",
        steps: [
            {
                title: "Pega el token",
                body: "Pega la cadena completa, con los dos puntos incluidos. Si copiaste desde una cabecera Authorization, quita el prefijo Bearer antes de pegar.",
            },
            {
                title: "Revisa la cabecera",
                body: "Indica el algoritmo de firma. Un token que declare alg: none es una señal de alarma: significa que no está firmado y cualquiera pudo fabricarlo.",
            },
            {
                title: "Lee el payload",
                body: "Ahí están las afirmaciones: quién es el usuario, qué permisos tiene y hasta cuándo vale el token. Las fechas vienen en formato Unix y se muestran ya convertidas.",
            },
        ],
        useCases: [
            {
                title: "Depurar autenticación",
                body: "Cuando una API responde 401, el payload suele explicar por qué: el token expiró, el emisor no coincide o falta el permiso que el endpoint exige.",
            },
            {
                title: "Verificar expiración",
                body: "El campo exp indica cuándo deja de valer el token. Comparar esa fecha con la actual descarta o confirma la causa más común de fallo intermitente en sesiones.",
            },
            {
                title: "Auditar qué datos viajan",
                body: "Un payload es legible por cualquiera que intercepte el token. Revisarlo muestra si estás metiendo ahí datos personales que no deberían viajar en claro.",
            },
        ],
        faq: [
            {
                question: "¿Un JWT está cifrado?",
                answer: "No. La cabecera y el payload son Base64, que cualquiera decodifica al instante. La firma garantiza que el contenido no fue alterado, no que sea secreto. Nunca pongas contraseñas ni datos sensibles en el payload de un token.",
            },
            {
                question: "¿Se puede modificar un JWT?",
                answer: "Puedes cambiar el payload, pero entonces la firma deja de cuadrar y el servidor debería rechazarlo. El riesgo real aparece cuando el servidor no verifica la firma o acepta el algoritmo none, que es una vulnerabilidad clásica en implementaciones apresuradas.",
            },
            {
                question: "¿Se envía mi token a algún servidor al decodificarlo?",
                answer: "No. La decodificación ocurre en tu navegador, así que puedes analizar tokens de producción sin exponerlos. Esto importa: un token válido pegado en un decodificador remoto es una credencial entregada a un tercero.",
            },
            {
                question: "¿Qué significa el campo exp?",
                answer: "Es la fecha de expiración en tiempo Unix, es decir segundos transcurridos desde el 1 de enero de 1970. Pasada esa marca el token deja de ser válido y el servidor debe rechazarlo. La herramienta ya la muestra convertida a fecha legible.",
            },
            {
                question: "¿Puedo verificar la firma aquí?",
                answer: "No, y es deliberado: verificar exige la clave secreta, y pegar una clave de producción en cualquier página web es justo lo que no hay que hacer. Esta herramienta decodifica para inspección; la verificación pertenece a tu servidor.",
            },
        ],
    },
};

export function getToolCopy(slug: string): ToolCopy | undefined {
    return TOOLS_COPY[slug];
}
