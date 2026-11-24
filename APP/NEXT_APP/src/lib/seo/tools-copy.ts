/**
 * Contenido editorial de cada herramienta.
 *
 * Vive separado de `tools-content.ts` (que es metadata: title, description,
 * keywords) porque son cosas distintas y cambian a ritmos distintos: la
 * metadata la gobierna el auditor con reglas de longitud, esto es prosa.
 *
 * FAQ con respuesta directa y límites explícitos. La claridad sirve al lector;
 * ninguna estructura o longitud garantiza una cita en motores de respuesta.
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
            "Este generador crea códigos QR para enlaces, texto, WiFi, contactos, eventos y experiencias de realidad aumentada. Personaliza el diseño y descarga el resultado en PNG o SVG, sin marca de agua. Los datos quedan codificados en el patrón; el QR no caduca por una suscripción. Los enlaces necesitan que su destino siga disponible. En el modo AR, el QR abre el visor de este sitio y los archivos 3D alojados en las URLs que indiques.",
        steps: [
            {
                title: "Elige el tipo de contenido",
                body: "URL es lo más común, pero WiFi ahorra dictar contraseñas, incluso de redes ocultas, y vCard entrega nombre, cargo, teléfonos, correo, web y dirección con un escaneo. El tipo cambia qué campos se piden, no la dificultad.",
            },
            {
                title: "Rellena los datos",
                body: "El código se regenera mientras escribes. Cuanto más texto codifiques, más denso queda el patrón y más difícil resulta escanearlo de lejos o impreso en pequeño.",
            },
            {
                title: "Ajusta diseño y logo",
                body: "Elige un estilo listo o define colores, degradado y la forma de los módulos y los ojos. Mantén el cuerpo oscuro sobre fondo claro: la herramienta avisa si el contraste es bajo. Si agregas un logo, la corrección de errores pasa a H.",
            },
            {
                title: "Descarga en PNG o SVG",
                body: "PNG, de 256 a 2048 píxeles, sirve para pantalla y redes. Para imprimir usa SVG: es vectorial y se amplía a cualquier tamaño sin pixelarse, desde una tarjeta hasta un pendón.",
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
                body: "Un QR de tipo vCard pasa nombre, cargo, teléfono, correo, empresa, web y dirección a la agenda del otro sin que tenga que teclear nada ni transcribir mal un dígito.",
            },
            {
                title: "Invitaciones a eventos",
                body: "Un QR de evento agrega al calendario el título, el lugar, el inicio, el término y la descripción. La hora se guarda en UTC, así cada teléfono la muestra en su zona horaria.",
            },
        ],
        faq: [
            {
                question: "¿Cómo creo un QR con realidad aumentada?",
                answer: "Elige Realidad aumentada, añade una URL HTTPS pública del modelo GLB o glTF y, para iPhone o iPad, un archivo USDZ. Prueba la vista 3D y descarga el QR. La herramienta enlaza un modelo existente: no convierte una fotografía en un objeto 3D. La disponibilidad de AR depende del móvil y de sus servicios.",
            },
            {
                question: "¿Los códigos QR caducan?",
                answer: "El patrón no tiene una fecha de caducidad. Un QR de texto o WiFi conserva los datos que grabaste; un QR de enlace necesita que su destino siga disponible. Los QR de realidad aumentada dependen además del visor /ar de este sitio y del alojamiento del modelo. Comprueba esos destinos antes de imprimir.",
            },
            {
                question: "¿Cuántos caracteres caben en un código QR?",
                answer: "Depende de la corrección de errores y del tipo de texto. En el tamaño máximo, con corrección L, caben 2.953 bytes, o 4.296 caracteres si usas solo mayúsculas, números y unos pocos signos. Con corrección H, la que se usa con logo y la que viene por defecto, el tope baja a 1.273 bytes. Una letra con tilde ocupa dos bytes. Mucho antes del tope, el patrón se vuelve tan denso que cuesta leerlo impreso en pequeño.",
            },
            {
                question: "¿Puedo cambiar el destino después de imprimir el código?",
                answer: "No directamente: el destino está grabado en el patrón. La solución es codificar una URL propia que tú controles y redirigir desde tu servidor. Así cambias el destino sin reimprimir nada, a costa de depender de que esa URL siga viva.",
            },
            {
                question: "¿Se puede escanear un QR de color?",
                answer: "Sí, siempre que haya contraste fuerte entre el patrón y el fondo. La regla práctica: patrón oscuro sobre fondo claro. Invertirlo funciona en cámaras modernas, pero falla en lectores antiguos y en condiciones de poca luz, así que no conviene arriesgarse.",
            },
        ],
    },

    claves: {
        intro:
            "Una contraseña fuerte no es la que resulta difícil de recordar, sino la que resulta cara de adivinar. Este generador crea claves de caracteres al azar, con la longitud y los grupos que definas, o frases de palabras en español que se teclean mejor. Usa el generador criptográfico del navegador y calcula la entropía de cada clave. Nada viaja por la red: la clave se produce en tu equipo y no se registra en ningún lado.",
        steps: [
            {
                title: "Elige caracteres o frase",
                body: "Los caracteres al azar dan más seguridad por cada carácter. Una frase de palabras se recuerda y se teclea mejor, sobre todo en el celular, a cambio de ser más larga.",
            },
            {
                title: "Define la longitud",
                body: "Entre 8 y 128 caracteres, o entre 3 y 12 palabras. Doce caracteres es el mínimo razonable hoy; dieciséis o más para lo que de verdad importa. En frases, cada palabra suma unos 10,5 bits: seis dan unos 63.",
            },
            {
                title: "Elige los tipos de carácter",
                body: "Minúsculas, mayúsculas, números, símbolos, paréntesis y otros signos. La clave lleva al menos uno de cada grupo elegido. Si un sistema rechaza símbolos, compénsalo alargando la clave.",
            },
            {
                title: "Genera, copia y guárdala",
                body: "Ninguna de las claves descartadas queda guardada. Guarda la elegida en un gestor de contraseñas: una clave fuerte anotada en un papel pegado al monitor deja de ser fuerte.",
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
            {
                title: "Contraseña maestra del gestor",
                body: "Es la única que tienes que recordar y teclear tú. Una frase de seis o más palabras al azar se memoriza sin anotarla.",
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
                question: "¿Una frase de palabras es tan segura como una clave de caracteres?",
                answer: "Si las palabras salen al azar, sí, a igual entropía. Aquí cada palabra sale de una lista de 1.451 palabras en español, sin tildes ni ñ, y suma unos 10,5 bits: seis palabras dan unos 63 bits, y el número opcional del 0 al 99 suma algunos más. La cuenta supone que el atacante conoce la lista; la fuerza sale solo del azar.",
            },
            {
                question: "¿Puedo reutilizar una contraseña fuerte en varios sitios?",
                answer: "No. La fortaleza no protege contra la reutilización: si el sitio más débil que la usa filtra su base de datos, esa clave queda expuesta para todos los demás. Una contraseña única por servicio es lo que contiene el daño de una filtración ajena.",
            },
        ],
    },

    base64: {
        intro:
            "Base64 convierte datos binarios en texto imprimible usando 64 caracteres seguros. No es cifrado ni compresión: es una forma de meter una imagen o un archivo por un canal que solo acepta texto, como un correo, un JSON o una hoja de CSS. Aquí puedes codificar y decodificar texto, y convertir una imagen en una data URI, íntegramente en el navegador.",
        steps: [
            {
                title: "Elige el sentido",
                body: "Codificar convierte tu contenido en una cadena Base64. Decodificar hace lo contrario y recupera el original. Texto e imagen van en pestañas separadas; al decodificar acepta Base64 URL (JWT), URL de datos y cabeceras «Basic», y avisa si lo que trae no es texto.",
            },
            {
                title: "Pega el contenido o suelta el archivo",
                body: "Para texto, escribe o pega directamente. Para imágenes, arrastra el archivo: obtendrás la data URI completa, con su prefijo, lista para usar en CSS o HTML. La cadena sola es lo que va después de la coma.",
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
                answer: "No. La imagen se lee con la API FileReader y el texto se convierte con TextEncoder, todo en tu navegador: el archivo nunca sale de tu equipo. Puedes comprobarlo desconectando la red: la herramienta sigue codificando y decodificando con normalidad.",
            },
        ],
    },

    json: {
        intro:
            "JSON mal formateado es ilegible, y el error casi siempre es una coma de más, una comilla simple o una llave sin cerrar. Este formateador indenta la estructura, la colorea por tipo de dato y ubica el error por línea y columna, con una explicación en español. También muestra el JSON como árbol plegable y avisa de lo que JSON.parse cambia sin decir nada: claves repetidas y enteros demasiado grandes para JavaScript. Todo se procesa en tu navegador.",
        steps: [
            {
                title: "Pega el JSON o abre un archivo",
                body: "Da igual si viene en una sola línea o mal indentado. Puedes abrir un archivo de hasta 5 MB; los textos grandes se analizan en segundo plano para que la página no se congele.",
            },
            {
                title: "Lee el resultado",
                body: "Si es válido, verás la estructura indentada y coloreada. Si no, verás la línea, la columna y qué falla: comillas simples, una coma final, un comentario o una llave sin cerrar.",
            },
            {
                title: "Recorre el árbol",
                body: "La vista Árbol muestra cada objeto y arreglo plegable, con sus claves. Sirve para ubicarse en una respuesta larga sin leer cientos de llaves.",
            },
            {
                title: "Copia, minifica o descarga",
                body: "Elige 2 o 4 espacios de indentación. El formato compacto, sin espacios, es el que conviene enviar por la red; el resultado también se descarga como .json.",
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
            {
                title: "Revisar identificadores numéricos largos",
                body: "Algunas APIs y bases de datos usan IDs de 64 bits, más grandes de lo que JavaScript guarda exacto. La herramienta avisa qué número cambiaría y en qué línea está.",
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
                answer: "No. El análisis ocurre íntegramente en tu navegador, así que puedes pegar payloads con datos reales sin que salgan de tu equipo. El límite es de 5 MB por texto o archivo.",
            },
            {
                question: "¿Cuál es la diferencia entre formatear y minificar?",
                answer: "Formatear añade saltos de línea e indentación para que un humano pueda leerlo. Minificar quita todo espacio innecesario para que pese menos al viajar por la red. El contenido es el mismo; solo cambia la presentación, salvo en los casos que la herramienta avisa.",
            },
            {
                question: "¿Por qué cambió un número o desapareció una clave al formatear?",
                answer: "JavaScript guarda exactos los enteros hasta 9.007.199.254.740.991; uno mayor se redondea al leerlo y queda distinto al formatear. Y si un objeto repite una clave, solo queda el último valor. La herramienta avisa de ambos casos con un ejemplo y su línea. Si son identificadores, conviene enviarlos como texto.",
            },
        ],
    },

    jwt: {
        intro:
            "Un JWT son tres bloques separados por puntos: cabecera, payload y firma. Los dos primeros son base64url y cualquiera puede leerlos: no están cifrados, solo codificados. Este decodificador los muestra formateados, traduce iat, exp y nbf a fechas legibles y verifica la firma con tu secreto o tu clave pública, usando WebCrypto. El token y la clave no salen de tu navegador.",
        steps: [
            {
                title: "Pega el token",
                body: "Puedes pegarlo tal como viene en la cabecera Authorization: el prefijo Bearer (con o sin «Authorization:»), las comillas, los espacios y los saltos de línea se quitan solos. Si tiene cinco partes es un JWE, que va cifrado y no se puede leer sin su clave.",
            },
            {
                title: "Revisa la cabecera y el payload",
                body: "La cabecera indica el algoritmo; el payload, quién es el usuario, qué permisos tiene y hasta cuándo vale el token. Las fechas se muestran convertidas, con aviso si expiró o si aún no es válido.",
            },
            {
                title: "Verifica la firma",
                body: "Con HS256, HS384 o HS512 escribe el secreto, en texto o en base64. Con RS, PS o ES pega la clave pública en PEM, como JWK o como JWKS; si el token trae kid, se usa la clave que coincide.",
            },
            {
                title: "Atiende los avisos",
                body: "alg: none significa que el token no está firmado y cualquiera pudo fabricarlo. Si la cabecera trae jku, x5u o jwk, la herramienta no usa esa clave: quien fabrica el token puede poner ahí la suya.",
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
            {
                title: "Comprobar qué clave firmó un token",
                body: "Antes de culpar al código del servidor por un 401, confirmar si el token de pruebas lo firmó la clave que crees o la de otro entorno.",
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
                question: "¿Se envía mi token o mi clave a algún servidor?",
                answer: "No. La decodificación y la verificación ocurren en tu navegador; la firma se comprueba con WebCrypto en la misma pestaña. Esto importa: un token válido o un secreto pegado en un servicio remoto es una credencial entregada a un tercero. Con secretos de producción, lo prudente sigue siendo verificar en tu servidor.",
            },
            {
                question: "¿Qué significa el campo exp?",
                answer: "Es la fecha de expiración en tiempo Unix, es decir segundos transcurridos desde el 1 de enero de 1970. Pasada esa marca el token deja de ser válido y el servidor debe rechazarlo. La herramienta ya la muestra convertida a fecha legible.",
            },
            {
                question: "¿Puedo verificar la firma aquí?",
                answer: "Sí, con HS256/384/512, RS256/384/512, PS256/384/512 y ES256/384/512. Los HS piden el secreto compartido; los demás, la clave pública en PEM (BEGIN PUBLIC KEY), JWK o JWKS. No verifica EdDSA, no descarga claves desde jku ni x5u, y una firma válida no dice si el token expiró: eso se lee en exp.",
            },
        ],
    },
    regex: {
        intro:
            "Una expresión regular es un patrón para buscar dentro de texto. Escribirlas a ciegas es lento y propenso a errores silenciosos: el patrón compila y aun así captura lo que no debía. Este probador usa el motor de JavaScript: resalta cada coincidencia sobre tu texto, lista los grupos capturados, explica qué hace cada parte del patrón y muestra el resultado de un reemplazo. Corre aparte de la página y se corta si tarda más de medio segundo.",
        steps: [
            {
                title: "Escribe el patrón",
                body: "Sin las barras delimitadoras: el campo ya asume que lo que escribes es la expresión. Las banderas g, i, m, s y u se activan aparte.",
            },
            {
                title: "Pega el texto de prueba",
                body: "Hasta 50.000 caracteres. Usa datos reales, no ejemplos inventados: los casos que rompen un patrón casi siempre son los raros, como acentos, espacios dobles o líneas vacías.",
            },
            {
                title: "Revisa grupos y explicación",
                body: "Cada coincidencia aparece con su posición y sus grupos, numerados o con nombre. La explicación desglosa el patrón parte por parte: si extraes el fragmento equivocado, ahí suele verse el paréntesis mal puesto.",
            },
            {
                title: "Prueba el reemplazo",
                body: "Abre el panel de reemplazo y arma el texto nuevo con $1, $<nombre> o $& para la coincidencia completa. Sin la bandera g solo cambia la primera coincidencia.",
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
                answer: "Casi siempre por retroceso catastrófico: cuantificadores anidados como (a+)+ hacen que el motor pruebe una cantidad explosiva de combinaciones antes de rendirse. Aquí la ejecución se corta a los 500 ms y te avisa. La solución es evitar anidar cuantificadores y ser lo más específico posible en cada parte del patrón.",
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
            {
                question: "¿Se envía mi texto a algún servidor?",
                answer: "No. El patrón y el texto de prueba se evalúan en tu navegador. Solo las funciones con IA salen de él: Generar con IA envía la descripción que escribes y Generar ejemplos envía el patrón, nunca el texto de prueba. Ambas tienen un límite de usos.",
            },
        ],
    },

    rut: {
        intro:
            "El RUT chileno termina en un dígito verificador que se calcula con el resto de los números: si uno está mal escrito, el dígito no calza. Esta herramienta revisa un RUT o una lista entera, te dice cuál debería ser el dígito cuando no calza, lo entrega con o sin puntos y genera RUT de prueba para probar formularios. Todo ocurre en tu navegador: los RUT que pegas no se envían a ningún servidor.",
        steps: [
            { title: "Escribe o pega el RUT", body: "Con o sin puntos, con guion o sin él, con la K en mayúscula o minúscula: se lee igual. El resultado aparece mientras escribes." },
            { title: "Revisa una lista si tienes varios", body: "En «Revisar una lista», pega un RUT por línea (hasta 2.000). Verás cuáles son válidos y, en los que no, el dígito que les correspondería." },
            { title: "Copia en el formato que necesitas", body: "Con puntos y guion para mostrarlo, o sin nada para guardarlo en una base de datos. Los válidos de una lista se copian de una vez." },
        ],
        useCases: [
            { title: "Limpiar una planilla", body: "Antes de cargar clientes o trabajadores a un sistema, encontrar los RUT mal digitados de una lista sin revisarlos uno por uno." },
            { title: "Probar un formulario", body: "Generar RUT que pasan la validación para probar un registro o un pago sin usar datos de personas que conoces." },
            { title: "Completar un dígito perdido", body: "Recuperar el dígito verificador cuando solo tienes los números, por ejemplo en un documento antiguo o una lista mal exportada." },
        ],
        faq: [
            { question: "¿Cómo se calcula el dígito verificador del RUT?", answer: "Con el módulo 11: se multiplican los dígitos de derecha a izquierda por 2, 3, 4, 5, 6 y 7 (y se vuelve a empezar), se suman, y al 11 se le resta el resto de dividir esa suma por 11. Si da 11 el dígito es 0, y si da 10 es K." },
            { question: "¿Que el RUT sea válido significa que existe?", answer: "No. Válido quiere decir que el dígito verificador calza con los números, que es lo que se puede revisar sin consultar ninguna base de datos. Para saber a quién pertenece un RUT hay que consultar al SII o al Registro Civil." },
            { question: "¿Los RUT de prueba son de personas reales?", answer: "Son números al azar que cumplen el cálculo del dígito, entre 1.000.000 y 29.999.999. Pueden coincidir con el RUT de alguien, así que úsalos solo para probar sistemas, nunca para identificar a una persona." },
            { question: "¿Se envían los RUT que pego?", answer: "No. La validación es un cálculo que hace tu navegador; la página no guarda ni envía lo que escribes." },
        ],
    },

    "uf-utm": {
        intro:
            "La UF cambia todos los días y la UTM una vez al mes, así que convertir un arriendo, una multa o una cotización a pesos exige el valor del día. Esta herramienta muestra la UF, la UTM, el dólar observado y el euro de hoy, y convierte cualquier monto en los dos sentidos: de UF a pesos, de pesos a UTM o de dólares a UF. Los valores vienen de mindicador.cl, que toma los del Banco Central de Chile y el SII.",
        steps: [
            { title: "Mira los valores de hoy", body: "Arriba están la UF del día, la UTM del mes, el dólar observado y el euro, cada uno con su fecha." },
            { title: "Escribe el monto y su unidad", body: "Por ejemplo, 12,5 en UF o 1.250.000 en pesos chilenos. Se aceptan puntos de miles y coma decimal." },
            { title: "Copia el equivalente", body: "Verás el monto en las otras unidades; cada una tiene su botón para copiar. Los pesos van sin decimales, como se pagan." },
        ],
        useCases: [
            { title: "Arriendos y créditos en UF", body: "Saber cuánto se paga este mes por un arriendo, un dividendo o un plan de salud pactado en UF." },
            { title: "Multas y trámites en UTM", body: "Pasar a pesos una multa o un arancel fijado en UTM, con el valor del mes en curso." },
            { title: "Cotizar en dólares", body: "Convertir una cotización o una compra en dólares a pesos con el dólar observado del día." },
        ],
        faq: [
            { question: "¿De dónde salen los valores?", answer: "De mindicador.cl, un servicio público y gratuito que publica los indicadores del Banco Central de Chile (UF, dólar observado y euro) y del SII (UTM). El sitio los guarda por 30 minutos y los vuelve a pedir con la visita siguiente; si la fuente falla, muestra los últimos que recibió, hasta por tres días." },
            { question: "¿Por qué la UF de hoy es distinta a la de ayer?", answer: "Porque la UF se reajusta cada día según la inflación (IPC) del mes anterior. Entre el día 10 de un mes y el 9 del siguiente sube o baja de a poco, hasta completar esa variación." },
            { question: "¿El dólar observado es el que me cobra el banco?", answer: "No exactamente. El dólar observado es un promedio que publica el Banco Central con las operaciones del día hábil anterior; bancos y casas de cambio cobran su propio precio, normalmente algo mayor." },
            { question: "¿Qué pasa si la fuente no responde?", answer: "La herramienta lo dice y te deja escribir los valores a mano, así el conversor funciona igual. Nunca muestra un valor inventado." },
        ],
    },

    "sueldo-liquido": {
        intro:
            "El sueldo líquido es lo que llega a tu cuenta después de los descuentos legales: AFP, salud, seguro de cesantía e impuesto único. Esta calculadora hace la liquidación de un mes normal con la UF y la UTM de hoy y los parámetros vigentes (comisión de cada AFP, topes imponibles y tabla del impuesto), y también va al revés: te dice qué bruto pedir para recibir un líquido. Cada descuento aparece por separado, con su porcentaje.",
        steps: [
            { title: "Escribe el bruto o el líquido", body: "«Tengo el bruto» calcula lo que recibes; «Quiero un líquido de» calcula el bruto que hay que pactar. Usa el sueldo imponible, sin colación ni movilización." },
            { title: "Elige AFP, salud y contrato", body: "Cada AFP cobra una comisión distinta. En Isapre escribe el precio de tu plan en UF: se descuenta el plan si es mayor que el 7 %. A plazo fijo o por obra, el seguro de cesantía lo paga solo el empleador." },
            { title: "Suma lo no imponible", body: "La colación y la movilización no pagan AFP, salud ni impuesto: se suman tal cual al líquido." },
        ],
        useCases: [
            { title: "Negociar una oferta", body: "Saber cuánto bruto pedir para llegar al líquido que necesitas, antes de aceptar un trabajo." },
            { title: "Revisar tu liquidación", body: "Comparar cada descuento de tu liquidación con el cálculo legal y encontrar diferencias." },
            { title: "Comparar AFP o Isapre", body: "Ver cuánto cambia tu líquido si te cambias a una AFP con menor comisión o a otro plan de salud." },
        ],
        faq: [
            { question: "¿Qué se le descuenta al sueldo bruto?", answer: "El 10 % para tu cuenta de la AFP más la comisión de tu AFP; el 7 % de salud (o el plan de tu Isapre si cuesta más); el 0,6 % del seguro de cesantía si tu contrato es indefinido, y el impuesto único si tu sueldo pasa de 13,5 UTM después de esos descuentos." },
            { question: "¿Qué es el tope imponible?", answer: "Es el máximo sobre el que se calculan la AFP y la salud: 90 UF al mes desde febrero de 2026 (135,2 UF para el seguro de cesantía). Lo que ganes por sobre ese monto no paga cotizaciones, pero sí impuesto." },
            { question: "¿Cómo se calcula el impuesto único?", answer: "Al bruto se le restan la AFP, la salud (hasta 6,3 UF) y el seguro de cesantía. Esa base se ubica en la tabla del SII, que va de exento hasta 13,5 UTM a un 40 % sobre 310 UTM; se multiplica por el factor del tramo y se resta la cantidad a rebajar." },
            { question: "¿El SIS o la reforma de pensiones bajan mi líquido?", answer: "No. El seguro de invalidez y sobrevivencia y el aporte de la reforma de pensiones (Ley 21.735) los paga el empleador, además de tu sueldo." },
            { question: "¿Por qué mi liquidación no calza exacto?", answer: "Porque puede incluir gratificación, horas extra, bonos, APV, préstamos o un anticipo, que esta calculadora no considera. También cambia si tu empleador usa otra UF para el plan de la Isapre." },
        ],
    },

    "boleta-honorarios": {
        intro:
            "Al emitir una boleta de honorarios, una parte del bruto queda retenida para el SII: en 2026 es el 15,25 %, y sube a 16 % en 2027 y a 17 % en 2028 (Ley 21.133). Esta calculadora te dice cuánto recibes de una boleta y, al revés, qué bruto poner para recibir un monto exacto, al peso. Sirve para cotizar un trabajo sin perder la retención y para revisar lo que te pagaron.",
        steps: [
            { title: "Elige qué monto tienes", body: "«Tengo el bruto» si ya sabes el total de la boleta; «Quiero recibir» si sabes cuánto quieres que te llegue." },
            { title: "Escribe el monto", body: "En pesos, con o sin puntos de miles. El resultado aparece al instante." },
            { title: "Revisa el año", body: "Viene con la retención del año en curso. Cámbialo para revisar una boleta antigua o para cotizar un trabajo del próximo año." },
        ],
        useCases: [
            { title: "Cotizar un trabajo", body: "Pedir el bruto que, después de la retención, deja el monto que de verdad quieres cobrar." },
            { title: "Revisar un pago", body: "Comprobar que lo que llegó a tu cuenta corresponde al bruto de la boleta menos la retención." },
            { title: "Planificar el año", body: "Ver cuánto de lo facturado queda retenido para la Operación Renta, donde se pagan tus cotizaciones." },
        ],
        faq: [
            { question: "¿Cuál es la retención de las boletas de honorarios en 2026?", answer: "El 15,25 % del bruto, desde el 1 de enero de 2026. La Ley 21.133 la sube a 16 % en 2027 y a 17 % desde 2028." },
            { question: "¿Cómo calculo el bruto para recibir un monto?", answer: "Se divide el líquido por 0,8475 (que es 1 menos 15,25 %). Por ejemplo, para recibir $500.000 la boleta debe ser de $589.971. La calculadora lo ajusta al peso para que el líquido calce exacto." },
            { question: "¿Quién paga la retención?", answer: "Si la boleta es para una empresa, ella retiene el monto y lo paga al SII. Si es para una persona, que no retiene, la pagas tú como pago provisional al mes siguiente." },
            { question: "¿Para qué se usa lo retenido?", answer: "En la Operación Renta de abril, la retención paga primero tus cotizaciones de salud, pensión y seguros sociales; lo que sobre se descuenta de tu impuesto o se devuelve." },
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
                body: "Verás neto, impuesto y total por separado. Ese desglose es el que va en la factura, no solo la cifra final. En pesos se redondea al peso, como en la boleta: neto + IVA da siempre el total.",
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
            "Dividir una red en subredes es aritmética binaria disfrazada de decimal, y ahí es donde se cometen los errores. Esta calculadora toma una dirección IPv4 con su prefijo y devuelve máscara, wildcard, red, broadcast, rango utilizable y cuántos hosts caben, con la vista binaria que muestra por qué el corte cae donde cae. En IPv6 da el rango del prefijo. Para IPv4 también planifica VLSM: indicas cuántos hosts necesita cada subred y reparte el bloque.",
        steps: [
            {
                title: "Introduce la dirección con prefijo",
                body: "En notación CIDR, por ejemplo 192.168.1.0/24; si pegas una dirección con dos puntos, cambia sola a IPv6. El número tras la barra indica cuántos bits pertenecen a la red y cuántos quedan para los hosts.",
            },
            {
                title: "Lee el rango utilizable",
                body: "No es el rango completo: la primera dirección identifica la red y la última es el broadcast. Ninguna de las dos se puede asignar a un equipo en IPv4. Un /31 se trata como enlace punto a punto (RFC 3021), sin broadcast.",
            },
            {
                title: "Revisa la vista binaria",
                body: "Es donde se ve el corte real. Un /26 parece arbitrario en decimal, pero en binario queda claro que parte el último octeto en cuatro bloques de 64.",
            },
            {
                title: "Planifica con VLSM",
                body: "Escribe la red base y una fila por subred con los hosts que necesita. Verás red, máscara, rango, desperdicio y el espacio que queda libre. Copia la tabla o descárgala en CSV.",
            },
        ],
        useCases: [
            {
                title: "Segmentar una red de oficina",
                body: "Separar servidores, equipos de trabajo e invitados en subredes del tamaño justo con VLSM, para que un dispositivo comprometido en la red de visitas no vea la red interna.",
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
            {
                question: "¿Qué es VLSM y cómo lo calcula esta herramienta?",
                answer: "VLSM es usar máscaras de distinto largo dentro de una misma red, para que cada subred tenga el tamaño que necesita. Aquí se asignan de la más grande a la más chica, cada una alineada a su tamaño, reservando red y broadcast: un enlace de 2 hosts queda en /30. Solo funciona con IPv4 y hasta 100 subredes por plan.",
            },
        ],
    },

    binario: {
        intro:
            "Todo texto es, por debajo, una secuencia de números, y cada número una secuencia de bits. Este traductor convierte texto a código binario y de vuelta, byte a byte en UTF-8. Sirve para entender qué está pasando bajo la superficie, para resolver ejercicios y para descifrar esas cadenas de ceros y unos que aparecen en juegos y acertijos.",
        steps: [
            {
                title: "Elige la dirección",
                body: "De texto a binario, o de binario a texto. La herramienta acepta los bloques separados por espacios, que es como se suelen escribir.",
            },
            {
                title: "Escribe o pega",
                body: "La conversión es inmediata. Cada byte se escribe con 8 bits: una letra sin tilde ocupa un byte; una ñ, dos; un emoji, cuatro.",
            },
            {
                title: "Copia el resultado",
                body: "Si conviertes de binario a texto, la herramienta avisa si sobran bits al final o si un grupo pasa de 8.",
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
                answer: "Porque un byte son 8 bits, que dan 256 combinaciones. ASCII define 128 caracteres (7 bits), así que una letra sin tilde cabe en un byte; en UTF-8, los caracteres con acento y los emoji necesitan de dos a cuatro bytes, y su binario es más largo.",
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
            "Un conversor de unidades sirve de poco si solo entrega un número. Este convierte entre 95 unidades de 12 magnitudes, de la longitud y la masa a la presión, la energía y el consumo de combustible. Junto al resultado muestra de dónde sale la equivalencia: el factor en ambos sentidos, o la fórmula cuando la escala no es proporcional. Además arma una tabla con el valor en todas las unidades de esa magnitud, lista para copiar.",
        steps: [
            {
                title: "Elige la magnitud",
                body: "Longitud, masa, temperatura, área, volumen, velocidad, tiempo, datos, presión, energía, potencia o consumo. Cada una agrupa solo unidades compatibles, para que no puedas convertir kilos a kilómetros.",
            },
            {
                title: "Escribe el valor",
                body: "Acepta 1.234,5 o 1234.5, negativos y notación científica como 1,5e6. El resultado se actualiza mientras escribes.",
            },
            {
                title: "Lee cómo se calcula",
                body: "Debajo del resultado aparece el factor en ambos sentidos, o la fórmula si no basta con multiplicar, como en temperatura o en L/100 km. Muchas unidades traen además una nota con su definición.",
            },
            {
                title: "Copia la tabla o comparte el enlace",
                body: "La tabla muestra el valor en todas las unidades de la magnitud, con hasta 12 cifras significativas. La dirección de la página guarda la conversión, así que puedes compartirla tal cual.",
            },
        ],
        useCases: [
            {
                title: "Trabajar con documentación en otras unidades",
                body: "Especificaciones en pulgadas, presiones en psi, potencias en HP o CV, consumos en millas por galón. Convertir sin salir a buscar la tabla cada vez.",
            },
            {
                title: "Cocinar con recetas extranjeras",
                body: "Tazas y cucharadas a mililitros, onzas a gramos y Fahrenheit a Celsius. Para pasar una taza de harina a gramos hace falta la densidad del ingrediente: eso no lo resuelve un conversor de volumen.",
            },
            {
                title: "Estudiar física o astronomía",
                body: "Unidades astronómicas, años luz y pársecs, o electronvoltios y joules, con la definición de cada unidad junto al resultado.",
            },
        ],
        faq: [
            {
                question: "¿Cuántos metros tiene una milla náutica?",
                answer: "Exactamente 1.852 metros. No es una cifra arbitraria: equivale a cerca de un minuto de arco de latitud sobre la superficie terrestre, que es precisamente por qué se adoptó para navegación marítima y aérea.",
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
            {
                question: "¿Cuál es la diferencia entre GB y GiB?",
                answer: "Un GB son 1.000.000.000 bytes; un GiB, 1.073.741.824, que es 1.024³. Los discos y las conexiones cuentan en GB; Windows cuenta en GiB pero los llama «GB». Por eso un disco de 1 TB aparece como unos 931 GB.",
            },
        ],
    },

    aleatorio: {
        intro:
            "Elegir al azar delante de otras personas exige que el método sea visible, no solo justo. Esta herramienta sortea con una ruleta animada, saca uno o varios ganadores sin repetir y en orden, y reparte una lista en la cantidad de grupos que elijas. El resultado sale del generador criptográfico del navegador, sin sesgo y no de un pseudoaleatorio predecible. La animación existe para que quien mira acepte el resultado.",
        steps: [
            {
                title: "Carga los participantes",
                body: "Un nombre por línea, o separados por comas o punto y coma. Puedes pegar una columna completa desde una planilla. Si un nombre se repite, cuenta como dos entradas y la herramienta te lo avisa.",
            },
            {
                title: "Elige el modo",
                body: "Ruleta para sacar ganadores: defines cuántos y salen en orden, sin que nadie salga dos veces. Grupos para repartir a todos en la cantidad de equipos que definas.",
            },
            {
                title: "Gira y copia",
                body: "Con varios ganadores, la ruleta gira una vez por cada uno y el que sale queda apagado para el giro siguiente. «Terminar ya» muestra al resto sin esperar. Copia la lista numerada o los grupos. Si no quieres esperar nada, sortea sin animación; con la opción de reducir movimiento del sistema, la ruleta no gira.",
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
                body: "Quién presenta primero, segundo y tercero: con varios ganadores en orden, la ruleta gira una vez por turno, a la vista de todos.",
            },
        ],
        faq: [
            {
                question: "¿El sorteo es realmente aleatorio?",
                answer: "Usa la API criptográfica del navegador, que es la misma fuente de aleatoriedad empleada para generar claves, y elige sin sesgo: cada entrada tiene la misma probabilidad. No es un pseudoaleatorio sembrado con la hora, así que el resultado no se puede predecir ni reproducir conociendo el momento del sorteo.",
            },
            {
                question: "¿Se guardan los participantes o los resultados?",
                answer: "No. La lista y el historial de los últimos sorteos viven en la memoria de la pestaña y desaparecen al cerrarla. Los nombres no se envían a ningún servidor; solo se cuenta el uso de la herramienta, sin los nombres.",
            },
            {
                question: "¿Puedo repetir el sorteo si no me gusta el resultado?",
                answer: "Técnicamente sí, pero repetir hasta obtener el resultado deseado anula la aleatoriedad. Si el sorteo es público, conviene anunciar de antemano que vale el primer giro: es lo que hace que el resultado sea aceptado.",
            },
            {
                question: "¿Cuántos participantes admite?",
                answer: "Hasta 1.000 entradas de hasta 100 caracteres cada una. Con muchas, las porciones de la ruleta se vuelven finas y en ella los nombres se acortan, pero el sorteo sigue siendo correcto: el nombre completo aparece en la lista de ganadores.",
            },
            {
                question: "¿Cómo se arman los grupos?",
                answer: "Defines cuántos grupos quieres, no de qué tamaño. La lista se baraja y se reparte por turnos, así que los grupos quedan parejos: a lo más difieren en una persona. Necesitas al menos tantos participantes como grupos.",
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
                body: "Escribe el número con código de país; los espacios, guiones, el + y el 00 se limpian solos, y un celular chileno de 9 dígitos recibe el 56. Sin hora de inicio, el evento queda de día completo.",
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
            "Cuando cambias un registro DNS, el cambio no llega a todos al mismo tiempo: cada resolvedor guarda la respuesta anterior hasta que vence su TTL. Este verificador consulta el dominio en seis resolvedores públicos (Google, Cloudflare, Quad9, OpenDNS, AdGuard y CleanBrowsing) desde el servidor de este sitio y compara lo que responde cada uno. También revisa el SPF y el DMARC del dominio. No mide cada país: muestra si los resolvedores más usados ya tienen el valor nuevo.",
        steps: [
            {
                title: "Escribe el dominio o una IP",
                body: "Basta el nombre; si pegas una URL completa o un correo, se queda solo con el dominio. Sirven también subdominios concretos. Si escribes una IP pública, se hace la consulta inversa (PTR).",
            },
            {
                title: "Elige el tipo de registro",
                body: "A, AAAA, CNAME, MX, TXT, NS, SOA, CAA, SRV o PTR. Cada uno propaga por separado. En A y AAAA verás también el TTL que informa cada resolvedor.",
            },
            {
                title: "Compara las respuestas",
                body: "Si los seis coinciden, el cambio ya llegó a esos resolvedores. Si difieren, alguno sirve todavía el valor antiguo desde su caché y toca esperar a que venza su TTL.",
            },
            {
                title: "Revisa el SPF y el DMARC",
                body: "Revisar SPF y DMARC lee ambos registros, explica cada término y cuenta en forma aproximada las consultas DNS del SPF, que no pueden pasar de 10. DKIM no se revisa porque hace falta su selector.",
            },
        ],
        useCases: [
            {
                title: "Confirmar una migración de servidor",
                body: "Tras apuntar el dominio a una IP nueva, ver si los resolvedores públicos más usados ya entregan la nueva o si alguno sigue con la vieja.",
            },
            {
                title: "Depurar entrega de correo",
                body: "Un MX mal propagado, un SPF con demasiadas consultas o un DMARC mal escrito hacen que el correo rebote o caiga en spam. La revisión de correo señala qué conviene corregir.",
            },
            {
                title: "Validar verificaciones de dominio",
                body: "Muchos servicios piden un registro TXT para probar que el dominio es tuyo. Comprobar que ya es visible evita reintentar la verificación a ciegas.",
            },
        ],
        faq: [
            {
                question: "¿Cuánto tarda en propagarse un cambio de DNS?",
                answer: "Depende del TTL que tenía el registro anterior, no del nuevo. Si el TTL era de 24 horas, algunos resolvedores servirán el valor viejo hasta un día completo. Bajar el TTL antes de un cambio planificado acorta mucho la espera.",
            },
            {
                question: "¿Qué es el TTL de un registro DNS?",
                answer: "El tiempo en segundos que un resolvedor puede guardar la respuesta antes de volver a preguntar. Un TTL alto reduce consultas y mejora rendimiento; uno bajo hace que los cambios se propaguen rápido. Se suele bajar días antes de una migración.",
            },
            {
                question: "¿Por qué mi dominio funciona en un lugar y en otro no?",
                answer: "Porque cada resolvedor tiene su propia caché con su propio vencimiento. Unos ya pidieron el valor nuevo y otros aún sirven el guardado. No es un error: es cómo funciona el DNS, y se resuelve esperando a que expiren los TTL.",
            },
            {
                question: "¿Puedo forzar la propagación?",
                answer: "No globalmente. Puedes limpiar tu caché local y la de tu resolvedor, pero no la del resto del mundo. Lo único que acelera de verdad una migración es haber bajado el TTL con antelación, antes de hacer el cambio.",
            },
            {
                question: "¿Esto muestra la propagación en todo el mundo?",
                answer: "No. Consulta seis resolvedores públicos desde un solo servidor. Como son anycast, cada uno responde desde su nodo más cercano a ese servidor, no desde cada país. Sirve para saber si los resolvedores más usados ya tienen el valor nuevo; el de tu proveedor de internet puede ir a otro ritmo.",
            },
        ],
    },

    nginx: {
        intro:
            "La mayoría de los fallos de configuración de Nginx no son errores de sintaxis, sino directivas puestas en el bloque equivocado o un orden de location que hace que la regla correcta nunca se evalúe. Este generador arma configuraciones para los casos habituales (HTTPS con redirección desde HTTP, cabeceras de seguridad, proxy inverso, caché y compresión) con la estructura ya correcta, y también genera el equivalente en .htaccess.",
        steps: [
            {
                title: "Elige qué necesitas",
                body: "SSL con redirección de HTTP a HTTPS (301), proxy a un backend con WebSocket, compresión, caché de estáticos, cabeceras de seguridad, límite de peticiones o bloqueo de bots. Lo que actives se suma al mismo bloque server.",
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
                title: "Pasar un sitio a HTTPS",
                body: "Con SSL y «Forzar HTTPS (301)», un bloque en el puerto 80 manda todo a HTTPS con una redirección permanente, y HSTS le pide al navegador no volver a usar HTTP.",
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
                body: "Acepta JPEG, PNG y WebP. JPEG es el que más metadatos guarda y el único del que se muestra el detalle; de PNG y WebP también se quitan al limpiar. Algunas redes sociales los eliminan al subir, pero no todas.",
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
                answer: "No. Los metadatos van en bloques aparte de los píxeles, así que quitarlos no recomprime la imagen, ni en JPEG, ni en PNG ni en WebP. En JPEG se conservan solo la orientación, para que una foto vertical no aparezca acostada, y lo técnico para mostrar bien los colores (el perfil de color y los datos JFIF y Adobe). Se quita lo que cada marca guarda aparte, como el bloque de Samsung, y lo que algunos celulares pegan después de la foto, como el video de una foto en movimiento.",
            },
            {
                question: "¿Se sube mi foto a algún servidor?",
                answer: "No. La lectura y el borrado ocurren en tu navegador, que trabaja sobre los bytes del archivo, y la imagen no sale de tu equipo. Es un requisito, no un detalle: enviar a un servidor una foto para comprobar su privacidad sería contradictorio.",
            },
        ],
    },
    "convertir-imagen": {
        intro:
            "El formato de una imagen decide cuánto pesa y dónde se puede usar. WebP suele pesar menos que JPG con calidad parecida, PNG conserva la transparencia y JPG sigue siendo el que acepta cualquier sistema antiguo. Este conversor abre PNG, JPG, WebP, AVIF, GIF y BMP, y exporta a WebP, PNG o JPG. Puedes convertir una imagen o hasta 20 a la vez y bajarlas en un ZIP. Todo pasa en tu navegador, sin subir archivos.",
        steps: [
            {
                title: "Suelta una o varias imágenes",
                body: "Arrástralas, selecciónalas o pégalas con Ctrl o ⌘ V en cualquier parte de la página. Con varias, hasta 20 por vez, se aplican los mismos ajustes a todas. Cada archivo puede pesar hasta 50 MB.",
            },
            {
                title: "Elige el formato de salida",
                body: "WebP para web, PNG si necesitas transparencia, JPG si el destino es un sistema que no acepta nada más moderno. En JPG eliges el color que rellena las zonas transparentes.",
            },
            {
                title: "Ajusta la calidad y compara",
                body: "En WebP y JPG la calidad va de 10 a 100. Mantén pulsado el botón del ojo para ver el original y compara el peso antes y después.",
            },
            {
                title: "Descarga el resultado",
                body: "Un lote se baja imagen por imagen o todo en un ZIP. Si el ahorro es marginal, probablemente la imagen ya estaba optimizada y no vale la pena cambiar de formato.",
            },
        ],
        useCases: [
            {
                title: "Aligerar imágenes de una web",
                body: "En las pruebas de Google, WebP pesó entre un 25% y un 34% menos que JPG con calidad equivalente. Se nota en el tiempo de carga y en Core Web Vitals.",
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
                answer: "Para web, casi siempre: suele pesar menos con calidad visual equivalente y admite transparencia, que JPG no. La excepción son los sistemas antiguos que no lo soportan, cada vez menos frecuentes pero todavía presentes en software de escritorio.",
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
            {
                question: "¿Puedo convertir a BMP, GIF o AVIF?",
                answer: "No. Esos formatos se pueden abrir, pero la salida es WebP, PNG o JPG, que son los que el navegador sabe crear. Si tu navegador no sabe crear WebP, la herramienta te avisa y entrega el archivo en otro formato. De un GIF animado se usa solo el primer cuadro.",
            },
        ],
    },

    "comprimir-imagen": {
        intro:
            "Las imágenes son casi siempre lo que más pesa en una página, y casi siempre lo que menos se optimiza. Este compresor baja la calidad hasta donde la diferencia deja de notarse y te muestra el antes y el después para que decidas tú. Si un formulario pide un máximo, escribe el peso objetivo en KB y busca la mayor calidad que cabe. Comprime una imagen o hasta 20 a la vez, en tu navegador.",
        steps: [
            {
                title: "Carga una o varias imágenes",
                body: "Verás el peso original de referencia. Puedes soltar, elegir o pegar hasta 20 imágenes; a todas se les aplican los mismos ajustes. Un JPEG sale en JPEG y un WebP en WebP; un PNG pasa a WebP, salvo que elijas otro formato.",
            },
            {
                title: "Ajusta la calidad o fija un peso",
                body: "El punto útil suele estar entre 70 y 85: por debajo aparecen artefactos en degradados y bordes. Con un peso objetivo, la herramienta prueba calidades entre 40 y 92; si ni con 40 alcanza, achica la imagen.",
            },
            {
                title: "Limita el lado mayor (opcional)",
                body: "Escribe un lado máximo en píxeles para achicar fotos grandes sin deformarlas; nunca amplía. Bajar las medidas suele ahorrar más peso que bajar la calidad.",
            },
            {
                title: "Compara y descarga",
                body: "Mantén pulsado el botón del ojo para ver el original. Si el resultado pesa más que el original, la herramienta te lo dice y conviene quedarse con el original. Un lote se baja en ZIP.",
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
                body: "Formularios, marketplaces y portales de trámites suelen imponer un máximo por archivo. Escribe ese máximo como peso objetivo y la herramienta busca la mejor calidad que cabe.",
            },
        ],
        faq: [
            {
                question: "¿Cuánto se puede comprimir sin que se note?",
                answer: "Depende de la imagen. En fotografías, una calidad cercana a 80 suele bajar bastante el peso sin diferencia perceptible. En imágenes con texto, líneas finas o zonas planas de color, los artefactos aparecen antes: ahí conviene no bajar de 90.",
            },
            {
                question: "¿La compresión es reversible?",
                answer: "No. JPG y WebP comprimen con pérdida: la información descartada no se recupera subiendo la calidad después. Conserva siempre el original en algún lado antes de comprimir, porque el archivo comprimido no se puede deshacer.",
            },
            {
                question: "¿Comprimir cambia las dimensiones de la imagen?",
                answer: "Solo en dos casos. Si escribes un lado máximo, la imagen se achica sin deformarse. Y si fijas un peso objetivo que no se alcanza ni con calidad 40, la herramienta reduce las medidas y te muestra las nuevas. Si no tocas ninguna de las dos opciones, el alto y el ancho se mantienen.",
            },
            {
                question: "¿Se sube mi imagen a algún servidor?",
                answer: "No. La compresión ocurre en tu navegador y el archivo no se transmite en ningún momento. Es lo que permite comprimir fotos personales o material de clientes sin entregárselos a un tercero.",
            },
            {
                question: "¿Por qué no puedo comprimir un PNG?",
                answer: "Porque PNG guarda sin pérdida y no tiene calidad que ajustar: solo baja de peso si reduces sus medidas. Para comprimirlo o apuntar a un peso, pásalo a WebP, que también conserva la transparencia, o a JPG si no la necesitas.",
            },
        ],
    },

    redimensionar: {
        intro:
            "Servir una imagen de 4000 píxeles de ancho en un espacio de 400 desperdicia ancho de banda y tiempo de carga sin ganar nada: el navegador la reduce igual, después de haberla descargado entera. Esta herramienta cambia las dimensiones reales del archivo, con presets para Instagram, YouTube, Facebook y LinkedIn. Eliges cómo entra la imagen en la medida nueva: ajustar, cubrir o estirar, y solo estirar la deforma. Funciona con una imagen o con hasta 20 a la vez.",
        steps: [
            {
                title: "Carga una o varias imágenes",
                body: "Verás sus dimensiones actuales, que determinan cuánto margen de reducción tienes antes de que se note. En un lote, las medidas de partida son las de la primera imagen.",
            },
            {
                title: "Elige preset o medida propia",
                body: "Los presets cubren formatos de Instagram, YouTube, Facebook y LinkedIn, además de Full HD y 4K. Con el candado activado, al cambiar el ancho el alto se ajusta solo.",
            },
            {
                title: "Elige cómo encaja",
                body: "Ajustar mete la imagen entera y deja márgenes, que puedes rellenar con un color. Cubrir llena la medida y recorta lo que sobra. Estirar llena la medida deformando la imagen.",
            },
            {
                title: "Descarga",
                body: "Sale en el formato de la original, salvo que elijas otro. Reducir siempre da buen resultado. Ampliar por encima del tamaño original nunca lo da: no hay información que inventar y el resultado sale borroso.",
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
                answer: "Porque elegiste Estirar con una medida de otra proporción. Ajustar y Cubrir nunca deforman: el primero deja márgenes y el segundo recorta los bordes. Con el candado activado, al cambiar una dimensión la otra se ajusta sola y la proporción se mantiene.",
            },
            {
                question: "¿Cuál es el tamaño ideal para una imagen de web?",
                answer: "El mismo en que se va a mostrar, multiplicado por dos si quieres que se vea nítida en pantallas de alta densidad. Servir una imagen de 3000 píxeles en un contenedor de 600 desperdicia descarga sin ninguna mejora visual.",
            },
            {
                question: "¿Puedo redimensionar varias imágenes a la vez?",
                answer: "Sí, hasta 20 por vez. Con el candado, cada una cabe en la medida que pongas y conserva su proporción; sin el candado, todas salen con el ancho y el alto exactos. Se bajan una por una o en un ZIP. El límite es de 16.000 píxeles por lado y 40 megapíxeles por imagen.",
            },
        ],
    },

    "recortar-imagen": {
        intro:
            "Recortar no es solo quitar bordes: es decidir qué mira quien ve la imagen. Este editor recorta con vista previa en vivo, zoom, giro y las proporciones que piden las redes, para que la plataforma no recorte por su cuenta y corte lo importante. También encaja el recorte al sujeto: un modelo de segmentación encuentra sus bordes y ajusta el encuadre. Todo pasa en tu navegador; el modelo se descarga la primera vez que usas esa función.",
        steps: [
            {
                title: "Carga la imagen",
                body: "Aparece con el marco de recorte encima. Arrastra la imagen para encuadrarla, usa el zoom para acercarte y las flechas del teclado para ajustes finos.",
            },
            {
                title: "Elige la proporción",
                body: "Original, 1:1, 16:9, 9:16, 4:3, 3:2 o 4:5. Fijar la proporción evita entregar una medida que la plataforma vaya a recortar de nuevo.",
            },
            {
                title: "Encaja al sujeto (opcional)",
                body: "Pulsa Encajar al sujeto y el encuadre se ajusta a lo que detecta el modelo, con el margen que elijas y respetando la proporción. Si hay varios objetos, cambia a Marcar sujeto y pinta encima del que quieres conservar.",
            },
            {
                title: "Gira y descarga",
                body: "Gira de a 90° o en grados sueltos y descarga en PNG, JPG o WebP; en JPG y WebP eliges la calidad. Deja aire alrededor del sujeto: muchas plataformas recortan un poco más al generar sus miniaturas.",
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
                answer: "No. El recorte ocurre en tu navegador mediante la API Canvas y el archivo nunca se transmite. Encajar al sujeto descarga una vez el modelo de segmentación, pero tu imagen se analiza en tu equipo. Así puedes recortar documentos, capturas con datos o fotos personales sin entregarlos a un servicio externo.",
            },
            {
                question: "¿Cómo funciona el recorte automático al sujeto?",
                answer: "Al pulsar Encajar al sujeto, un modelo de segmentación corre en tu navegador, encuentra el sujeto y encuadra el rectángulo más pequeño de la proporción elegida que lo contiene, con el margen que definas. La primera vez descarga el modelo y tarda más. Si hay varios objetos, marca con el pincel el que quieres.",
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
                body: "Sale con transparencia real, no con fondo blanco. Si necesitas fondo, elige blanco, marfil, oscuro, degradado o un color propio antes de descargar.",
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
            "Una marca de agua no impide que copien tu imagen, pero deja constancia de su origen cuando circula sin crédito. Esta herramienta pone texto o un logo en una esquina, al centro o repetido en mosaico, con tamaño, opacidad y giro ajustables. Los tamaños van en proporción al ancho, así que la marca se ve igual en una foto chica que en una grande. La imagen se descarga a tamaño completo y se procesa en tu navegador.",
        steps: [
            {
                title: "Carga la imagen base",
                body: "Es la que recibirá la marca: PNG, JPG, WebP, GIF o BMP. Se procesa localmente, así que puedes marcar material que aún no has publicado.",
            },
            {
                title: "Elige texto o logo",
                body: "El texto sirve para firmas y avisos de copyright, con el color que elijas. Un logo en PNG con transparencia queda mejor integrado que uno con fondo sólido.",
            },
            {
                title: "Ajusta posición y opacidad",
                body: "Elige una de las cuatro esquinas, el centro o mosaico, y gira la marca hasta 45° a cada lado. Entre 30% y 50% de opacidad suele ser el rango útil: visible pero sin tapar.",
            },
            {
                title: "Descarga",
                body: "Sale a tamaño completo y en el formato del original: PNG, JPG o WebP. GIF y BMP salen en PNG. En JPG y WebP puedes elegir la calidad.",
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
            {
                question: "¿La marca cambia de tamaño según la foto?",
                answer: "Se mantiene en proporción: el tamaño del texto, la escala del logo y el espaciado del mosaico van en porcentaje del ancho de la imagen. La vista previa es reducida, pero la descarga usa la imagen original completa con la misma composición.",
            },
        ],
    },

    "paleta-colores": {
        intro:
            "Sacar los colores de una imagen a ojo produce valores aproximados que nunca terminan de encajar. Este extractor analiza la imagen y devuelve los colores dominantes en HEX, RGB y HSL, listos para copiar a CSS o a una herramienta de diseño. Sirve para construir una paleta a partir de una fotografía, o para recuperar los colores de una marca a partir de su logo (cada uno es el promedio de tonos muy parecidos, así que puede diferir en unas pocas unidades).",
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
                body: "Cuando existe el logo pero no el manual de marca, extraer sus valores evita elegir a ojo un azul parecido que se nota distinto al lado del original.",
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
            "El favicon dejó de ser un solo archivo hace años: un navegador, un celular y una app instalada piden tamaños distintos, y si falta uno el icono sale borroso o en blanco. Este generador produce ocho PNG, de 16 a 512 píxeles, un favicon.ico con 16, 32 y 48 píxeles dentro y un site.webmanifest, y lo entrega todo en un ZIP junto con las etiquetas HTML que hay que pegar. La imagen se procesa en tu navegador.",
        steps: [
            {
                title: "Sube la imagen de origen",
                body: "Cuadrada y de al menos 512 píxeles. Si no es cuadrada, se encaja sin deformarse. Los tamaños pequeños se generan reduciendo, así que partir de algo grande evita bordes sucios.",
            },
            {
                title: "Ajusta margen y fondo",
                body: "Mira sobre todo el tamaño de 16 píxeles: un logo con detalle fino se vuelve ahí una mancha. El margen interior va de 0 a 30%, y el fondo puede ser transparente o de un color.",
            },
            {
                title: "Completa el manifest",
                body: "El nombre de la app, el nombre corto y el color del tema van al site.webmanifest y a la etiqueta theme-color. El nombre corto es el que aparece bajo el icono en el celular.",
            },
            {
                title: "Descarga el ZIP",
                body: "Trae los ocho PNG, favicon.ico, site.webmanifest y las etiquetas HTML. Los archivos van en la raíz del sitio y las etiquetas dentro del head. Cada tamaño también se baja por separado.",
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
                answer: "Cada vez menos, pero conviene incluirlo, y el ZIP lo trae con 16, 32 y 48 píxeles dentro. Los navegadores modernos prefieren PNG declarados en el HTML, aunque algunos aún buscan favicon.ico en la raíz por defecto, y ciertos lectores de feeds y herramientas antiguas solo entienden ese formato.",
            },
            {
                question: "¿Por qué mi favicon se ve borroso?",
                answer: "Casi siempre porque el navegador está escalando un tamaño que no coincide con el que necesita. Servir cada tamaño exacto en lugar de dejar que el navegador reduzca uno grande resuelve el problema de inmediato.",
            },
            {
                question: "¿Por qué no cambia mi favicon tras actualizarlo?",
                answer: "Porque los navegadores lo cachean de forma muy agresiva, a veces durante días. Forzar una recarga completa suele bastar; si no, cambiar el nombre del archivo o añadirle un parámetro de versión en la etiqueta obliga a volver a pedirlo.",
            },
            {
                question: "¿Por qué el icono de Apple sale con fondo?",
                answer: "Porque iPhone y iPad no respetan la transparencia del apple-touch-icon: la pintan de negro. Por eso ese icono de 180 píxeles sale siempre opaco, con el color que elijas, aunque el resto de los tamaños quede transparente.",
            },
        ],
    },

    "convertir-ico": {
        intro:
            "El formato ICO es un contenedor: un solo archivo que guarda varias resoluciones del mismo icono, para que Windows y los navegadores elijan la que necesitan. Este conversor toma un PNG, JPG o WebP y lo empaqueta como .ico con los tamaños habituales, en el navegador y sin subir nada. Es la pieza que falta cuando un sistema pide específicamente ese formato.",
        steps: [
            {
                title: "Sube la imagen",
                body: "Cuadrada da mejor resultado. Una imagen rectangular se encaja sin deformarse y quedan márgenes transparentes a los lados.",
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
            "El arte ASCII convierte una imagen en texto: cada zona de la foto se reemplaza por el carácter cuya densidad visual se parece a ese nivel de brillo. Esta herramienta hace esa traducción con varios juegos de caracteres, o con los tuyos, en blanco y negro o en color. Puedes ajustar brillo, contraste y nitidez antes de convertir, y exportar como texto, PNG o HTML en color. Sirve para banners de terminal, firmas de correo y por el gusto de ver una foto hecha de letras.",
        steps: [
            {
                title: "Carga la imagen",
                body: "JPG, PNG, GIF, WebP o BMP de hasta 10 MB. Las de contraste alto y sujeto claro funcionan mejor: una foto plana de tonos medios se convierte en una masa de caracteres sin forma reconocible.",
            },
            {
                title: "Ajusta ancho y caracteres",
                body: "El ancho, de 30 a 200 columnas, es la resolución: más columnas, más detalle y más texto. El juego de caracteres cambia el aspecto: estándar, detallado, bloques, simple, binario o uno propio, de oscuro a claro.",
            },
            {
                title: "Afina la imagen",
                body: "Brillo, contraste, saturación, tono, escala de grises, sepia y nitidez se aplican antes de convertir. Invertir cambia qué zonas llevan los caracteres más densos.",
            },
            {
                title: "Exporta",
                body: "Copia el texto o bájalo en TXT para una terminal o un README. El PNG sale tal como se ve, en color si lo activaste y con fondo transparente si lo eliges; el HTML conserva el color.",
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
                answer: "Porque el arte ASCII solo se alinea en una fuente monoespaciada, donde todos los caracteres ocupan el mismo ancho. En una fuente normal cada letra mide distinto y la imagen se deforma. Para publicarlo fuera de una terminal, expórtalo como PNG o HTML.",
            },
            {
                question: "¿Qué significa el ancho en caracteres?",
                answer: "Es cuántas columnas de texto tendrá el resultado, y equivale a su resolución. Más ancho da más detalle pero produce bloques enormes de texto. Para una terminal estándar, entre 80 y 120 columnas es el rango que se ve completo sin cortarse.",
            },
            {
                question: "¿Se sube mi imagen a algún servidor?",
                answer: "No. La conversión lee los píxeles con la API Canvas del navegador y la imagen no se transmite. Todo el procesamiento es local, así que puedes convertir cualquier imagen sin que salga de tu equipo.",
            },
            {
                question: "¿Puedo conservar los colores de la foto?",
                answer: "Sí. Con el modo color, cada carácter toma el color de su zona. El color se ve en la vista previa, en el PNG y en el HTML; el TXT y el texto copiado son solo caracteres, porque el texto plano no guarda color.",
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
                body: "Hay cinco: Standard (al estilo de FIGlet), Banner (bloques ██), Small (de tres líneas), Block y Mini (cada letra en un recuadro). La legibilidad cambia mucho: algunas quedan bien con una palabra y se vuelven ilegibles con otra.",
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
                answer: "Depende de la tipografía: muchas de las clásicas solo definen el alfabeto inglés básico. Aquí las tildes y la ñ salen como su letra base (Ñ → N) y la herramienta avisa qué signos no dibuja la fuente elegida.",
            },
        ],
    },

    esteganografia: {
        intro:
            "La esteganografía esconde un mensaje a plena vista, sin que se note que hay algo escondido. Esta herramienta oculta texto entre los emojis de un portador usando caracteres Unicode invisibles: se ve normal, pero arrastra el mensaje. No es cifrado: quien sepa dónde mirar lo recupera. El modo Detectar hace lo contrario con cualquier texto: encuentra espacios de ancho cero, controles bidi y etiquetas Unicode, muestra lo que esconden y entrega una copia limpia.",
        steps: [
            {
                title: "Elige el portador",
                body: "Uno o varios emojis, o una frase corta. El mensaje se reparte entre sus caracteres sin partir los emojis compuestos; si el portador es un solo emoji, va después de él.",
            },
            {
                title: "Escribe el mensaje",
                body: "Cada byte se escribe con 8 caracteres invisibles, más una marca al inicio: una letra sin tilde ocupa 8 y una con tilde, 16. El resultado se copia y se pega como cualquier texto.",
            },
            {
                title: "Para leer, pega y decodifica",
                body: "El destinatario pega el texto aquí en modo Decodificar y recupera el mensaje oculto. Sin la herramienta, el mensaje pasa inadvertido.",
            },
            {
                title: "Revisa textos sospechosos",
                body: "En Detectar, pega un correo, un mensaje o un prompt. Verás cuántos invisibles hay, en qué línea y columna, qué texto esconden las etiquetas, y podrás copiar el texto limpio.",
            },
        ],
        useCases: [
            {
                title: "Curiosidad y juegos",
                body: "Mandar un mensaje escondido en un emoji por diversión, o montar la pista de una búsqueda del tesoro que solo se revela con la herramienta correcta.",
            },
            {
                title: "Revisar un prompt antes de usarlo",
                body: "Las etiquetas Unicode pueden llevar instrucciones que no ves y que algunos asistentes de IA sí leen. Detectar las muestra y entrega el texto sin ellas.",
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
                answer: "A simple vista no, pero no es indetectable: el texto ocupa más caracteres de los que aparenta, y el modo Detectar de esta misma herramienta lo encuentra. Es ocultación frente a un observador casual, no frente a un análisis.",
            },
            {
                question: "¿Se envía mi mensaje a algún servidor?",
                answer: "No. Codificar, decodificar y detectar ocurren en tu navegador, así que el texto nunca se transmite. Todo el proceso es local, lo que importa precisamente cuando el punto es que el mensaje no quede registrado en ningún lado.",
            },
            {
                question: "¿Qué caracteres invisibles detecta?",
                answer: "Espacios de ancho cero, controles de dirección bidi (los del ataque Trojan Source), selectores de variación sueltos y etiquetas Unicode, que pueden esconder texto. No marca los invisibles que forman parte de un emoji compuesto ni los de uso normal en escrituras como el persa: esos se conservan en el texto limpio.",
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
                body: "Cuanto más largo, más píxeles necesita. Una imagen pequeña tiene un límite de cuánto texto cabe: tres bits por cada píxel opaco.",
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
                answer: "Depende de sus dimensiones: cada píxel almacena unos pocos bits, así que una imagen grande esconde más. Cada píxel opaco guarda 3 bits: una imagen de 1000 × 1000 guarda unos 375.000 bytes. Las zonas transparentes no guardan datos. Si el mensaje no cabe, la herramienta lo avisa y no lo oculta a medias.",
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
