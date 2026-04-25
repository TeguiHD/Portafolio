# Security Operations Runbook

Estado: actualizado 2026-04-25  
Alcance: defensa autonoma, revision de falsos positivos, Redis, respuesta operativa.

Este runbook convierte la arquitectura de seguridad en operaciones repetibles. Sigue NIST SP 800-61r3 para respuesta a incidentes, NIST SP 800-207 para Zero Trust, OWASP ASVS L3 para controles de aplicacion, MITRE ATT&CK para clasificacion de tacticas y CISA Secure by Design para decisiones reversibles y auditables.

## 1. Modo de operacion recomendado

| Etapa | Variable | Objetivo | Duracion |
| --- | --- | --- | --- |
| Observacion | `AUTONOMOUS_DEFENSE_MODE=dry-run` | Medir decisiones sin bloquear usuarios | 7 dias minimo |
| Activacion controlada | `AUTONOMOUS_DEFENSE_MODE=active` | Ejecutar solo acciones reversibles con TTL | Ventana de bajo trafico |
| Operacion continua | `active` + revision diaria | Ajustar umbrales y revisar cola humana | Permanente |

No activar acciones permanentes automaticas. Los bloqueos permanentes, suspension de cuentas y extension de bloqueos de 24h requieren aprobacion humana.

## 2. Revision de falsos positivos

Ejecutar diariamente durante el warm-up y durante las primeras 48h posteriores a `active`:

```bash
cd APP/NEXT_APP
pnpm run security:false-positives -- --days 7 --min-score 70
```

Salida JSON para automatizacion:

```bash
pnpm run security:false-positives -- --days 7 --min-score 70 --json
```

### Criterio de decision

| Senal | Interpretacion | Accion |
| --- | --- | --- |
| `falsePositiveRate <= 2%` | Dentro del objetivo | Revisar muestras y mantener umbrales |
| `falsePositiveRate > 2%` | Riesgo de bloquear usuarios legitimos | Mantener `dry-run`, bajar pesos o subir umbrales |
| Muchos scores 70-79 sin abuso confirmado | Sensibilidad alta | Reducir peso de rate-limit o aumentar umbral L1 |
| Rechazos frecuentes en `ThreatPendingAction` | Regla demasiado agresiva | Revisar regla y metadata asociada |
| Usuarios autenticados afectados por IP compartida | Riesgo CGNAT | Confirmar que `userId` sea clave primaria |

### Revision manual minima antes de activar

1. Revisar `ThreatScoreHistory` con `score >= 70`.
2. Revisar `AuditLog` con `action` que empiece por `autonomous_defense.`.
3. Confirmar si las IPs/usuarios eran trafico legitimo, bots, escaneo, abuso de endpoint caro o ataque real.
4. Si falsos positivos > 2%, no activar.
5. Si hay bloqueos L3 masivos en dry-run, revisar integracion de eventos antes de activar.

## 3. Redis: persistencia, recuperacion y HA

Redis es parte del plano de control de seguridad: rate limit, cooldowns, MFA step-up, offense counters y temporary blocks. Por eso el sistema no debe perder estado silenciosamente.

### Politica actual

| Control | Decision |
| --- | --- |
| Persistencia | AOF habilitado (`appendonly yes`) |
| Fsync | `appendfsync everysec` |
| Eviccion | `noeviction` para no descartar bloqueos o flags de seguridad |
| Comandos destructivos | `FLUSHALL` y `FLUSHDB` renombrados a vacio en produccion |
| Exposicion | Puerto Redis solo en red interna o `127.0.0.1` |
| Fallo Redis | Admin/auth/finance fail-closed; publico fail-open con alerta |

### Recuperacion single-node

1. Confirmar salud:

```bash
docker compose ps redis
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" ping
```

2. Si Redis se reinicio, verificar AOF:

```bash
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" info persistence
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" dbsize
```

3. Si AOF esta corrupto, detener Redis y reparar con `redis-check-aof` sobre el volumen. No borrar el volumen salvo confirmacion humana.

4. Si Redis queda indisponible, mantener `AUTONOMOUS_DEFENSE_MODE=dry-run` al recuperar para evitar tormentas de bloqueos por estado parcial.

### HA recomendado

Para un solo VPS, la configuracion actual prioriza recuperacion rapida con AOF. Para alta disponibilidad real, migrar a una de estas opciones:

| Opcion | Uso recomendado | Notas |
| --- | --- | --- |
| Redis gestionado con AOF/replicas | Produccion seria | Menor carga operativa |
| Redis Sentinel 3 nodos | VPS multiples | Failover automatico, mas complejidad |
| Redis Cluster | Alto volumen | Requiere validar compatibilidad de keys y operaciones |

Regla: no usar Redis sin persistencia en produccion. Si se adopta HA, probar failover antes de activar enforcement.

## 4. Alertas operativas

Alertas minimas obligatorias:

- Redis unavailable en rutas sensibles.
- Bloqueo Nivel 3.
- Mas de 10 bloqueos Nivel 3 en 5 minutos.
- Circuit breaker de AbuseIPDB abierto.
- False-positive rate > 2%.

Canales soportados por el proyecto: Discord, Slack, Teams, endpoint custom y email endpoint via `security-alerts.ts`.

## 5. Checklist antes de `active`

```text
[ ] Migraciones Prisma aplicadas en produccion
[ ] IP_HASH_SECRET configurado y guardado como secreto
[ ] REDIS_PASSWORD fuerte y distinto por entorno
[ ] Redis AOF activo y volumen persistente montado
[ ] Prueba de reinicio Redis completada
[ ] 7 dias dry-run revisados con security:false-positives
[ ] Falsos positivos <= 2%
[ ] Alertas Discord/Slack/email probadas
[ ] Runbook conocido por quien opera el VPS
```
