#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${1:-$SCRIPT_DIR/.env}"
SECRETS_DIR="${2:-$SCRIPT_DIR/secrets}"

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

write_secret() {
    local value="$1"
    local path="$2"
    printf '%s' "$value" > "$path"
    chmod 600 "$path"
}

resolve_value() {
    local key="$1"
    local target_file="$2"

    local value
    value="$(read_env_value "$key")"
    if [ -n "$value" ]; then
        echo "$value"
        return
    fi

    if [ -f "$target_file" ]; then
        cat "$target_file"
        return
    fi

    echo ""
}

mkdir -p "$SECRETS_DIR"
umask 077

REQUIRED_KEYS=(
    "POSTGRES_PASSWORD"
    "NEXTAUTH_SECRET"
    "ENCRYPTION_KEY"
    "PASSWORD_PEPPER"
    "AUDIT_SIGNING_KEY"
    "REDIS_PASSWORD"
    "INTERNAL_API_SECRET"
)

missing=()
DB_PASSWORD_VALUE="$(resolve_value POSTGRES_PASSWORD "$SECRETS_DIR/db_password.txt")"
NEXTAUTH_SECRET_VALUE="$(resolve_value NEXTAUTH_SECRET "$SECRETS_DIR/nextauth_secret.txt")"
ENCRYPTION_KEY_VALUE="$(resolve_value ENCRYPTION_KEY "$SECRETS_DIR/encryption_key.txt")"
PASSWORD_PEPPER_VALUE="$(resolve_value PASSWORD_PEPPER "$SECRETS_DIR/password_pepper.txt")"
AUDIT_SIGNING_KEY_VALUE="$(resolve_value AUDIT_SIGNING_KEY "$SECRETS_DIR/audit_signing_key.txt")"
REDIS_PASSWORD_VALUE="$(resolve_value REDIS_PASSWORD "$SECRETS_DIR/redis_password.txt")"
INTERNAL_API_SECRET_VALUE="$(resolve_value INTERNAL_API_SECRET "$SECRETS_DIR/internal_api_secret.txt")"

[ -z "$DB_PASSWORD_VALUE" ] && missing+=("POSTGRES_PASSWORD")
[ -z "$NEXTAUTH_SECRET_VALUE" ] && missing+=("NEXTAUTH_SECRET")
[ -z "$ENCRYPTION_KEY_VALUE" ] && missing+=("ENCRYPTION_KEY")
[ -z "$PASSWORD_PEPPER_VALUE" ] && missing+=("PASSWORD_PEPPER")
[ -z "$AUDIT_SIGNING_KEY_VALUE" ] && missing+=("AUDIT_SIGNING_KEY")
[ -z "$REDIS_PASSWORD_VALUE" ] && missing+=("REDIS_PASSWORD")
[ -z "$INTERNAL_API_SECRET_VALUE" ] && missing+=("INTERNAL_API_SECRET")

if [ "${#missing[@]}" -gt 0 ]; then
    echo "ERROR: missing required keys in $ENV_FILE: ${missing[*]}"
    echo "Hint: define these keys in DOCKER/.env before deploying."
    exit 1
fi

write_secret "$DB_PASSWORD_VALUE" "$SECRETS_DIR/db_password.txt"
write_secret "$NEXTAUTH_SECRET_VALUE" "$SECRETS_DIR/nextauth_secret.txt"
write_secret "$ENCRYPTION_KEY_VALUE" "$SECRETS_DIR/encryption_key.txt"
write_secret "$PASSWORD_PEPPER_VALUE" "$SECRETS_DIR/password_pepper.txt"
write_secret "$AUDIT_SIGNING_KEY_VALUE" "$SECRETS_DIR/audit_signing_key.txt"
write_secret "$REDIS_PASSWORD_VALUE" "$SECRETS_DIR/redis_password.txt"
write_secret "$INTERNAL_API_SECRET_VALUE" "$SECRETS_DIR/internal_api_secret.txt"

echo "OK: Docker secrets synced at $SECRETS_DIR"
