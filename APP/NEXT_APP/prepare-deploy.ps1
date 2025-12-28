# Script de preparación de despliegue - Windows PowerShell
# Ejecutar en tu PC antes de subir por SFTP

Write-Host "🔨 Preparando despliegue..." -ForegroundColor Cyan

# 1. Build de producción
Write-Host "📦 Compilando aplicación..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en el build" -ForegroundColor Red
    exit 1
}

# 2. Crear carpeta de despliegue
$deployDir = ".\deploy-package"
if (Test-Path $deployDir) {
    Remove-Item -Recurse -Force $deployDir
}
New-Item -ItemType Directory -Path $deployDir | Out-Null

# 3. Copiar archivos necesarios
Write-Host "📋 Copiando archivos..." -ForegroundColor Yellow

Copy-Item -Recurse ".next" "$deployDir\.next"
Copy-Item -Recurse "public" "$deployDir\public"
Copy-Item -Recurse "prisma" "$deployDir\prisma"
Copy-Item "package.json" "$deployDir\"
Copy-Item "package-lock.json" "$deployDir\"
Copy-Item "next.config.ts" "$deployDir\"
Copy-Item ".env.production.example" "$deployDir\"
Copy-Item "deploy.sh" "$deployDir\"

# 4. Crear ZIP
Write-Host "🗜️ Comprimiendo..." -ForegroundColor Yellow
$zipPath = ".\deploy-$(Get-Date -Format 'yyyyMMdd-HHmm').zip"
Compress-Archive -Path "$deployDir\*" -DestinationPath $zipPath -Force

# 5. Limpiar
Remove-Item -Recurse -Force $deployDir

Write-Host ""
Write-Host "✅ Paquete listo: $zipPath" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Cyan
Write-Host "1. Subir $zipPath al servidor por SFTP"
Write-Host "2. En el servidor: unzip deploy-*.zip"
Write-Host "3. Crear .env con las variables de producción"
Write-Host "4. Ejecutar: chmod +x deploy.sh && ./deploy.sh"
