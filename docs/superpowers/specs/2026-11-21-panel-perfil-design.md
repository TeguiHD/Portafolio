# Panel: «Mi perfil» (etapa del panel, sección 1)

Fecha: 2026-11-21 · El usuario lo llamó «poco profesional» y delegó las decisiones («si continua y deja todo desplegado»).

## Diagnóstico (capturas con el admin de prueba)

Cinco pestañas para poco contenido; cifras del negocio (clientes, propuestas, contratos, conexiones) y accesos directos
que repiten el menú; «Estado de seguridad» con insignias fijas («Activo», «Registrando») y citas de NIST/OWASP; «art. 20
del RGPD» en un sitio chileno; «Desactivar 2FA» en rojo aunque la 2FA es obligatoria para entrar; la actividad mostraba
JSON crudo; en el celular, una pantalla de cifras antes de la cuenta.

## Decisiones

1. Una sola página con índice (Seguridad, Sesiones, Actividad, Permisos solo si no es superadmin, Tus datos), como las
   páginas de cuenta de Google, GitHub o Vercel. `?tab=` de enlaces viejos baja a su sección.
2. Solo lo de la cuenta: sin cifras del negocio ni accesos directos.
3. Hechos verificados en el código, dichos una vez y en simple: sesión de 7 días (auth.ts), aviso en Notificaciones si se
   abre otra sesión (session-manager.ts), 5 intentos cada 15 minutos por correo (auth.ts). Contraseña: último cambio
   (passwordChangedAt) y «solo se guarda su huella (Argon2id)».
4. 2FA: «Cambiar de app autenticadora» (pide el código actual y luego un QR nuevo), sin rojo.
5. Actividad en palabras (navegador · sistema · equipo · lugar), nunca JSON.

Pruebas: tests/e2e/panel-perfil.spec.ts (necesita el admin de prueba; nunca contra producción).
