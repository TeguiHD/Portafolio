# Migración de PostgreSQL en el VPS compartido

Estado comprobado por SSH el 6 de septiembre de 2026, en modo solo lectura.

## Por qué existe este documento

`DOCKER/docker-compose.yml` declaraba `postgres:18.1` mientras el servidor ejecutaba
`postgres:15-alpine` con datos en formato 15. Los contenedores llevaban cinco semanas
levantados sin recrearse, así que la diferencia no había dado la cara.

El primer `docker compose up -d` sin `--no-deps` habría recreado la base con PostgreSQL 18
sobre un directorio de datos en formato 15. PostgreSQL se niega a arrancar en ese caso:
los datos no se pierden, pero el servicio queda caído hasta restaurarlo a mano.

Ese comando existe en `DOCKER/gestionar.sh`, en la primera opción del menú
(«🚀 Iniciar Todo»), y en `DOCKER/deploy.sh`. El script `deploy-unblock.sh` que se usa
habitualmente lleva `--no-deps web` y por eso nunca disparó el problema.

Los dos ficheros compose se han alineado con la realidad. Subir de versión mayor es
ahora una operación deliberada, descrita más abajo.

## Estado real del servidor

| dato | valor |
|---|---|
| RAM total | 897 MiB, con 4 GiB de swap y ~908 MiB de swap en uso |
| disco | 29 GB, 17 GB usados, 12 GB libres |
| carga | 0,24 de media |
| base del portafolio | 87,8 MB, formato PostgreSQL 15 |

Contenedores en ejecución, agrupados por proyecto:

| proyecto | contenedores | motor de datos |
|---|---|---|
| portafolio | `portfolio_web`, `portfolio-db`, `portfolio_redis`, `portfolio_nginx` | postgres:15-alpine |
| asistencia | `asistencia_api`, `asistencia_web`, `asistencia_db` | mariadb:11.4 |
| sicove | `sicove_api`, `sicove_web`, `sicove_db` | postgres:17-alpine |

**`portfolio_nginx` sirve los tres dominios**: `nicoholas.dev`, `asistencia.nicoholas.dev`
y `sicove.cl`. Un `docker compose down` en el directorio del portafolio deja fuera de
servicio los tres sitios, no solo uno.

## Topes de memoria

Antes de este cambio, los contenedores del portafolio no tenían límite mientras
asistencia (256 MiB) y sicove (192 MiB) sí lo tenían. Un pico del portafolio podía
consumir la máquina y afectar a datos de producción ajenos.

Topes añadidos: `web` 384m, `db` 192m, `redis` 96m, `nginx` 64m, `outerbase` 128m.
El consumo real medido de los diez contenedores era de unos 130 MiB, así que los topes
dejan margen amplio y solo actúan como freno ante una fuga.

Los topes son techos, no reservas: la suma puede superar la RAM física sin problema.
Lo que evitan es que un único contenedor se lo lleve todo.

## Subir a PostgreSQL 18, cuando se decida

La base pesa 87,8 MB, así que el volcado y la restauración tardan segundos. Sicove ya
ejecuta PostgreSQL 17 en esta misma máquina, de modo que una versión moderna está
probada en este servidor.

Aun así conviene tratarlo como ventana de mantenimiento, porque durante el proceso el
portafolio queda sin base de datos.

1. Avisar de la ventana. Los otros dos proyectos no se tocan en ningún paso.
2. Volcar con el motor actual, sin parar nada todavía:
   `docker exec portfolio-db pg_dumpall -U "$POSTGRES_USER" > respaldo-15.sql`
3. Comprobar que el volcado tiene contenido y llega al final:
   `tail -3 respaldo-15.sql` debe mostrar el cierre del script, y el tamaño debe ser
   coherente con los 87,8 MB de datos.
4. Copiar el volcado **fuera del servidor** antes de continuar.
5. Parar solo la aplicación y la base, sin tocar nginx para no afectar a los otros
   dominios: `docker compose stop web db`
6. Renombrar el volumen actual en vez de borrarlo. Conservarlo es la vuelta atrás.
7. Cambiar la imagen a `postgres:18-alpine` en ambos ficheros compose y levantar la base
   sola, con un volumen nuevo y vacío.
8. Restaurar: `docker exec -i portfolio-db psql -U "$POSTGRES_USER" < respaldo-15.sql`
9. Verificar antes de levantar la aplicación: número de tablas, conteo de filas de las
   tablas principales y que las migraciones de Prisma figuran aplicadas.
10. Levantar `web` y comprobar el sitio.

**Vuelta atrás**: volver a poner `postgres:15-alpine`, apuntar al volumen original que se
conservó y levantar. Por eso el paso 6 renombra en lugar de borrar.

El volumen antiguo solo se elimina después de varios días de funcionamiento normal.

## Lo que este documento no cubre

No se ha ejecutado ninguna migración. Los pasos anteriores no se han probado en este
servidor y deben revisarse contra las variables reales del fichero `.env` del servidor,
que no se han leído. Tampoco se ha comprobado si existe respaldo automático previo.
