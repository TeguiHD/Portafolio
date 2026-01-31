---
description: start local development environment with database and redis
---
# Start Local Development

This workflow starts the development environment with PostgreSQL and Redis running in Docker.

## Steps

// turbo-all

1. Start infrastructure containers (PostgreSQL + Redis):
```bash
cd /home/nicoholas/Documentos/Paginas/Portafolio/DOCKER
docker compose -f docker-compose.dev.yml up -d
```

2. Verify containers are running:
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```
Expected: `portfolio_db_dev` and `portfolio_redis_dev` should show "Up ... (healthy)"

3. Start Next.js development server:
```bash
cd /home/nicoholas/Documentos/Paginas/Portafolio/APP/NEXT_APP
npm run dev
```

## Stopping Development

```bash
cd /home/nicoholas/Documentos/Paginas/Portafolio/DOCKER
docker compose -f docker-compose.dev.yml down
```

## Troubleshooting

### Redis not connecting
- Verify REDIS_URL in `.env` uses `localhost:6379` (not `redis:6379`)
- Check container: `docker logs portfolio_redis_dev`

### Database not connecting
- Verify DATABASE_URL in `.env` uses `localhost:5432`
- Check container: `docker logs portfolio_db_dev`
