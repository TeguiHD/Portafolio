#!/bin/bash
set -euo pipefail

COMPOSE_DIR="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
ENV_FILE="${2:-$COMPOSE_DIR/.env}"

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: env file not found at $ENV_FILE"
    exit 1
fi

read_env_value() {
    local key="$1"
    local line
    line="$(grep -E "^${key}=" "$ENV_FILE" | tail -n1 || true)"

    if [ -z "$line" ]; then
        echo ""
        return
    fi

    local value="${line#${key}=}"

    # Strip optional surrounding double quotes.
    value="${value%\"}"
    value="${value#\"}"

    echo "$value"
}

ADMIN_EMAIL_VALUE="$(read_env_value ADMIN_EMAIL)"
ADMIN_PASSWORD_VALUE="$(read_env_value ADMIN_PASSWORD)"

if [ -z "$ADMIN_EMAIL_VALUE" ] || [ -z "$ADMIN_PASSWORD_VALUE" ]; then
    echo "ERROR: ADMIN_EMAIL and ADMIN_PASSWORD are required in $ENV_FILE"
    exit 1
fi

cd "$COMPOSE_DIR"

echo "Reseeding admin user with secure secret parity..."
docker compose exec -T \
    -e ADMIN_EMAIL="$ADMIN_EMAIL_VALUE" \
    -e ADMIN_PASSWORD="$ADMIN_PASSWORD_VALUE" \
    web node node_modules/tsx/dist/cli.mjs prisma/seed.ts

echo "Reseeding quotation links for configured admin..."
docker compose exec -T \
    -e ADMIN_EMAIL="$ADMIN_EMAIL_VALUE" \
    web node node_modules/tsx/dist/cli.mjs prisma/seed-quotations.ts

echo "OK: admin and quotation seed synced for $ADMIN_EMAIL_VALUE"
