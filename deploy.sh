#!/bin/bash
set -e

# ============================================
# Portfolio Deployment Script
# Build locally, deploy to remote VM
# ============================================

# Configuration - Set these before running!
VM_USER="${VM_USER:-your_username}"
VM_HOST="${VM_HOST:-your_vm_ip}"
VM_DIR="${VM_DIR:-~/portfolio}"

# Check if sshpass is available (for non-interactive deployment)
# Otherwise, you'll be prompted for password
if ! command -v sshpass &> /dev/null && [ -n "$VM_PASS" ]; then
    echo "⚠️  sshpass not installed. Install with: sudo apt install sshpass"
    echo "   Continuing with interactive SSH..."
fi

# Function to run remote commands
run_remote() {
    if [ -n "$VM_PASS" ] && command -v sshpass &> /dev/null; then
        sshpass -p "$VM_PASS" ssh -o StrictHostKeyChecking=no $VM_USER@$VM_HOST "$1"
    else
        ssh -o StrictHostKeyChecking=no $VM_USER@$VM_HOST "$1"
    fi
}

# Function to copy files
copy_file() {
    if [ -n "$VM_PASS" ] && command -v sshpass &> /dev/null; then
        sshpass -p "$VM_PASS" scp -o StrictHostKeyChecking=no -r $1 $VM_USER@$VM_HOST:$2
    else
        scp -o StrictHostKeyChecking=no -r $1 $VM_USER@$VM_HOST:$2
    fi
}

echo "========================================="
echo "🚀 Portfolio Deployment Script"
echo "========================================="
echo "Target: $VM_USER@$VM_HOST:$VM_DIR"
echo ""

# Validate environment
if [ "$VM_USER" = "your_username" ] || [ "$VM_HOST" = "your_vm_ip" ]; then
    echo "❌ Please set VM_USER and VM_HOST environment variables first!"
    echo ""
    echo "Example usage:"
    echo "  VM_USER=teguihd VM_HOST=192.168.1.100 ./deploy.sh"
    echo ""
    echo "Or with password (less secure):"
    echo "  VM_USER=teguihd VM_HOST=192.168.1.100 VM_PASS=secret ./deploy.sh"
    exit 1
fi

# 1. Build locally with Podman/Docker
echo "🔨 Building Docker image locally..."
cd APP/NEXT_APP
if command -v podman &> /dev/null; then
    podman build -t portfolio_web -f ../../DOCKER/Dockerfile.web .
else
    docker build -t portfolio_web -f ../../DOCKER/Dockerfile.web .
fi
cd ../..

# 2. Save image to tar
echo "💾 Saving image to tar file..."
rm -f portfolio_web.tar
if command -v podman &> /dev/null; then
    podman save -o portfolio_web.tar portfolio_web
else
    docker save -o portfolio_web.tar portfolio_web
fi

# 3. Stop existing services on VM
echo "🧹 Stopping existing services on VM..."
run_remote "docker rm -f \$(docker ps -aq) 2>/dev/null || true"

# 4. Create directories on VM
echo "📁 Preparing directories on VM..."
run_remote "mkdir -p $VM_DIR/DOCKER/nginx/ssl && mkdir -p $VM_DIR/DOCKER/postgres-init && mkdir -p $VM_DIR/DOCKER/volumes/uploads"

# 5. Transfer files
echo "📤 Transferring files to VM..."
copy_file "portfolio_web.tar" "$VM_DIR/"
copy_file "DOCKER/.env" "$VM_DIR/DOCKER/"
copy_file "DOCKER/docker-compose.yml" "$VM_DIR/DOCKER/"
copy_file "DOCKER/nginx/" "$VM_DIR/DOCKER/"
copy_file "DOCKER/postgres-init/" "$VM_DIR/DOCKER/"

# 6. Deploy on VM
echo "🚀 Deploying application..."
run_remote "cd $VM_DIR && \
    echo 'Loading Docker image...' && \
    docker load -i portfolio_web.tar && \
    cd DOCKER && \
    echo 'Starting services...' && \
    docker compose up -d && \
    sleep 10 && \
    echo 'Running migrations...' && \
    docker compose exec -T web npx prisma db push"

echo ""
echo "✅ Deployment Complete!"
echo "🌐 App available at: http://$VM_HOST:3000"
echo ""
echo "Next steps:"
echo "  - Set up SSL certificates (Let's Encrypt)"
echo "  - Configure Nginx reverse proxy"
echo "  - Run seed: docker compose exec web npx tsx prisma/seed.ts"
