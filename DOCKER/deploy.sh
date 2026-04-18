#!/bin/bash

# Portfolio Deployment Script
# Run this on your VPS to set up the portfolio

set -e

echo "🚀 Portfolio Deployment Script"
echo "=============================="

# Configuration
DEPLOY_DIR="/opt/portfolio"
REPO_URL="https://github.com/TeguiHD/Portafolio.git"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Installing Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}Docker installed!${NC}"
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    echo -e "${YELLOW}Installing Docker Compose...${NC}"
    sudo apt-get update
    sudo apt-get install -y docker-compose-plugin
    echo -e "${GREEN}Docker Compose installed!${NC}"
fi

# Create deploy directory
sudo mkdir -p $DEPLOY_DIR
sudo chown $USER:$USER $DEPLOY_DIR

# Clone or update repository
if [ -d "$DEPLOY_DIR/.git" ]; then
    echo -e "${YELLOW}Updating repository...${NC}"
    cd $DEPLOY_DIR
    git pull origin main
else
    echo -e "${YELLOW}Cloning repository...${NC}"
    git clone $REPO_URL $DEPLOY_DIR
    cd $DEPLOY_DIR
fi

# Create .env file if not exists
if [ ! -f "$DEPLOY_DIR/DOCKER/.env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > $DEPLOY_DIR/DOCKER/.env << EOF
# ============================================
# Database - PostgreSQL
# ============================================
POSTGRES_USER=portfolio_user
POSTGRES_PASSWORD=$(openssl rand -base64 32)
POSTGRES_DB=portfolio_db

# ============================================
# Redis - Cache & Rate Limiting
# ============================================
REDIS_PASSWORD=$(openssl rand -base64 24)
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# ============================================
# NextAuth - Authentication
# ============================================
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=$(openssl rand -base64 32)
AUTH_TRUST_HOST=true

# ============================================
# VPS Control - SuperAdmin SSH access
# ============================================
VPS_HOST=your-server-ip-or-hostname
VPS_SSH_PORT=22
VPS_USER=your-ssh-user
VPS_SSH_PASS=
VPS_SSH_KEY=

# ============================================
# Security - Encryption
# ============================================
ENCRYPTION_KEY=$(openssl rand -base64 48)
PASSWORD_PEPPER=$(openssl rand -hex 32)
AUDIT_SIGNING_KEY=$(openssl rand -hex 32)
INTERNAL_API_SECRET=$(openssl rand -base64 32)

# ============================================
# AI Services - OpenRouter (Gemini 2.0, Mistral, etc.)
# Get your key at: https://openrouter.ai/keys
# ============================================
OPENROUTER_API_KEY=

# ============================================
# Derived Connection Strings (DO NOT EDIT)
# ============================================
DATABASE_URL=postgresql://portfolio_user:\${POSTGRES_PASSWORD}@db:5432/portfolio_db?schema=public
OUTERBASE_DATABASE_URL=postgresql://portfolio_user:\${POSTGRES_PASSWORD}@db:5432/portfolio_db
EOF
    echo -e "${GREEN}.env file created with random secrets!${NC}"
    echo -e "${YELLOW}⚠️  Don't forget to update NEXTAUTH_URL with your domain!${NC}"
    echo -e "${YELLOW}⚠️  Configure VPS_HOST/VPS_USER and either VPS_SSH_PASS or VPS_SSH_KEY for VPS Control!${NC}"
    echo -e "${YELLOW}⚠️  Add your OPENROUTER_API_KEY for AI features!${NC}"
fi

# Backfill missing security keys for existing .env files.
if ! grep -q '^PASSWORD_PEPPER=' "$DEPLOY_DIR/DOCKER/.env"; then
    echo "PASSWORD_PEPPER=$(openssl rand -hex 32)" >> "$DEPLOY_DIR/DOCKER/.env"
fi

if ! grep -q '^AUDIT_SIGNING_KEY=' "$DEPLOY_DIR/DOCKER/.env"; then
    echo "AUDIT_SIGNING_KEY=$(openssl rand -hex 32)" >> "$DEPLOY_DIR/DOCKER/.env"
fi

if ! grep -q '^INTERNAL_API_SECRET=' "$DEPLOY_DIR/DOCKER/.env"; then
    echo "INTERNAL_API_SECRET=$(openssl rand -base64 32)" >> "$DEPLOY_DIR/DOCKER/.env"
fi

# Create uploads directory for finance module
echo -e "${YELLOW}Creating uploads directory...${NC}"
mkdir -p $DEPLOY_DIR/DOCKER/volumes/uploads
chmod 755 $DEPLOY_DIR/DOCKER/volumes/uploads

# Sync Docker secrets files from .env
echo -e "${YELLOW}Syncing Docker secrets...${NC}"
chmod +x $DEPLOY_DIR/DOCKER/sync-secrets.sh $DEPLOY_DIR/DOCKER/reseed-admin.sh
$DEPLOY_DIR/DOCKER/sync-secrets.sh $DEPLOY_DIR/DOCKER/.env $DEPLOY_DIR/DOCKER/secrets

# Start services
echo -e "${YELLOW}Starting services...${NC}"
cd $DEPLOY_DIR/DOCKER
docker compose up -d

# Wait for DB to be ready
echo -e "${YELLOW}Waiting for database...${NC}"
sleep 10

# Run Prisma migrations
echo -e "${YELLOW}Running database migrations...${NC}"
docker compose exec web sh -lc 'if [ -x node_modules/.bin/prisma ]; then node_modules/.bin/prisma db push; elif [ -f node_modules/prisma/build/index.js ]; then node node_modules/prisma/build/index.js db push; else echo "Prisma CLI not found inside container" >&2; exit 127; fi' || \
    echo -e "${YELLOW}⚠️  Migration skipped: Prisma CLI dependencies missing in runtime image. Continuing deploy.${NC}"

# Re-seed admin credentials and admin-linked quotation fixtures
echo -e "${YELLOW}Syncing admin seed with current secrets...${NC}"
$DEPLOY_DIR/DOCKER/reseed-admin.sh $DEPLOY_DIR/DOCKER $DEPLOY_DIR/DOCKER/.env

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Services running:"
echo "  - Web:        http://localhost:3000"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis:      localhost:6379"
echo ""
echo "Development mode (includes OuterBase GUI):"
echo "  docker compose --profile dev up -d"
echo "  - OuterBase:  http://localhost:8080"
echo ""
echo "Production mode (includes Nginx SSL):"
echo "  docker compose --profile production up -d"
echo ""
echo "Next steps:"
echo "  1. Configure your domain DNS to point to this server"
echo "  2. Set up SSL with Let's Encrypt (certbot)"
echo "  3. Update NEXTAUTH_URL in .env with your domain"
echo "  4. Add OPENROUTER_API_KEY in .env for AI features"
echo "  5. Create your admin user in the database"
