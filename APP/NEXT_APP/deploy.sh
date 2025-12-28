#!/bin/bash
# ===========================================
# Script de Despliegue - Portfolio
# ===========================================
# Ejecutar en el servidor después de subir archivos por SFTP
# Uso: chmod +x deploy.sh && ./deploy.sh

set -e

echo "🚀 Iniciando despliegue..."

# Verificar que exista .env
if [ ! -f ".env" ]; then
    echo "❌ Error: No existe archivo .env"
    echo "   Copia .env.production.example a .env y configura los valores"
    exit 1
fi

# Verificar que exista .next (app compilada)
if [ ! -d ".next" ]; then
    echo "❌ Error: No existe carpeta .next"
    echo "   Debes compilar la app en local con: npm run build"
    exit 1
fi

echo "📦 Instalando dependencias de producción..."
npm ci --only=production --ignore-scripts

echo "🔧 Generando cliente Prisma..."
npx prisma generate

echo "🗄️ Aplicando migraciones de base de datos..."
npx prisma migrate deploy

echo "🔄 Reiniciando aplicación con PM2..."
if pm2 list | grep -q "portfolio"; then
    pm2 restart portfolio
else
    pm2 start npm --name "portfolio" -- start
fi

pm2 save

echo ""
echo "✅ Despliegue completado!"
echo "   Ver logs: pm2 logs portfolio"
echo "   Ver estado: pm2 status"
