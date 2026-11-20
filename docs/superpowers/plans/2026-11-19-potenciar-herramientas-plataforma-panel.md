# Potenciar herramientas, plataforma y panel (19-11-2026)

Pedido: «potencia todas las herramientas, mejores funcionalidades, más optimizaciones a nivel plataforma, panel de admin optimizado».
Base: 5 auditorías de solo lectura (imágenes; generación/conversión; desarrollo/seguridad/redes; plataforma; panel).

## Tanda 1 — lo que está roto (EN PRODUCCIÓN 19-11, BUILD_ID BCq03EX2tVwYydGTWffxT; pruebas tests/e2e/herramientas-arreglos.spec.ts)
Herramientas
- [x] nginx: interruptores sin efecto (SSL/proxy/HTTPS), role="switch", http2 on, sin X-XSS, HSTS solo con SSL, map upgrade, estáticos sin anular cabeceras y con proxy
- [x] metadatos: IFD0 mal ubicado (nunca leía cámara/fecha) + visitados
- [x] regex con IA: no ejecutar la regex del usuario en Node (ReDoS) · IP real
- [x] dns: ENODATA por error.code, «_» y punycode, timeout que cancela, límite propio y caché 30 s
- [x] enlaces: sin escape HTML, saltos de línea, .ics válido (UID/DTSTAMP/escapes/CRLF/plegado), +56 por defecto
- [x] aleatorio y claves: azar sin sesgo (enteroSeguro), nombres sin escape HTML
- [x] binario: UTF-8 real, sin escape HTML, tira continua
- [x] impuestos: «1.190.000» bien leído, CLP sin decimales, EE. UU. rotulado como impuesto a las ventas
- [x] jwt: «EXPIRADO» en iat/nbf, quitar «Bearer », claims 0
- [x] esteganografía emoji: grafemas (Intl.Segmenter)
- [x] ascii: quitar límite de usos y reporte al servidor (contradice «todo en tu navegador»), alert() → mensajes
- [x] subredes: rangos especiales (loopback, link-local, CGNAT), /29 «punto a punto»
- [ ] (pasa a tanda 2) favicon: .ico en el ZIP, apple-touch opaco · marca de agua: tamaño relativo
Plataforma
- [x] IP del cliente: ipCliente() (cf-connecting-ip → x-real-ip → último XFF) en ~17 rutas y libs (contacto, 2FA, login…)
- [x] /api/pulse sin no-store forzado · imágenes sin optimizador · HTML private no-cache
- [x] Redis: isReady en vez de PING (cola offline y matcher sin estáticos: descartados, ver nota)
- [x] service worker: no cachear RSC, /admin, /cotizacion ni /api/finance
- [x] Prisma con timeouts
- [ ] (pasa a tanda 3) fetch de terceros con `no-store` en vez de la caché de fetch de Next
Panel
- [x] Finanzas: rutas PUT/DELETE de cuentas y categorías (daban 404)
- [x] Oportunidades: se caía con etapas vacías
- [x] Pagos/Servicios: sumar solo lo pagado · Hoy: conteo real de cobros
- [x] Seguridad/Servidor: sondeos solo con la pestaña visible
- [x] Herramientas: groupBy en vez de N+1 · ⌘K sin borradas ni enlace roto

## Tanda 2 — funcionalidades de herramientas (EN PRODUCCIÓN 19-11, BUILD_ID ZNnlsq0wRaQOCRKCAvlQX; pruebas tests/e2e/herramientas-tanda2.spec.ts)
- [x] Imágenes: dropzone con blob URLs, pegar/soltar en toda la página, AVIF; comprimir con peso objetivo; lotes de 20 con ZIP
      (convertir, comprimir, redimensionar)
- [x] Recortar: «encajar al sujeto» por el worker (antes nunca funcionó en producción: CSP sin wasm en el hilo principal),
      exportar solo al descargar, formato y calidad
- [x] Favicon: favicon.ico 16/32/48 en el ZIP, apple-touch opaco, manifest editable · Marca de agua: tamaño relativo,
      espera 150 ms, vista previa reducida, formato original
- [x] QR: evento con inicio/término, vCard con cargo/web/dirección, WiFi oculta, logo sin deformar, vista previa liviana
- [x] Claves: frase de palabras (1.451 palabras), un carácter por grupo sin sesgo, entropía exacta · Unidades: 12 magnitudes,
      tabla, «cómo se calcula»
- [x] Aleatorio: sin redibujar por cuadro, reducir movimiento, N ganadores · ASCII: dropzone, render diferido, PNG ·
      Esteganografía: detector y limpiador de invisibles
- [x] Regex: explicación, grupos y reemplazo en el worker (plazo cuenta desde que el worker está listo) · JWT: verificar firma
      (HS/RS/PS/ES) · JSON: worker, árbol, enteros grandes y claves repetidas
- [x] Subredes: VLSM con CSV (;) · DNS: SOA/CAA/SRV/PTR, inversa, SPF y DMARC; sin el mapa de ciudades inventado
- [x] Comunes: copiar (useCopiar) y descargar (descargarBlob) · copia SEO de 17 herramientas alineada con lo real
- [ ] ASCII «Compacto» = «Normal»; CodeGeneratorModal borrado; quitar-fondo sin cambios

## Tanda 3 — plataforma (EN PRODUCCIÓN 19-11)
- [x] Respaldo diario en la VM (pg_dump + uploads, 7 juegos), copia cifrada por correo (falla hasta que Brevo active el envío),
      pull diario al PC (portafolio-backup.timer), restauración probada (64 tablas)
- [x] /api/health (base con plazo) + autosanar.sh en cron · NODE max-old-space 400 · cacheMaxMemorySize 16 MB · compress off
- [x] geoip-lite fuera (país/ciudad de Cloudflare) · imagen 459 → 284 MB · disco de la VM 81 % → 29 %
- [x] nginx: estáticos con ^~ y un año, sw.js no-cache, límites de páginas (10/s, ráfaga 80) y de precargas RSC (20/s, 150),
      sin cabeceras duplicadas · imágenes de terceros fijadas por digest · recarga de nginx al desplegar
- [x] Purga diaria de tablas de registro (AuditLog no) · fetch de terceros no-store · IA con plazo de 60 s · JSDOM con memoria
- [x] Incidentes por vía interna y sin bucle (antes un 429 generaba otro incidente: 33 mil en una pasada local)
- [x] IP_HASH_SECRET · X-XSS-Protection 0 · connect-src sin openrouter/frankfurter · service worker v6 con poda
- [x] (20-11) CSS del panel aparte: globals.css solo con las clases públicas (source(none) + @source) y admin/utilidades.css
      con todas; CSS público 281 → 133 KB

## Tanda 4 — panel (EN PRODUCCIÓN 19-11; pruebas tests/e2e/panel-tanda4.spec.ts)
- [x] Comercial: registrar pago real, editar negocio/gasto/contrato, tablero sin «arrastrar» y por etapa en celular, totales
      solo de abiertos, Clientes unificado en /admin/clientes (la otra redirige), sin htmlContent ni accessCode al navegador,
      menú: Contratos en vez de Servicios; Finanzas pasa a «Personal»
- [x] Sitio: Visitas con SQL agregado (igual que «Hoy»), fuentes de tráfico reales · Notificaciones paginadas en el servidor
- [x] Administración: permisos finos en usuarios, security-alerts con superadmin, audit/event con lista cerrada y límite (correo
      del intento fallido como huella), Servidor con caché de 20 s y pestañas en español, embed borrado
- [x] Finanzas/Trabajo: esqueletos, proveedor duplicado fuera, formulario sin cuentas, groupBy, textos en español,
      ~3.900 líneas de código muerto borradas · armazón sin framer-motion · confirm() → diálogo propio (confirmar.ts)
- [x] (20-11) Rediseño visual de todas las secciones internas con tokens (tema-panel.css queda solo de red) · «leído» por
      persona (AdminNotificationRead + migración 20261119120000) · Servicios fundido en «Resumen» (en el menú)

Notas tanda 1: matcher del proxy sin estáticos y `disableOfflineQueue` de Redis quedaron fuera a propósito (riesgo de
perder cabeceras de seguridad en public/ y de excepciones en todo lo que usa Redis); el proxy ya no hace PING por petición.
Auditorías completas (fuera del repo público): ~/Documentos/Paginas/portafolio-vm/pruebas/auditorias-2026-11-19/

## Tanda 5 — detalles y optimización (20-11-2026)
Pedido: «algo que vi en la ruleta: con más de un ganador gira solo una vez… esos detalles, en toda la página; además
optimízalo más». Revisión por zonas con agentes (lectura de flujos + arreglo), pruebas nuevas tests/e2e/detalles-*.spec.ts.
- [x] Ruleta: un giro por ganador, ganadores apagados, «Girando 2 de 3…», «Terminar ya»
- [x] Herramientas: ~80 detalles (IVA al peso, QR WiFi sin clave, banner con ñ, esteganografía con transparencia, metadatos
      con orientación, buscador sin tildes, subredes al pegar, DNS, nginx válido, JWT entre comillas…) + copia SEO alineada
- [x] Sitio: contacto (largo medido bien, error que se borra, sin escapar al guardar), hero con frase por opción, titular
      del tambor enlazado, color-scheme por tema, 404/errores, blog (fechas vivas, sin JS completo), portal (código del
      celular, firma que no se pierde), acceso (errores que quedan, 2FA pegado con espacios, salir con clave temporal)
- [x] Panel: cobros con una sola regla de «atrasada» (Chile), pago desde la propuesta salda la cuota, jerarquía de roles
      en ciclo de vida, fechas de finanzas sin correrse un día, APIs de finanzas con permiso, mensajes decodificados
- [x] Optimización: motor de partículas diferido (antes duplicado), 404 de servidor (−19 KB de SEO por página), LCP sin
      opacidad 0, capturas WebP por ancho, íconos estáticos (pestaña 35 → 2 KB), fotos del blog de Cloudflare 434 → 17 KB
- [ ] Pendiente de decisión: clave temporal también en las APIs (hoy solo en páginas) · editar/borrar un pago registrado ·
      botón «Renovar» contrato · permisos finos en export/import/ocr/ai de finanzas · SVG/HEIC en herramientas de imagen
