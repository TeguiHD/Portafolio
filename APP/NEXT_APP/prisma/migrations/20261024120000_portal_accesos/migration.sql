-- Historial de ingresos al portal de clientes. Solo crea una tabla nueva: no toca datos existentes.
CREATE TABLE IF NOT EXISTS "PortalAcceso" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "exito" BOOLEAN NOT NULL,
    "motivo" TEXT NOT NULL,
    "ipCifrada" TEXT,
    "pais" TEXT,
    "ciudad" TEXT,
    "sistema" TEXT,
    "navegador" TEXT,
    "dispositivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortalAcceso_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PortalAcceso_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "QuotationClient"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "PortalAcceso_clientId_createdAt_idx" ON "PortalAcceso"("clientId", "createdAt");
CREATE INDEX IF NOT EXISTS "PortalAcceso_createdAt_idx" ON "PortalAcceso"("createdAt");

-- Índices para el panel: analíticas filtradas por fecha y pagos ordenados por fecha.
CREATE INDEX IF NOT EXISTS "PageView_createdAt_idx" ON "PageView"("createdAt");
CREATE INDEX IF NOT EXISTS "PageView_createdAt_path_idx" ON "PageView"("createdAt", "path");
CREATE INDEX IF NOT EXISTS "CtaClick_createdAt_idx" ON "CtaClick"("createdAt");
CREATE INDEX IF NOT EXISTS "QuotationPayment_createdAt_idx" ON "QuotationPayment"("createdAt");
