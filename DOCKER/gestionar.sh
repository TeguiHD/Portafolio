#!/bin/bash

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Gestión de Portafolio Docker ===${NC}"
echo "Directorio: $(pwd)"

PS3='¿Qué deseas hacer? (Ingresa el número): '
options=("🚀 Iniciar Todo (Background)" "🛑 Detener Todo" "🔄 Reiniciar Todo" "📜 Ver Logs (Web)" "📜 Ver Logs (BD)" "📊 Ver Estado" "🧹 Limpiar y Reconstruir" "Salir")

select opt in "${options[@]}"
do
    case $opt in
        "🚀 Iniciar Todo (Background)")
            echo -e "${GREEN}Iniciando contenedores...${NC}"
            sudo docker compose up -d
            echo -e "${GREEN}¡Listo! Accede a http://localhost:3000${NC}"
            break
            ;;
        "🛑 Detener Todo")
            echo -e "${RED}Deteniendo contenedores...${NC}"
            sudo docker compose down
            echo -e "${RED}Contenedores detenidos.${NC}"
            break
            ;;
        "🔄 Reiniciar Todo")
            echo -e "${BLUE}Reiniciando...${NC}"
            sudo docker compose restart
            break
            ;;
        "📜 Ver Logs (Web)")
            echo -e "${BLUE}Mostrando logs de la web (Ctrl+C para salir)...${NC}"
            sudo docker logs -f portfolio_web
            break
            ;;
        "📜 Ver Logs (BD)")
            echo -e "${BLUE}Mostrando logs de la BD (Ctrl+C para salir)...${NC}"
            sudo docker logs -f portfolio-db
            break
            ;;
        "📊 Ver Estado")
            sudo docker compose ps
            ;;
        "🧹 Limpiar y Reconstruir")
            echo -e "${RED}⚠️  Esto borrará los contenedores y los reconstruirá.${NC}"
            read -p "¿Estás seguro? (s/n): " confirm
            if [[ $confirm == "s" ]]; then
                sudo docker compose down
                sudo docker compose build --no-cache
                sudo docker compose up -d
            fi
            break
            ;;
        "Salir")
            break
            ;;
        *) echo "Opción inválida $REPLY";;
    esac
done
