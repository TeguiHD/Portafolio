/** Visible answers and their structured data share the same editorial source. */
export const AR_GUIDE_UPDATED = "2026-09-06";
export const AR_GUIDE_FAQ = [
    {
        question: "¿El modelo sigue a la cámara o queda en el lugar donde lo coloco?",
        answer: "El modelo queda colocado sobre la superficie que eliges. Al mover el teléfono, cambia la perspectiva desde la que lo ves, como si estuviera físicamente allí. Escanea el QR, abre el enlace y toca «Ver en mi espacio» para entrar en el visor de realidad aumentada. Después puedes dejar de apuntar al QR: el visor sigue el entorno, no el código impreso. La vista 3D de la página, por sí sola, no utiliza la cámara.",
    },
    {
        question: "¿El QR contiene el modelo 3D?",
        answer: "No. El QR contiene un enlace al visor y las direcciones de los archivos. El móvil descarga el modelo desde su alojamiento cuando se abre la experiencia. Mantén disponibles tanto ese alojamiento como la página del visor para que el QR siga funcionando.",
    },
    {
        question: "¿Puedo crear realidad aumentada con una fotografía?",
        answer: "Esta herramienta necesita un modelo 3D ya creado. Una fotografía puede servir de póster, pero no se transforma aquí en un objeto tridimensional. Para empezar, usa el modelo de ejemplo o un archivo GLB y su versión USDZ preparados por quien diseña tu producto.",
    },
    {
        question: "¿Funciona en cualquier móvil?",
        answer: "La vista 3D necesita un navegador con WebGL. Para colocar el objeto en el entorno, iPhone y iPad utilizan Quick Look con USDZ; Android utiliza Scene Viewer y necesita un dispositivo y servicios compatibles con AR. Tener un archivo válido no garantiza que todos los teléfonos puedan usar realidad aumentada.",
    },
    {
        question: "¿Por qué el modelo no carga?",
        answer: "Revisa que la URL use HTTPS, sea pública y entregue el archivo del modelo. Un enlace a una página de descarga o a un archivo que exige iniciar sesión no sirve. Para la vista del navegador, el alojamiento debe permitir CORS; un GLB con texturas incluidas reduce dependencias externas. También puede fallar si falta WebGL o el archivo supera los recursos del móvil.",
    },
    {
        question: "¿Necesito instalar una aplicación?",
        answer: "No necesitas instalar una aplicación de este portafolio. Puedes explorar el modelo en un navegador compatible y abrir el visor nativo del dispositivo. En Android pueden ser necesarios servicios de Google actualizados; la experiencia disponible depende del teléfono.",
    },
    {
        question: "¿Cómo lo preparo para imprimir o compartir?",
        answer: "Genera el QR, prueba el enlace y escanéalo con los dispositivos a los que te diriges. Descarga SVG para conservar nitidez al imprimir o PNG para compartir una imagen. Mantén margen claro, contraste suficiente y comprueba el tamaño final impreso. El QR abre una experiencia enlazada: no ofrece métricas de escaneos ni alojamiento de modelos.",
    },
];
