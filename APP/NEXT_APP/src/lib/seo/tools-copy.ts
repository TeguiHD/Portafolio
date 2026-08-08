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
    regex: {
        intro:
            "Una expresión regular es un patrón para buscar dentro de texto. Escribirlas a ciegas es lento y propenso a errores silenciosos: el patrón compila, no lanza ningún error y aun así captura lo que no debía. Este probador evalúa el patrón mientras escribes, resalta cada coincidencia sobre tu propio texto y muestra los grupos capturados, que es donde suele estar el fallo.",
        steps: [
            {
                title: "Escribe el patrón",
                body: "Sin las barras delimitadoras: el campo ya asume que lo que escribes es la expresión. Los modificadores como global o insensible a mayúsculas se activan aparte.",
            },
            {
                title: "Pega el texto de prueba",
                body: "Usa datos reales, no ejemplos inventados. Los casos que rompen un patrón casi siempre son los raros: acentos, espacios dobles, líneas vacías.",
            },
            {
                title: "Revisa los grupos",
                body: "Cada paréntesis crea un grupo de captura numerado. Si extraes el fragmento equivocado, comparar los grupos suele señalar el paréntesis mal puesto.",
            },
        ],
        useCases: [
            {
                title: "Validar formatos de entrada",
                body: "Correos, RUT, teléfonos o códigos postales. Probar el patrón contra casos límite antes de ponerlo en un formulario evita rechazar entradas válidas de usuarios reales.",
            },
            {
                title: "Buscar y reemplazar en el editor",
                body: "Refactorizaciones que un buscar-reemplazar simple no alcanza, como renombrar solo las llamadas a una función y no las menciones en comentarios.",
            },
            {
                title: "Filtrar logs",
                body: "Extraer las líneas con cierto código de error, o quedarse solo con las peticiones de un rango de IP, sin escribir un script para cada consulta puntual.",
            },
        ],
        faq: [
            {
                question: "¿Por qué mi expresión regular es tan lenta?",
                answer: "Casi siempre por retroceso catastrófico: cuantificadores anidados como (a+)+ hacen que el motor pruebe una cantidad explosiva de combinaciones antes de rendirse. La solución es evitar anidar cuantificadores y ser lo más específico posible en cada parte del patrón.",
            },
            {
                question: "¿Cuál es la diferencia entre codicioso y perezoso?",
                answer: "Un cuantificador codicioso como .* captura todo lo que puede y luego retrocede; uno perezoso como .*? captura lo mínimo y va creciendo. Es la causa habitual de que un patrón para extraer una etiqueta HTML se trague el documento entero.",
            },
            {
                question: "¿Sirve una expresión regular para validar correos?",
                answer: "Para un filtro básico sí, pero la especificación real de direcciones de correo es tan permisiva que ninguna expresión razonable la cubre entera. En producción conviene validar que haya una arroba y un punto, y confirmar de verdad enviando un correo.",
            },
            {
                question: "¿Las expresiones regulares funcionan igual en todos los lenguajes?",
                answer: "No. La sintaxis básica se comparte, pero el comportamiento de lookbehind, grupos con nombre y clases Unicode varía entre JavaScript, Python, PCRE y Go. Un patrón probado aquí funciona en JavaScript; conviene verificarlo en el motor de destino.",
            },
        ],
    },

    impuestos: {
        intro:
            "Calcular IVA a mano se equivoca en la dirección: sumar el 19% a un precio y luego restarle el 19% al resultado no devuelve el precio original. Esta calculadora resuelve los dos sentidos por separado — añadir impuesto a un valor neto y extraerlo de un valor bruto — con la tasa que configures, para que la cifra que entregues al cliente cuadre con la que declares.",
        steps: [
            {
                title: "Elige el sentido",
                body: "Agregar IVA parte de un valor neto y calcula el total. Quitar IVA parte del total que ya cobraste y separa cuánto de eso es impuesto.",
            },
            {
                title: "Ajusta la tasa",
                body: "Viene con 19%, la tasa general en Chile. Cámbiala si trabajas con otro país o con un régimen especial: el cálculo es el mismo, solo cambia el porcentaje.",
            },
            {
                title: "Copia el desglose",
                body: "Verás neto, impuesto y total por separado. Ese desglose es el que va en la factura, no solo la cifra final.",
            },
        ],
        useCases: [
            {
                title: "Cotizar servicios",
                body: "Definir el neto que quieres ganar y ver el total que cobrarás, para que el precio anunciado no cambie de golpe al momento de facturar.",
            },
            {
                title: "Revisar boletas recibidas",
                body: "Separar cuánto del total pagado fue impuesto, que es lo que necesitas para declarar y lo que casi nunca viene desglosado en un recibo de compra.",
            },
            {
                title: "Fijar precios de venta",
                body: "Trabajar hacia atrás desde un precio de venta redondo hasta el neto real, para saber cuál es tu margen efectivo después del impuesto.",
            },
        ],
        faq: [
            {
                question: "¿Cómo se quita el IVA de un precio con impuesto incluido?",
                answer: "Se divide entre 1,19 cuando la tasa es del 19%, no se resta el 19%. Restarlo da un resultado menor al correcto, porque el porcentaje se calculó sobre el neto y no sobre el total. Es el error de cálculo más común con impuestos.",
            },
            {
                question: "¿Cuál es la tasa de IVA en Chile?",
                answer: "El 19% general, vigente desde 2003 y aplicable a la mayoría de bienes y servicios. Existen exenciones específicas, por ejemplo ciertos servicios educacionales y de salud. La calculadora permite cambiar la tasa para trabajar con otros países o regímenes.",
            },
            {
                question: "¿Por qué al sumar y luego restar el porcentaje no vuelvo al precio inicial?",
                answer: "Porque los dos porcentajes se calculan sobre bases distintas. El 19% que sumas se calcula sobre el neto; el 19% que restas se calcularía sobre el total, que es mayor. Por eso la operación inversa es una división, no una resta.",
            },
            {
                question: "¿Los cálculos se envían a algún servidor?",
                answer: "No. Toda la aritmética ocurre en tu navegador y ninguna cifra sale de tu equipo. Puedes usarla con montos reales de tu negocio sin que queden registrados en ningún lado, ni siquiera de forma temporal.",
            },
        ],
    },

    subredes: {
        intro:
            "Dividir una red en subredes es aritmética binaria disfrazada de decimal, y ahí es donde se cometen los errores. Esta calculadora toma una dirección con su prefijo y devuelve máscara, dirección de red, broadcast, rango utilizable y cuántos hosts caben, además de la representación binaria que hace evidente por qué el corte cae donde cae. Funciona con IPv4 e IPv6.",
        steps: [
            {
                title: "Introduce la dirección con prefijo",
                body: "En notación CIDR, por ejemplo 192.168.1.0/24. El número tras la barra indica cuántos bits pertenecen a la red y cuántos quedan para los hosts.",
            },
            {
                title: "Lee el rango utilizable",
                body: "No es el rango completo: la primera dirección identifica la red y la última es el broadcast. Ninguna de las dos se puede asignar a un equipo en IPv4.",
            },
            {
                title: "Revisa la vista binaria",
                body: "Es donde se ve el corte real. Un /26 parece arbitrario en decimal, pero en binario queda claro que parte el último octeto en cuatro bloques de 64.",
            },
        ],
        useCases: [
            {
                title: "Segmentar una red de oficina",
                body: "Separar servidores, equipos de trabajo e invitados en subredes distintas para que un dispositivo comprometido en la red de visitas no vea la red interna.",
            },
            {
                title: "Planificar direccionamiento en la nube",
                body: "Las VPC exigen definir el bloque CIDR por adelantado, y ampliarlo después suele ser imposible. Calcular bien el tamaño evita quedarse sin direcciones a mitad de proyecto.",
            },
            {
                title: "Estudiar para certificaciones",
                body: "La vista binaria convierte el subneteo de una regla memorizada en algo que se entiende, que es la diferencia entre aprobar y aprobar sabiendo por qué.",
            },
        ],
        faq: [
            {
                question: "¿Cuántos hosts caben en una red /24?",
                answer: "254 hosts utilizables. Un /24 deja 8 bits para hosts, lo que da 256 direcciones, pero la primera identifica la red y la última es el broadcast, así que ninguna de esas dos se asigna a un equipo.",
            },
            {
                question: "¿Qué significa el número después de la barra en CIDR?",
                answer: "Cuántos bits, desde la izquierda, pertenecen a la porción de red. En un /24 los primeros 24 bits identifican la red y los 8 restantes los hosts. Cuanto mayor el número, más pequeña la subred y menos direcciones disponibles.",
            },
            {
                question: "¿Por qué IPv6 no tiene dirección de broadcast?",
                answer: "IPv6 eliminó el broadcast y lo reemplazó por multicast, que envía solo a los equipos suscritos en lugar de a todos. Por eso en IPv6 sí se puede usar la última dirección del rango, a diferencia de IPv4.",
            },
            {
                question: "¿Qué rangos de IP son privados?",
                answer: "En IPv4: 10.0.0.0/8, 172.16.0.0/12 y 192.168.0.0/16. No se enrutan por internet, así que se pueden reutilizar dentro de cualquier red local. En IPv6 el rango equivalente para direcciones únicas locales es fc00::/7.",
            },
        ],
    },

    binario: {
        intro:
            "Todo texto es, por debajo, una secuencia de números, y cada número una secuencia de bits. Este traductor convierte texto a código binario y de vuelta, mostrando la correspondencia carácter a carácter. Sirve para entender qué está pasando bajo la superficie, para resolver ejercicios y para descifrar esas cadenas de ceros y unos que aparecen en juegos y acertijos.",
        steps: [
            {
                title: "Elige la dirección",
                body: "De texto a binario, o de binario a texto. La herramienta acepta los bloques separados por espacios, que es como se suelen escribir.",
            },
            {
                title: "Escribe o pega",
                body: "La conversión es inmediata. Cada carácter se traduce a 8 bits, que es lo que ocupa un carácter ASCII básico.",
            },
            {
                title: "Copia el resultado",
                body: "Si conviertes de binario a texto, revisa que los bloques tengan 8 dígitos: un bloque incompleto produce un carácter equivocado o ninguno.",
            },
        ],
        useCases: [
            {
                title: "Aprender cómo funciona la codificación",
                body: "Ver que la letra A es 01000001 hace concreto algo que en abstracto cuesta: que los caracteres son números y los números son bits.",
            },
            {
                title: "Resolver acertijos y CTF",
                body: "Las cadenas binarias aparecen constantemente en retos de seguridad y juegos de ingenio. Traducirlas rápido ahorra el paso manual de convertir a mano.",
            },
            {
                title: "Verificar ejercicios de clase",
                body: "Comprobar una conversión hecha a mano antes de entregarla, que es más útil que descubrir el error cuando ya está corregido.",
            },
        ],
        faq: [
            {
                question: "¿Por qué cada carácter ocupa 8 bits?",
                answer: "Porque un byte son 8 bits y ASCII asigna un byte por carácter, lo que permite 256 combinaciones. Los caracteres con acento y los emoji necesitan más de un byte bajo UTF-8, así que su representación binaria es más larga.",
            },
            {
                question: "¿Cómo se convierte una letra a binario?",
                answer: "Se busca su código numérico y se pasa ese número a base 2. La letra A tiene código 65, que en binario es 01000001. La herramienta hace ambos pasos, pero conocerlos ayuda a detectar cuándo un resultado no cuadra.",
            },
            {
                question: "¿Es lo mismo binario que código máquina?",
                answer: "No exactamente. Todo el código máquina es binario, pero no todo binario es código máquina: aquí se representan caracteres de texto, no instrucciones de procesador. Un mismo patrón de bits significa cosas distintas según cómo se interprete.",
            },
            {
                question: "¿Qué pasa con los acentos y las eñes?",
                answer: "Ocupan más de 8 bits porque UTF-8 los codifica con dos bytes. Al convertirlos verás bloques adicionales. Si esperabas un bloque por carácter y aparecen dos, es exactamente eso y no un error de la conversión.",
            },
        ],
    },

    unidades: {
        intro:
            "Un conversor de unidades sirve de poco si solo escupe un número. Este convierte longitud, velocidad, masa y otras magnitudes, y además explica la relación entre las unidades: cuántos metros hay en una milla náutica y por qué, o qué distancia recorre la luz en un segundo. La idea es que salgas sabiendo la equivalencia, no habiéndola consultado.",
        steps: [
            {
                title: "Elige la magnitud",
                body: "Longitud, velocidad, masa, tiempo. Cada magnitud agrupa solo unidades compatibles entre sí, para que no puedas convertir kilos a kilómetros.",
            },
            {
                title: "Introduce el valor",
                body: "La conversión se actualiza mientras escribes, en todas las unidades de esa magnitud a la vez, no solo en la que elegiste como destino.",
            },
            {
                title: "Lee la explicación",
                body: "Junto al resultado aparece de dónde sale la equivalencia. Es lo que diferencia convertir de entender qué acabas de convertir.",
            },
        ],
        useCases: [
            {
                title: "Trabajar con documentación en otras unidades",
                body: "Especificaciones técnicas en pulgadas, velocidades en nudos, potencias en caballos de fuerza. Convertir sin salir a buscar la tabla cada vez.",
            },
            {
                title: "Cocinar con recetas extranjeras",
                body: "Onzas, tazas y grados Fahrenheit traducidos a gramos, mililitros y Celsius, que es donde se arruinan las recetas importadas.",
            },
            {
                title: "Estudiar física o astronomía",
                body: "Años luz, unidades astronómicas y pársecs puestos en escala con distancias cotidianas, que es lo que hace que las cifras signifiquen algo.",
            },
        ],
        faq: [
            {
                question: "¿Cuántos metros tiene una milla náutica?",
                answer: "Exactamente 1.852 metros. No es una cifra arbitraria: equivale a un minuto de arco de latitud sobre la superficie terrestre, que es precisamente por qué se adoptó para navegación marítima y aérea.",
            },
            {
                question: "¿Qué distancia recorre la luz en un año?",
                answer: "Unos 9,46 billones de kilómetros, es decir 9,46 seguido de doce ceros. Un año luz mide distancia, no tiempo, aunque el nombre confunda: es lo que recorre la luz en un año a 299.792 kilómetros por segundo.",
            },
            {
                question: "¿Por qué una pulgada mide 2,54 centímetros exactos?",
                answer: "Porque en 1959 un acuerdo internacional fijó esa equivalencia por definición, no por medición. Antes cada país usaba pulgadas ligeramente distintas, lo que causaba problemas reales en manufactura e ingeniería entre fabricantes.",
            },
            {
                question: "¿La conversión ocurre en mi navegador?",
                answer: "Sí. Los factores de conversión están en el propio código de la página y el cálculo no consulta ningún servicio externo. La herramienta sigue funcionando sin conexión una vez que la página cargó.",
            },
        ],
    },

    aleatorio: {
        intro:
            "Elegir al azar delante de otras personas exige que el método sea visible, no solo justo. Esta herramienta sortea con una ruleta animada y también forma grupos aleatorios a partir de una lista. El resultado sale del generador criptográfico del navegador, no de un pseudoaleatorio predecible, y la animación existe para que quien mira acepte el resultado.",
        steps: [
            {
                title: "Carga los participantes",
                body: "Un nombre por línea. Puedes pegar una lista completa desde una planilla sin tener que reformatearla.",
            },
            {
                title: "Elige el modo",
                body: "Ruleta para sacar un ganador único. Grupos para repartir a todos en equipos del tamaño que definas.",
            },
            {
                title: "Gira y comparte",
                body: "El resultado queda a la vista para capturarlo. Si repites el sorteo, el anterior no queda registrado en ningún lado.",
            },
        ],
        useCases: [
            {
                title: "Sorteos en redes sociales",
                body: "Pegar la lista de participantes y girar en vivo. La animación hace la elección presenciable, que es lo que evita las acusaciones de arreglo.",
            },
            {
                title: "Formar equipos en clase",
                body: "Repartir un curso en grupos sin que se junten siempre los mismos, y sin que nadie pueda decir que el profesor eligió.",
            },
            {
                title: "Decidir turnos",
                body: "Quién presenta primero, quién revisa el código, quién se queda de guardia. Aleatorio y a la vista de todos zanja la discusión.",
            },
        ],
        faq: [
            {
                question: "¿El sorteo es realmente aleatorio?",
                answer: "Usa la API criptográfica del navegador, que es la misma fuente de aleatoriedad empleada para generar claves. No es un pseudoaleatorio sembrado con la hora, así que el resultado no se puede predecir ni reproducir conociendo el momento del sorteo.",
            },
            {
                question: "¿Se guardan los participantes o los resultados?",
                answer: "No. La lista vive solo en la memoria de tu navegador mientras la pestaña está abierta y desaparece al cerrarla. Nada se envía a un servidor, así que no queda registro del sorteo en ningún lado.",
            },
            {
                question: "¿Puedo repetir el sorteo si no me gusta el resultado?",
                answer: "Técnicamente sí, pero repetir hasta obtener el resultado deseado anula la aleatoriedad. Si el sorteo es público, conviene anunciar de antemano que vale el primer giro: es lo que hace que el resultado sea aceptado.",
            },
            {
                question: "¿Cuántos participantes admite?",
                answer: "No hay un límite fijado por la herramienta. Con listas de varios miles la animación se vuelve menos legible, pero el sorteo sigue siendo correcto. Para listas muy grandes el modo de grupos resulta más práctico que la ruleta.",
            },
        ],
    },

    enlaces: {
        intro:
            "Un enlace de WhatsApp bien formado abre una conversación con un número que el destinatario no necesita tener guardado, y puede incluso llevar el mensaje ya escrito. Este generador construye ese enlace y también los de correo con asunto y cuerpo predefinidos, y los de evento de calendario. Todos son enlaces estándar: no pasan por ningún intermediario ni acortador.",
        steps: [
            {
                title: "Elige el tipo",
                body: "WhatsApp, correo o evento de calendario. Cada uno pide campos distintos porque cada protocolo acepta parámetros distintos.",
            },
            {
                title: "Completa los campos",
                body: "Para WhatsApp usa el número con código de país y sin signos ni espacios. Es el error más frecuente y hace que el enlace no abra nada.",
            },
            {
                title: "Copia y prueba",
                body: "Ábrelo tú primero antes de publicarlo. Un enlace mal formado falla en silencio: no da error, simplemente no ocurre nada al pulsarlo.",
            },
        ],
        useCases: [
            {
                title: "Botón de contacto en una web",
                body: "Un enlace que abre WhatsApp con un mensaje inicial ya escrito baja la fricción de escribir el primer mensaje, que es donde se pierden las consultas.",
            },
            {
                title: "Campañas con mensaje predefinido",
                body: "Que todos los interesados lleguen escribiendo el mismo texto permite identificar de qué campaña vinieron sin pedirle nada al usuario.",
            },
            {
                title: "Invitaciones a eventos",
                body: "Un enlace que agrega el evento al calendario con fecha, hora y descripción ya rellenadas, en lugar de esperar que cada asistente lo copie a mano.",
            },
        ],
        faq: [
            {
                question: "¿Cómo se escribe el número para un enlace de WhatsApp?",
                answer: "Con código de país y sin signo más, sin espacios, sin guiones ni paréntesis. Para Chile, un número móvil queda como 56912345678. Cualquier símbolo intermedio hace que el enlace no abra la conversación, sin mostrar error alguno.",
            },
            {
                question: "¿Hace falta tener el contacto guardado?",
                answer: "No, y esa es la utilidad principal. El enlace abre la conversación directamente con ese número aunque no esté en la agenda de ninguna de las dos partes, que es lo que permite usarlo como botón de contacto público.",
            },
            {
                question: "¿El enlace pasa por algún servidor intermedio?",
                answer: "No. Se genera en tu navegador y apunta directo al dominio oficial de WhatsApp. No hay acortador ni redirección propia, así que no hay nada que pueda caerse, cobrar o dejar de funcionar más adelante.",
            },
            {
                question: "¿Se puede predefinir el mensaje?",
                answer: "Sí, y viaja en el propio enlace. El destinatario lo verá escrito en el campo de texto, listo para enviar, pero puede modificarlo antes: es una sugerencia, no un mensaje enviado automáticamente en su nombre.",
            },
        ],
    },
    dns: {
        intro:
            "Cuando cambias un registro DNS, el cambio no llega a todo el mundo al mismo tiempo: cada resolutor guarda la respuesta anterior hasta que expira su TTL. Este verificador consulta el dominio desde servidores de distintas regiones y muestra qué responde cada uno, que es la única forma de saber si la propagación terminó o si aún hay resolutores sirviendo lo viejo.",
        steps: [
            {
                title: "Escribe el dominio",
                body: "Sin http ni barras, solo el nombre. Puedes consultar también subdominios concretos si el registro que cambiaste no es el raíz.",
            },
            {
                title: "Elige el tipo de registro",
                body: "A para IPv4, AAAA para IPv6, MX para correo, TXT para verificaciones y SPF, CNAME para alias. Cada uno propaga por separado.",
            },
            {
                title: "Compara las respuestas",
                body: "Si todos los servidores coinciden, la propagación terminó. Si difieren, aún hay cachés con el valor antiguo y toca esperar a que expire su TTL.",
            },
        ],
        useCases: [
            {
                title: "Confirmar una migración de servidor",
                body: "Tras apuntar el dominio a una IP nueva, saber si el tráfico ya llega al servidor nuevo o si parte de los usuarios sigue golpeando el viejo.",
            },
            {
                title: "Depurar entrega de correo",
                body: "Los registros MX, SPF y DKIM mal propagados hacen que el correo rebote o caiga en spam. Verlos desde varias regiones señala si el problema es de propagación o de configuración.",
            },
            {
                title: "Validar verificaciones de dominio",
                body: "Muchos servicios piden un registro TXT para probar que el dominio es tuyo. Comprobar que ya es visible evita reintentar la verificación a ciegas.",
            },
        ],
        faq: [
            {
                question: "¿Cuánto tarda en propagarse un cambio de DNS?",
                answer: "Depende del TTL que tenía el registro anterior, no del nuevo. Si el TTL era de 24 horas, algunos resolutores servirán el valor viejo hasta un día completo. Bajar el TTL antes de un cambio planificado acorta mucho la espera.",
            },
            {
                question: "¿Qué es el TTL de un registro DNS?",
                answer: "El tiempo en segundos que un resolutor puede guardar la respuesta antes de volver a preguntar. Un TTL alto reduce consultas y mejora rendimiento; uno bajo hace que los cambios se propaguen rápido. Se suele bajar días antes de una migración.",
            },
            {
                question: "¿Por qué mi dominio funciona en un lugar y en otro no?",
                answer: "Porque cada resolutor tiene su propia caché con su propio vencimiento. Unos ya pidieron el valor nuevo y otros aún sirven el guardado. No es un error: es cómo funciona el DNS, y se resuelve esperando a que expiren los TTL.",
            },
            {
                question: "¿Puedo forzar la propagación?",
                answer: "No globalmente. Puedes limpiar tu caché local y la de tu resolutor, pero no la del resto del mundo. Lo único que acelera de verdad una migración es haber bajado el TTL con antelación, antes de hacer el cambio.",
            },
        ],
    },

    nginx: {
        intro:
            "La mayoría de los fallos de configuración de Nginx no son errores de sintaxis, sino directivas puestas en el bloque equivocado o un orden de location que hace que la regla correcta nunca se evalúe. Este generador arma configuraciones para los casos habituales — redirecciones, HTTPS, cabeceras de seguridad, proxy inverso — con la estructura ya correcta, y también genera el equivalente en .htaccess.",
        steps: [
            {
                title: "Elige qué necesitas",
                body: "Redirección de dominio, forzar HTTPS, servir una SPA, proxy a un backend, cabeceras de seguridad. Cada opción genera el bloque completo.",
            },
            {
                title: "Rellena dominio y destino",
                body: "Los valores se insertan en la plantilla. Revisa las rutas de certificados: dependen de cómo los emitiste y son la causa habitual de que no arranque.",
            },
            {
                title: "Prueba antes de recargar",
                body: "Ejecuta nginx -t en el servidor. Valida la sintaxis sin aplicar nada, y evita dejar el servicio caído por una llave sin cerrar.",
            },
        ],
        useCases: [
            {
                title: "Migrar un dominio conservando el SEO",
                body: "Una redirección 301 traspasa la autoridad del dominio antiguo al nuevo. Una 302 no, y es el error que hace perder posiciones tras una migración.",
            },
            {
                title: "Poner una aplicación tras un proxy inverso",
                body: "Servir una app de Node por el puerto 443 con TLS terminado en Nginx, que es la disposición estándar y evita exponer el puerto de la app.",
            },
            {
                title: "Endurecer cabeceras",
                body: "HSTS, X-Content-Type-Options y una política de referrer sensata son tres líneas que cierran varias clases de ataque de una sola vez.",
            },
        ],
        faq: [
            {
                question: "¿Cuál es la diferencia entre redirección 301 y 302?",
                answer: "La 301 es permanente y traspasa la autoridad de enlaces al destino; la 302 es temporal y no la traspasa. Para migraciones de dominio o cambios de URL definitivos siempre 301: usar 302 hace perder posicionamiento acumulado.",
            },
            {
                question: "¿Por qué mi bloque location no se aplica?",
                answer: "Casi siempre por el orden de evaluación. Nginx prioriza las coincidencias exactas y los prefijos con el modificador ^~ antes que las expresiones regulares, y entre regex gana la primera que coincide. Una regla general puesta arriba puede capturar todo.",
            },
            {
                question: "¿Cómo compruebo la configuración antes de aplicarla?",
                answer: "Con nginx -t, que valida la sintaxis y las rutas de archivos sin recargar el servicio. Si pasa, nginx -s reload aplica los cambios sin cortar conexiones activas. Recargar sin probar es cómo se dejan servidores caídos.",
            },
            {
                question: "¿La configuración generada sirve para producción?",
                answer: "Es un punto de partida correcto, no una configuración auditada para tu caso. Revisa siempre las rutas de certificados, los límites de tamaño de petición y las cabeceras según lo que sirva tu aplicación antes de ponerla en producción.",
            },
        ],
    },

    metadatos: {
        intro:
            "Una foto tomada con el móvil suele llevar dentro mucho más que la imagen: modelo de cámara, ajustes, fecha exacta y, con frecuencia, las coordenadas GPS del lugar donde se tomó. Esta herramienta lee esos metadatos EXIF y permite eliminarlos antes de publicar. El análisis ocurre en tu navegador, que es la única forma sensata de revisar la privacidad de una foto propia.",
        steps: [
            {
                title: "Suelta la imagen",
                body: "JPEG y TIFF son los formatos que más metadatos guardan. PNG almacena menos, y algunas redes sociales los eliminan al subir, pero no todas.",
            },
            {
                title: "Revisa lo que aparece",
                body: "Presta atención a las coordenadas GPS y a la fecha. Son los dos campos que revelan más de lo que la gente cree al compartir una foto.",
            },
            {
                title: "Descarga la versión limpia",
                body: "La imagen resultante es visualmente idéntica pero sin metadatos. Esa es la que conviene publicar si la foto se tomó en tu casa o en la de alguien.",
            },
        ],
        useCases: [
            {
                title: "Publicar fotos sin revelar dónde vives",
                body: "Una foto de un objeto en venta tomada en casa puede llevar las coordenadas exactas de tu domicilio. Limpiarla antes de subirla evita ese problema.",
            },
            {
                title: "Verificar el origen de una imagen",
                body: "La fecha y el modelo de cámara ayudan a contrastar si una foto es lo que dice ser, o si fue tomada en otro momento del que se afirma.",
            },
            {
                title: "Preparar material para entregar",
                body: "Limpiar metadatos de imágenes que van a un cliente o a un informe evita filtrar información del equipo, del software o de la ubicación de trabajo.",
            },
        ],
        faq: [
            {
                question: "¿Qué información guarda una foto sin que yo lo sepa?",
                answer: "Modelo de cámara o teléfono, apertura, velocidad de obturación, ISO, fecha y hora exactas, orientación y, si el GPS estaba activo, latitud y longitud con precisión de metros. Algunos dispositivos añaden también el número de serie del equipo.",
            },
            {
                question: "¿Las redes sociales eliminan los metadatos?",
                answer: "Las grandes suelen quitarlos al procesar la imagen, pero no todas y no siempre. Servicios de mensajería, gestores de archivos y correo frecuentemente los conservan intactos. No conviene delegar la privacidad en el comportamiento de un tercero.",
            },
            {
                question: "¿Se pierde calidad al quitar los metadatos?",
                answer: "No. Los metadatos son un bloque de información separado de los píxeles, así que eliminarlos no recomprime ni altera la imagen. El archivo resultante pesa incluso un poco menos y se ve exactamente igual.",
            },
            {
                question: "¿Se sube mi foto a algún servidor?",
                answer: "No. La lectura y el borrado ocurren en tu navegador mediante la API FileReader, y la imagen no sale de tu equipo. Es un requisito, no un detalle: enviar a un servidor una foto para comprobar su privacidad sería contradictorio.",
            },
        ],
    },
    "convertir-imagen": {
        intro:
            "El formato de una imagen decide cuánto pesa y dónde se puede usar. WebP pesa bastante menos que JPG con calidad equivalente, PNG conserva transparencia y JPG sigue siendo el que acepta cualquier sistema antiguo. Este conversor pasa entre PNG, JPG, WebP y BMP en el navegador, sin subir el archivo a ningún servidor y sin límite de cantidad.",
        steps: [
            {
                title: "Suelta la imagen",
                body: "Arrastra el archivo o selecciónalo. Se lee localmente con la API del navegador, así que el original nunca sale de tu equipo.",
            },
            {
                title: "Elige el formato de salida",
                body: "WebP para web, PNG si necesitas transparencia, JPG si el destino es un sistema que no acepta nada más moderno.",
            },
            {
                title: "Descarga el resultado",
                body: "Compara el peso antes y después. Si el ahorro es marginal, probablemente la imagen ya estaba optimizada y no vale la pena cambiar de formato.",
            },
        ],
        useCases: [
            {
                title: "Aligerar imágenes de una web",
                body: "Convertir a WebP suele recortar entre un 25% y un 35% del peso frente a JPG, lo que se nota directamente en el tiempo de carga y en Core Web Vitals.",
            },
            {
                title: "Preparar imágenes para impresión",
                body: "Pasar a PNG cuando el archivo va a una imprenta y el JPG original tiene artefactos de compresión visibles en zonas planas o degradados.",
            },
            {
                title: "Compatibilidad con sistemas antiguos",
                body: "Algunos gestores y software de escritorio aún rechazan WebP. Convertir a JPG resuelve el rechazo sin tener que rehacer la imagen.",
            },
        ],
        faq: [
            {
                question: "¿WebP es mejor que JPG?",
                answer: "Para web, casi siempre: pesa entre un 25% y un 35% menos con calidad visual equivalente, y admite transparencia, que JPG no. La excepción son los sistemas antiguos que no lo soportan, cada vez menos frecuentes pero todavía presentes en software de escritorio.",
            },
            {
                question: "¿Convertir de JPG a PNG mejora la calidad?",
                answer: "No. La pérdida de calidad del JPG ya ocurrió y es irreversible; pasarlo a PNG conserva los artefactos existentes y además aumenta el peso. PNG conviene cuando el original ya es PNG o cuando necesitas transparencia, no como intento de recuperación.",
            },
            {
                question: "¿Se sube mi imagen a algún servidor?",
                answer: "No. La conversión usa la API Canvas del navegador, así que el archivo se procesa en tu equipo y nunca se transmite. Puedes comprobarlo desconectando la red antes de convertir: la herramienta sigue funcionando igual.",
            },
            {
                question: "¿Se pierde calidad al convertir entre formatos?",
                answer: "Al pasar a JPG o WebP sí, porque ambos comprimen con pérdida. A PNG no, porque es sin pérdida. Convertir repetidamente entre formatos con pérdida degrada la imagen en cada paso, así que conviene partir siempre del original.",
            },
        ],
    },

    "comprimir-imagen": {
        intro:
            "Las imágenes son casi siempre lo que más pesa en una página, y casi siempre lo que menos se optimiza. Este compresor reduce el tamaño del archivo ajustando la calidad hasta el punto donde la diferencia deja de notarse a simple vista, y te muestra el antes y el después para que decidas tú dónde está ese punto. Todo ocurre en tu navegador.",
        steps: [
            {
                title: "Carga la imagen",
                body: "Verás el peso original de referencia. Sin ese número no hay forma de saber si la compresión valió la pena.",
            },
            {
                title: "Ajusta el nivel",
                body: "Baja la calidad progresivamente y observa la vista previa. El punto útil suele estar entre 70 y 85: por debajo aparecen artefactos en degradados y bordes.",
            },
            {
                title: "Descarga",
                body: "Compara el peso final con el original. Una reducción menor al 20% rara vez justifica el cambio; una del 60% sí, y suele ser invisible.",
            },
        ],
        useCases: [
            {
                title: "Acelerar una web",
                body: "El Largest Contentful Paint casi siempre lo marca una imagen. Comprimir la del hero es la intervención de mayor impacto sobre esa métrica.",
            },
            {
                title: "Adjuntos de correo",
                body: "Muchos servidores rechazan adjuntos sobre cierto tamaño. Comprimir evita tener que subir el archivo a la nube y mandar un enlace.",
            },
            {
                title: "Subir a plataformas con límite",
                body: "Formularios, marketplaces y portales de trámites suelen imponer un máximo por archivo. Comprimir permite cumplirlo sin recortar la imagen.",
            },
        ],
        faq: [
            {
                question: "¿Cuánto se puede comprimir sin que se note?",
                answer: "En fotografías, una calidad del 80% suele reducir el peso a la mitad sin diferencia perceptible. En imágenes con texto, líneas finas o zonas planas de color, los artefactos aparecen antes: ahí conviene no bajar de 90 o usar PNG.",
            },
            {
                question: "¿La compresión es reversible?",
                answer: "No. JPG y WebP comprimen con pérdida: la información descartada no se recupera subiendo la calidad después. Conserva siempre el original en algún lado antes de comprimir, porque el archivo comprimido no se puede deshacer.",
            },
            {
                question: "¿Comprimir cambia las dimensiones de la imagen?",
                answer: "No. Comprimir reduce el peso del archivo manteniendo el mismo alto y ancho en píxeles. Si lo que necesitas es cambiar las dimensiones, esa es otra operación distinta y suele reducir el peso mucho más que ajustar la calidad.",
            },
            {
                question: "¿Se sube mi imagen a algún servidor?",
                answer: "No. La compresión ocurre en tu navegador y el archivo no se transmite en ningún momento. Es lo que permite comprimir fotos personales o material de clientes sin entregárselos a un tercero.",
            },
        ],
    },

    redimensionar: {
        intro:
            "Servir una imagen de 4000 píxeles de ancho en un espacio de 400 desperdicia ancho de banda y tiempo de carga sin ganar nada: el navegador la reduce igual, después de haberla descargado entera. Esta herramienta cambia las dimensiones reales del archivo, con presets para los formatos de YouTube, Instagram y otras plataformas, y mantiene la proporción salvo que le digas lo contrario.",
        steps: [
            {
                title: "Carga la imagen",
                body: "Verás sus dimensiones actuales. Es el dato que determina cuánto margen de reducción tienes antes de que se note.",
            },
            {
                title: "Elige preset o medida propia",
                body: "Los presets cubren los formatos habituales de cada plataforma. Para medidas propias, mantén bloqueada la proporción o la imagen se deformará.",
            },
            {
                title: "Descarga",
                body: "Reducir siempre da buen resultado. Ampliar por encima del tamaño original nunca lo da: no hay información que inventar y el resultado sale borroso.",
            },
        ],
        useCases: [
            {
                title: "Preparar imágenes para web",
                body: "Ajustar cada imagen al tamaño máximo en que se va a mostrar. Es la optimización que más peso ahorra, por encima de cualquier ajuste de calidad.",
            },
            {
                title: "Miniaturas de vídeo",
                body: "YouTube pide 1280x720. Salirse de esa medida hace que la plataforma recorte por su cuenta, casi nunca por donde uno querría.",
            },
            {
                title: "Fotos de perfil",
                body: "Ajustar al cuadrado exacto que pide cada red evita que el recorte automático corte cabezas o deje la cara descentrada.",
            },
        ],
        faq: [
            {
                question: "¿Redimensionar pierde calidad?",
                answer: "Al reducir, prácticamente no: se descarta información sobrante y el resultado se ve nítido. Al ampliar, sí y de forma notoria, porque los píxeles nuevos se interpolan a partir de los existentes. Ampliar más allá del original siempre degrada.",
            },
            {
                question: "¿Qué diferencia hay entre redimensionar y comprimir?",
                answer: "Redimensionar cambia el alto y ancho en píxeles; comprimir mantiene las dimensiones y reduce la calidad de los datos. Para aligerar una imagen web, redimensionar al tamaño real de uso suele ahorrar mucho más peso que ajustar la compresión.",
            },
            {
                question: "¿Por qué se deforma mi imagen al cambiar el tamaño?",
                answer: "Porque el alto y el ancho se modificaron en proporciones distintas. Bloquear la proporción hace que al cambiar una dimensión la otra se ajuste sola. Si necesitas una medida exacta que no respeta la proporción original, recorta antes en vez de deformar.",
            },
            {
                question: "¿Cuál es el tamaño ideal para una imagen de web?",
                answer: "El mismo en que se va a mostrar, multiplicado por dos si quieres que se vea nítida en pantallas de alta densidad. Servir una imagen de 3000 píxeles en un contenedor de 600 desperdicia descarga sin ninguna mejora visual.",
            },
        ],
    },

    "recortar-imagen": {
        intro:
            "Recortar no es solo quitar bordes: es decidir qué mira quien ve la imagen. Este editor recorta con vista previa en vivo y trae los formatos que piden las redes, para que la plataforma no recorte por su cuenta y termine cortando lo importante. El archivo se procesa en tu navegador, así que puedes recortar material privado sin subirlo a ningún lado.",
        steps: [
            {
                title: "Carga la imagen",
                body: "Aparece con el marco de recorte encima. Puedes moverlo y redimensionarlo con el ratón o con gestos táctiles.",
            },
            {
                title: "Elige la proporción",
                body: "Cuadrado para perfiles, 16:9 para portadas, vertical para historias. Fijar la proporción evita entregar una medida que la plataforma vaya a recortar de nuevo.",
            },
            {
                title: "Ajusta y descarga",
                body: "Deja aire alrededor del sujeto principal: muchas plataformas recortan un poco más al generar sus propias miniaturas.",
            },
        ],
        useCases: [
            {
                title: "Fotos de perfil",
                body: "Centrar la cara en el cuadrado exacto que pide la red, en lugar de dejar que el recorte automático decida y descentre.",
            },
            {
                title: "Portadas y banners",
                body: "Las cabeceras tienen proporciones muy anchas. Recortar a medida evita que la plataforma estire la imagen o corte los extremos.",
            },
            {
                title: "Quitar información del fondo",
                body: "Recortar una captura de pantalla para eliminar barras de herramientas, nombres de archivo o datos que no deberían salir publicados.",
            },
        ],
        faq: [
            {
                question: "¿Recortar reduce el peso del archivo?",
                answer: "Sí, porque quedan menos píxeles que almacenar. La reducción es proporcional al área eliminada: recortar a la mitad del área suele dejar el archivo en torno a la mitad, aunque la cifra exacta depende del contenido y del formato.",
            },
            {
                question: "¿Qué proporción usan las redes sociales?",
                answer: "Cuadrado 1:1 para fotos de perfil, 16:9 para portadas y miniaturas de vídeo, y 9:16 vertical para historias y reels. Entregar la proporción correcta evita que la plataforma recorte por su cuenta, que es cuando se pierden partes importantes.",
            },
            {
                question: "¿Se puede deshacer un recorte?",
                answer: "No sobre el archivo ya descargado: los píxeles eliminados no están en él. Conserva el original antes de recortar. Dentro del editor sí puedes reajustar el marco todas las veces que quieras antes de descargar.",
            },
            {
                question: "¿Se sube mi imagen a algún servidor?",
                answer: "No. El recorte ocurre en tu navegador mediante la API Canvas y el archivo nunca se transmite. Es lo que permite recortar documentos, capturas con datos o fotos personales sin entregarlos a un servicio externo.",
            },
        ],
    },
    "quitar-fondo": {
        intro:
            "Recortar un fondo a mano con una herramienta de selección lleva minutos y el pelo siempre queda mal. Este removedor usa un modelo de segmentación que corre dentro de tu navegador para separar el sujeto del fondo y devolver un PNG con transparencia. La primera vez descarga el modelo, que pesa; a partir de ahí funciona sin conexión y sin subir tus imágenes a ningún servidor.",
        steps: [
            {
                title: "Carga la imagen",
                body: "Funciona mejor con un sujeto claramente separado del fondo. Contra un fondo del mismo color y textura que el sujeto, cualquier modelo falla.",
            },
            {
                title: "Espera el procesado",
                body: "La primera ejecución descarga el modelo y tarda más. Las siguientes son rápidas porque el modelo queda en caché del navegador.",
            },
            {
                title: "Descarga el PNG",
                body: "Sale con transparencia real, no con fondo blanco. Si necesitas fondo de color, ponlo después en cualquier editor sin perder el recorte.",
            },
        ],
        useCases: [
            {
                title: "Fotos de producto",
                body: "Catálogos y marketplaces piden fondo blanco o transparente uniforme. Recortar el fondo homogeneiza fotos tomadas en sitios distintos.",
            },
            {
                title: "Firmas escaneadas",
                body: "Una firma sobre papel escaneada queda con fondo gris. Quitarlo permite superponerla sobre un documento sin el recuadro delator.",
            },
            {
                title: "Composiciones y montajes",
                body: "Aislar un sujeto para colocarlo sobre otro fondo, que es el paso que consume la mayor parte del tiempo en cualquier montaje.",
            },
        ],
        faq: [
            {
                question: "¿Se suben mis imágenes a algún servidor?",
                answer: "No. El modelo de segmentación se descarga a tu navegador y la imagen se procesa localmente. Es más lento que un servicio en la nube, pero significa que fotos de clientes o material confidencial nunca salen de tu equipo.",
            },
            {
                question: "¿Por qué la primera vez tarda tanto?",
                answer: "Porque descarga el modelo de segmentación, que pesa varios megabytes. Queda en caché del navegador, así que las imágenes siguientes se procesan en segundos y la herramienta funciona incluso sin conexión.",
            },
            {
                question: "¿Funciona bien con pelo y bordes finos?",
                answer: "Razonablemente, aunque es donde todo modelo de segmentación sufre. Con buen contraste entre el pelo y el fondo el resultado suele ser usable directamente; con fondos oscuros y pelo oscuro conviene retocar los bordes después en un editor.",
            },
            {
                question: "¿El resultado tiene transparencia real?",
                answer: "Sí, se exporta como PNG con canal alfa. No es un fondo blanco simulado: puedes superponerlo sobre cualquier color o imagen y no aparecerá un recuadro. Por eso el formato de salida es PNG y no JPG, que no admite transparencia.",
            },
        ],
    },

    "marca-agua": {
        intro:
            "Una marca de agua no impide que copien tu imagen, pero deja constancia de su origen cuando circula sin crédito. Esta herramienta superpone texto o un logo con control de posición, tamaño, rotación y opacidad, y aplica el resultado en tu navegador. Puedes ajustar la transparencia hasta el punto donde la marca se lee sin arruinar la imagen.",
        steps: [
            {
                title: "Carga la imagen base",
                body: "Es la que recibirá la marca. Se procesa localmente, así que puedes marcar material que aún no has publicado.",
            },
            {
                title: "Elige texto o logo",
                body: "El texto sirve para firmas y avisos de copyright. Un logo en PNG con transparencia queda mejor integrado que uno con fondo sólido.",
            },
            {
                title: "Ajusta posición y opacidad",
                body: "Entre 30% y 50% suele ser el rango útil: visible pero sin tapar. Una esquina es discreta; el centro es difícil de recortar pero molesta más.",
            },
        ],
        useCases: [
            {
                title: "Proteger fotografía propia",
                body: "Firmar las imágenes antes de publicarlas en redes o portafolios, para que el crédito viaje con la foto aunque la compartan sin mencionarte.",
            },
            {
                title: "Documentos con aviso",
                body: "Marcar un PDF exportado como imagen con BORRADOR o CONFIDENCIAL, para que nadie lo confunda con la versión final.",
            },
            {
                title: "Muestras para clientes",
                body: "Enviar previsualizaciones marcadas antes del pago, y entregar la versión limpia una vez cerrado el trabajo.",
            },
        ],
        faq: [
            {
                question: "¿Dónde conviene poner la marca de agua?",
                answer: "Depende de qué priorices. En una esquina es discreta pero se recorta en segundos. Sobre el centro del sujeto es muy difícil de quitar pero estropea la imagen. Un patrón repetido a baja opacidad es el término medio más usado en material profesional.",
            },
            {
                question: "¿Se puede quitar una marca de agua?",
                answer: "Con esfuerzo, sí: existen herramientas de relleno generativo que la eliminan con resultados aceptables. Una marca de agua disuade el uso casual y deja rastro del origen, pero no es una protección real contra alguien decidido.",
            },
            {
                question: "¿Qué opacidad conviene usar?",
                answer: "Entre 30% y 50% en la mayoría de los casos. Por debajo del 20% deja de leerse tras una compresión fuerte de la red social; por encima del 60% compite con la imagen y arruina la composición que estás intentando mostrar.",
            },
            {
                question: "¿Se sube mi imagen a algún servidor?",
                answer: "No. La marca se aplica en tu navegador mediante la API Canvas y ni la imagen base ni el logo salen de tu equipo. Es lo que permite marcar material inédito o de clientes sin entregarlo a un tercero primero.",
            },
        ],
    },

    "paleta-colores": {
        intro:
            "Sacar los colores de una imagen a ojo produce valores aproximados que nunca terminan de encajar. Este extractor analiza la imagen y devuelve los colores dominantes en HEX, RGB y HSL, listos para copiar a CSS o a una herramienta de diseño. Sirve para construir una paleta a partir de una fotografía, o para recuperar los colores exactos de una marca a partir de su logo.",
        steps: [
            {
                title: "Carga la imagen",
                body: "Funciona con fotografías, logos y capturas. Cuantos más colores distintos tenga, más interesante resulta la paleta extraída.",
            },
            {
                title: "Revisa los colores dominantes",
                body: "Se ordenan por presencia en la imagen. El primero no siempre es el que uno percibe como principal: los fondos ocupan mucha superficie.",
            },
            {
                title: "Copia en el formato que necesites",
                body: "HEX para CSS, RGB si vas a manipular transparencia, HSL si quieres generar variantes más claras o más oscuras de forma controlada.",
            },
        ],
        useCases: [
            {
                title: "Paleta a partir de una foto",
                body: "Construir el esquema de color de una web o una presentación desde una imagen de referencia, en vez de elegir colores sueltos que luego no combinan.",
            },
            {
                title: "Recuperar colores de marca",
                body: "Cuando existe el logo pero no el manual de marca, extraer los valores exactos evita usar un azul parecido que se nota distinto al lado del original.",
            },
            {
                title: "Ajustar interfaces a una imagen",
                body: "Hacer que botones y acentos de una interfaz combinen con la fotografía de fondo, usando colores que ya están presentes en ella.",
            },
        ],
        faq: [
            {
                question: "¿Qué formato de color conviene usar en CSS?",
                answer: "HEX es el más compacto y el más común. HSL resulta más útil cuando necesitas variantes: subir o bajar la luminosidad de un color es cambiar un número, mientras que en HEX exige recalcular los tres canales a mano.",
            },
            {
                question: "¿Por qué el color dominante no es el que yo veo como principal?",
                answer: "Porque la extracción mide superficie ocupada, no protagonismo visual. Un fondo neutro que cubre el 60% de la imagen sale primero aunque el ojo se fije en el sujeto. Los colores siguientes de la lista suelen ser los que buscas.",
            },
            {
                question: "¿Cuántos colores debería tener una paleta?",
                answer: "Entre tres y cinco para una interfaz: un color principal, uno de acento y dos o tres neutros. Más de eso complica mantener la coherencia, y las paletas amplias tienden a usarse mal cuando el proyecto crece.",
            },
            {
                question: "¿Se sube mi imagen a algún servidor?",
                answer: "No. El análisis lee los píxeles con la API Canvas del navegador y la imagen no se transmite. Puedes extraer colores de material confidencial o de un logo aún no publicado sin exponerlo.",
            },
        ],
    },

    favicon: {
        intro:
            "El favicon dejó de ser un solo archivo hace años: hoy un navegador, un móvil y una app instalada piden tamaños distintos, y faltar uno hace que el icono salga borroso o directamente en blanco. Este generador produce todos los tamaños necesarios a partir de una imagen y los entrega en un ZIP, junto con las etiquetas HTML que hay que pegar.",
        steps: [
            {
                title: "Sube la imagen de origen",
                body: "Cuadrada y de al menos 512 píxeles. Los tamaños pequeños se generan reduciendo, así que partir de algo grande evita bordes sucios.",
            },
            {
                title: "Revisa las previsualizaciones",
                body: "Mira sobre todo el tamaño de 16 píxeles: un logo con detalle fino se convierte ahí en una mancha ilegible y conviene simplificarlo.",
            },
            {
                title: "Descarga el ZIP",
                body: "Incluye todos los tamaños y las etiquetas HTML. Los archivos van en la raíz del sitio, y las etiquetas dentro del head.",
            },
        ],
        useCases: [
            {
                title: "Lanzar un sitio nuevo",
                body: "Resolver de una vez todos los tamaños en vez de descubrir meses después que el icono sale en blanco al guardar la web en un iPhone.",
            },
            {
                title: "Apps instalables",
                body: "Una PWA necesita iconos de 192 y 512 píxeles declarados en el manifiesto, o el sistema operativo usa una captura genérica de la página.",
            },
            {
                title: "Actualizar tras un rediseño",
                body: "Regenerar el juego completo cuando cambia el logo, para que no queden tamaños antiguos mezclados con los nuevos.",
            },
        ],
        faq: [
            {
                question: "¿Qué tamaños de favicon hacen falta?",
                answer: "Los imprescindibles son 16 y 32 píxeles para la pestaña, 180 para el icono de iOS, y 192 y 512 para instalación como aplicación. Un solo archivo de 32 funciona a medias: en móvil y en accesos directos el sistema acaba usando una imagen borrosa.",
            },
            {
                question: "¿Sigue haciendo falta el archivo .ico?",
                answer: "Cada vez menos, pero conviene incluirlo. Los navegadores modernos prefieren PNG declarados en el HTML, aunque algunos aún buscan favicon.ico en la raíz por defecto, y ciertos lectores de feeds y herramientas antiguas solo entienden ese formato.",
            },
            {
                question: "¿Por qué mi favicon se ve borroso?",
                answer: "Casi siempre porque el navegador está escalando un tamaño que no coincide con el que necesita. Servir cada tamaño exacto en lugar de dejar que el navegador reduzca uno grande resuelve el problema de inmediato.",
            },
            {
                question: "¿Por qué no cambia mi favicon tras actualizarlo?",
                answer: "Porque los navegadores lo cachean de forma muy agresiva, a veces durante días. Forzar una recarga completa suele bastar; si no, cambiar el nombre del archivo o añadirle un parámetro de versión en la etiqueta obliga a volver a pedirlo.",
            },
        ],
    },

    "convertir-ico": {
        intro:
            "El formato ICO es un contenedor: un solo archivo que guarda varias resoluciones del mismo icono, para que Windows y los navegadores elijan la que necesitan. Este conversor toma un PNG, JPG o WebP y lo empaqueta como .ico con los tamaños habituales, en el navegador y sin subir nada. Es la pieza que falta cuando un sistema pide específicamente ese formato.",
        steps: [
            {
                title: "Sube la imagen",
                body: "Cuadrada da mejor resultado. Una imagen rectangular se deforma o se recorta al ajustarse a los tamaños cuadrados del formato.",
            },
            {
                title: "Convierte",
                body: "El archivo resultante contiene varias resoluciones. Ese es justamente el punto del formato: un archivo que sirve para todos los contextos.",
            },
            {
                title: "Colócalo en la raíz",
                body: "Como favicon.ico en el directorio raíz del sitio. Muchos navegadores lo buscan ahí por defecto aunque no lo declares en el HTML.",
            },
        ],
        useCases: [
            {
                title: "Favicon clásico",
                body: "Cubrir el archivo que los navegadores piden por defecto, además de los PNG modernos declarados en las etiquetas del head.",
            },
            {
                title: "Iconos de aplicaciones Windows",
                body: "Los ejecutables y accesos directos de Windows usan ICO. Convertir un logo existente evita tener que rehacerlo en un editor de iconos.",
            },
            {
                title: "Compatibilidad con software antiguo",
                body: "Lectores de feeds, gestores de marcadores y herramientas de escritorio que solo reconocen ICO y ignoran los PNG declarados.",
            },
        ],
        faq: [
            {
                question: "¿Qué diferencia hay entre ICO y PNG para un favicon?",
                answer: "ICO es un contenedor con varias resoluciones dentro de un solo archivo; PNG es una sola imagen de un tamaño. Los navegadores modernos prefieren PNG declarados explícitamente, pero ICO sigue siendo el que buscan por defecto en la raíz del sitio.",
            },
            {
                question: "¿El ICO admite transparencia?",
                answer: "Sí, cuando se genera a partir de un PNG con canal alfa. Si conviertes desde un JPG no habrá transparencia, porque ese formato no la soporta y el fondo llega ya aplanado a un color sólido.",
            },
            {
                question: "¿Qué tamaño debe tener la imagen de origen?",
                answer: "Al menos 256 píxeles de lado, y cuadrada. Los tamaños menores se generan reduciendo, así que partir de algo grande da bordes limpios. Ampliar una imagen pequeña antes de convertir no mejora nada: los detalles no existen.",
            },
            {
                question: "¿Se sube mi imagen a algún servidor?",
                answer: "No. La conversión se hace en el navegador y el archivo no se transmite en ningún momento. Puedes convertir el logo de un proyecto que aún no se ha anunciado sin que pase por infraestructura de terceros.",
            },
        ],
    },
    ascii: {
        intro:
            "El arte ASCII convierte una imagen en texto: cada zona de la foto se reemplaza por el carácter cuya densidad visual se parece a ese nivel de brillo. Esta herramienta hace esa traducción con varios juegos de caracteres y opciones de color, y exporta el resultado como texto o como imagen. Sirve para banners de terminal, firmas de correo y por el gusto de ver una foto hecha de letras.",
        steps: [
            {
                title: "Carga la imagen",
                body: "Las de contraste alto y sujeto claro funcionan mejor. Una foto plana de tonos medios se convierte en una masa de caracteres sin forma reconocible.",
            },
            {
                title: "Ajusta ancho y caracteres",
                body: "El ancho es la resolución: más columnas, más detalle y más texto. El juego de caracteres cambia el aspecto, de fino y detallado a grueso y contrastado.",
            },
            {
                title: "Exporta",
                body: "Como texto para pegar en una terminal o un README, o como imagen si vas a publicarlo donde el texto monoespaciado se descuadra.",
            },
        ],
        useCases: [
            {
                title: "Banners de proyecto",
                body: "Un logo en ASCII en el README o en la pantalla de inicio de una herramienta de consola, que es donde una imagen normal no se puede mostrar.",
            },
            {
                title: "Firmas y arte de terminal",
                body: "Decorar el mensaje del día de un servidor o una firma de correo en texto plano, donde solo caben caracteres.",
            },
            {
                title: "Compartir imágenes como texto",
                body: "Pasar una imagen por un canal que solo acepta texto, como algunos chats de terminal o sistemas antiguos, convirtiéndola en caracteres.",
            },
        ],
        faq: [
            {
                question: "¿Qué imágenes quedan bien en ASCII?",
                answer: "Las de contraste alto y un sujeto bien definido: un logo, un rostro, una silueta clara. Las fotografías planas, con muchos tonos medios y sin un foco evidente, se convierten en una masa uniforme de caracteres donde no se distingue nada.",
            },
            {
                question: "¿Por qué se ve descuadrado al pegarlo?",
                answer: "Porque el arte ASCII solo se alinea en una fuente monoespaciada, donde todos los caracteres ocupan el mismo ancho. En una fuente normal cada letra mide distinto y la imagen se deforma. Para publicarlo fuera de una terminal, expórtalo como imagen.",
            },
            {
                question: "¿Qué significa el ancho en caracteres?",
                answer: "Es cuántas columnas de texto tendrá el resultado, y equivale a su resolución. Más ancho da más detalle pero produce bloques enormes de texto. Para una terminal estándar, entre 80 y 120 columnas es el rango que se ve completo sin cortarse.",
            },
            {
                question: "¿Se sube mi imagen a algún servidor?",
                answer: "No. La conversión lee los píxeles con la API Canvas del navegador y la imagen no se transmite. Todo el procesamiento es local, así que puedes convertir cualquier imagen sin que salga de tu equipo.",
            },
        ],
    },

    "banner-ascii": {
        intro:
            "Un banner ASCII es texto grande dibujado con caracteres, del tipo que aparece al conectarse a un servidor o al arrancar una herramienta de consola. Este generador convierte una palabra en ese texto ampliado usando distintas tipografías de caracteres, y lo exporta listo para un mensaje del día, un banner SSH o la cabecera de un script. A diferencia del arte ASCII, parte de texto, no de una imagen.",
        steps: [
            {
                title: "Escribe el texto",
                body: "Las palabras cortas funcionan mejor. Un texto largo produce un banner tan ancho que se corta en la mayoría de las terminales.",
            },
            {
                title: "Elige la tipografía",
                body: "Las hay finas, en bloque y en relieve. La legibilidad cambia mucho: algunas quedan bien con una palabra y se vuelven ilegibles con otra.",
            },
            {
                title: "Exporta",
                body: "Como texto para pegar en un script, o como archivo de configuración listo para el mensaje del día del servidor.",
            },
        ],
        useCases: [
            {
                title: "Mensaje del día de un servidor",
                body: "El texto que aparece al entrar por SSH. Un banner con el nombre del servidor ayuda a no equivocarse de máquina antes de ejecutar un comando.",
            },
            {
                title: "Cabeceras de scripts",
                body: "Un banner al inicio de la salida de un script deja claro qué se está ejecutando cuando hay varios corriendo en la misma terminal.",
            },
            {
                title: "Pantallas de inicio de herramientas CLI",
                body: "El banner que muestra una herramienta de línea de comandos al arrancar, que es su equivalente a un logotipo.",
            },
        ],
        faq: [
            {
                question: "¿En qué se diferencia de convertir una imagen a ASCII?",
                answer: "Este parte de texto y lo dibuja en grande con caracteres; el arte ASCII parte de una imagen y la reconstruye con caracteres según su brillo. Uno sirve para títulos y banners legibles; el otro para representar fotos o logos como texto.",
            },
            {
                question: "¿Cómo pongo un banner en el mensaje de bienvenida de SSH?",
                answer: "Se coloca el texto del banner en el archivo del mensaje del día del sistema, normalmente /etc/motd, o se referencia desde la configuración del servidor SSH. La herramienta exporta el contenido ya listo para pegar en ese archivo.",
            },
            {
                question: "¿Por qué mi banner se ve cortado?",
                answer: "Porque es más ancho que la terminal. Cada tipografía tiene su propio ancho por carácter, y una palabra larga en una fuente grande supera fácilmente las 80 columnas estándar. Usa texto más corto o una tipografía más estrecha.",
            },
            {
                question: "¿Puedo usar acentos y eñes en el banner?",
                answer: "Depende de la tipografía: muchas de las clásicas solo definen el alfabeto inglés básico y los caracteres acentuados salen en blanco o como un signo de interrogación. Si necesitas acentos, prueba primero con la palabra completa antes de darlo por bueno.",
            },
        ],
    },

    esteganografia: {
        intro:
            "La esteganografía esconde un mensaje a plena vista, sin que se note que hay algo escondido. Esta herramienta oculta texto dentro de un emoji usando caracteres Unicode invisibles: el emoji se ve completamente normal, pero arrastra el mensaje pegado. Quien no sepa que está ahí solo verá una carita. No es cifrado, es ocultación: cualquiera que sepa dónde mirar lo recupera.",
        steps: [
            {
                title: "Elige el emoji portador",
                body: "El que se verá a simple vista. Cualquiera sirve: el mensaje va en caracteres invisibles añadidos después, no en el emoji en sí.",
            },
            {
                title: "Escribe el mensaje",
                body: "Se codifica como caracteres invisibles y se adjunta al emoji. El resultado se copia y se pega como cualquier texto normal.",
            },
            {
                title: "Para leer, pega y decodifica",
                body: "El destinatario pega el emoji aquí en modo decodificar y recupera el texto oculto. Sin la herramienta, el mensaje pasa inadvertido.",
            },
        ],
        useCases: [
            {
                title: "Curiosidad y juegos",
                body: "Mandar un mensaje escondido en un emoji por diversión, o montar la pista de una búsqueda del tesoro que solo se revela con la herramienta correcta.",
            },
            {
                title: "Marcar texto de forma invisible",
                body: "Insertar una marca imperceptible en un texto para reconocer después de dónde salió una copia, sin que la marca sea visible al leer.",
            },
            {
                title: "Demostrar cómo funciona la ocultación",
                body: "Enseñar de forma concreta la diferencia entre esconder un mensaje y cifrarlo, que en abstracto se confunden constantemente.",
            },
        ],
        faq: [
            {
                question: "¿La esteganografía es lo mismo que el cifrado?",
                answer: "No. El cifrado hace un mensaje ilegible pero visible: se nota que hay algo protegido. La esteganografía lo esconde para que nadie sospeche que existe, pero quien lo encuentra lo lee tal cual. Para secretos de verdad se combinan: cifrar primero y luego ocultar.",
            },
            {
                question: "¿El mensaje oculto sobrevive al copiar y pegar?",
                answer: "En general sí, porque los caracteres invisibles viajan como parte del texto. Pero algunas plataformas limpian los caracteres Unicode no estándar al pegar, y ahí el mensaje se pierde. Conviene probar en el canal concreto antes de confiarle algo importante.",
            },
            {
                question: "¿Alguien puede darse cuenta de que hay un mensaje oculto?",
                answer: "A simple vista no, pero no es indetectable: el texto ocupa más caracteres de los que aparenta, y quien lo revise con una herramienta que muestre caracteres invisibles lo notará al instante. Es ocultación frente a un observador casual, no frente a un análisis.",
            },
            {
                question: "¿Se envía mi mensaje a algún servidor?",
                answer: "No. La codificación y la decodificación ocurren en tu navegador, así que el texto oculto nunca se transmite. Todo el proceso es local, lo que importa precisamente cuando el punto es que el mensaje no quede registrado en ningún lado.",
            },
        ],
    },

    "esteganografia-imagen": {
        intro:
            "Una imagen se puede modificar tan poco que el ojo no lo nota pero los datos sí cambian. Esta herramienta esconde un mensaje dentro de una imagen PNG con la técnica LSB: altera el último bit de cada color, el que menos peso tiene, para almacenar texto. La imagen se ve idéntica a la original y arrastra el mensaje en su interior. Todo ocurre en tu navegador.",
        steps: [
            {
                title: "Carga una imagen PNG",
                body: "Tiene que ser PNG: comprime sin pérdida, así que los bits que se modifican sobreviven. Un JPG los destruiría al recomprimir y el mensaje se perdería.",
            },
            {
                title: "Escribe el mensaje",
                body: "Cuanto más largo, más píxeles necesita. Una imagen pequeña tiene un límite de cuánto texto puede esconder sin que empiece a notarse.",
            },
            {
                title: "Descarga la imagen resultante",
                body: "Se ve igual que la original. Para leer el mensaje, se vuelve a cargar aquí en modo decodificar; sin la herramienta, la imagen parece normal.",
            },
        ],
        useCases: [
            {
                title: "Aprender cómo funciona la técnica LSB",
                body: "Ver de forma concreta que una imagen aparentemente intacta puede llevar datos escondidos, un concepto central en análisis forense y seguridad.",
            },
            {
                title: "Marcas invisibles",
                body: "Insertar un identificador imperceptible en una imagen para reconocer después de dónde salió una copia filtrada.",
            },
            {
                title: "Retos de seguridad y CTF",
                body: "La esteganografía en imágenes es un clásico de las competiciones de seguridad. Esta herramienta permite crear y resolver ese tipo de pruebas.",
            },
        ],
        faq: [
            {
                question: "¿Qué es la técnica LSB?",
                answer: "LSB significa bit menos significativo: el último bit de cada valor de color, el que menos afecta al tono. Cambiarlo altera el color de forma imperceptible, así que se puede usar ese bit de cada píxel para almacenar el mensaje sin que la imagen se vea distinta.",
            },
            {
                question: "¿Por qué tiene que ser PNG y no JPG?",
                answer: "Porque PNG comprime sin pérdida y conserva cada bit exactamente. JPG comprime con pérdida y recalcula los píxeles al guardar, lo que destruye los bits modificados y con ellos el mensaje. Un JPG con esteganografía LSB no sobrevive a un solo guardado.",
            },
            {
                question: "¿Se nota que la imagen fue modificada?",
                answer: "A simple vista no: los cambios son de un bit por canal, invisibles para el ojo. Pero un análisis estadístico de los bits menos significativos sí revela el patrón. Es ocultación frente a un observador casual, no frente a un examen forense dedicado.",
            },
            {
                question: "¿Cuánto texto cabe en una imagen?",
                answer: "Depende de sus dimensiones: cada píxel almacena unos pocos bits, así que una imagen grande esconde más. Un texto que supere la capacidad no cabe, y forzarlo empezaría a alterar la imagen de forma visible. La herramienta avisa cuando el mensaje no entra.",
            },
        ],
    },

    "reverse-shell": {
        intro:
            "Un reverse shell invierte la dirección de la conexión: en lugar de que tú entres a la máquina, es la máquina la que sale hacia ti, lo que sortea firewalls que bloquean conexiones entrantes pero permiten las salientes. Este generador arma el payload en Bash, Python, PHP, PowerShell y otros, con la IP y el puerto que indiques. Es una herramienta para pentesting autorizado y para practicar en entornos propios.",
        steps: [
            {
                title: "Indica IP y puerto",
                body: "Los de la máquina que va a escuchar, la tuya. El puerto tiene que estar abierto y a la escucha, o la conexión de vuelta no encuentra a nadie.",
            },
            {
                title: "Elige el lenguaje",
                body: "Según lo que haya disponible en la máquina objetivo. Bash y Python casi siempre están; PHP en servidores web; PowerShell en Windows.",
            },
            {
                title: "Pon el listener a la escucha",
                body: "En tu máquina, antes de lanzar el payload, con netcat o similar esperando en el puerto que indicaste. Si no escuchas primero, la conexión se pierde.",
            },
        ],
        useCases: [
            {
                title: "Pruebas de penetración autorizadas",
                body: "Confirmar que una vulnerabilidad permite ejecución remota, dentro de un encargo con permiso explícito y por escrito del dueño del sistema.",
            },
            {
                title: "Laboratorios y práctica",
                body: "Entrenar en máquinas de práctica y plataformas de CTF, donde el objetivo es precisamente aprender a obtener y detectar este tipo de acceso.",
            },
            {
                title: "Entender la defensa",
                body: "Conocer cómo se ve un reverse shell es lo que permite escribir reglas de detección: qué conexiones salientes vigilar y qué patrones marcan alarma.",
            },
        ],
        faq: [
            {
                question: "¿Es legal usar un reverse shell?",
                answer: "Solo contra sistemas propios o con permiso explícito y por escrito del dueño. Usarlo contra un sistema ajeno sin autorización es un delito informático en casi cualquier jurisdicción. La herramienta es para pentesting autorizado y laboratorios de práctica.",
            },
            {
                question: "¿Por qué se llama reverse, al revés?",
                answer: "Porque invierte quién inicia la conexión. En un acceso normal tú te conectas al servidor; en un reverse shell es el servidor el que se conecta a ti. Eso sortea los firewalls, que suelen bloquear conexiones entrantes pero dejan salir las salientes.",
            },
            {
                question: "¿Por qué mi reverse shell no conecta?",
                answer: "Las causas habituales: el listener no está a la escucha en tu máquina, el puerto está bloqueado por un firewall intermedio, o la IP indicada no es alcanzable desde el objetivo. Empieza confirmando que tu listener responde antes de revisar el resto.",
            },
            {
                question: "¿Cómo se detecta un reverse shell?",
                answer: "Vigilando conexiones salientes inesperadas: un servidor web que de pronto abre una conexión a una IP externa por un puerto raro es sospechoso. Las reglas de detección se centran en procesos que no deberían generar tráfico de red haciéndolo.",
            },
        ],
    },
};

export function getToolCopy(slug: string): ToolCopy | undefined {
    return TOOLS_COPY[slug];
}
