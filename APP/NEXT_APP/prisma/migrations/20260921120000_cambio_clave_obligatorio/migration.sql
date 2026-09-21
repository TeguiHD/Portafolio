-- Cambio de clave obligatorio tras entregar una temporal.
-- Aditiva y con valor por omisión: no toca ninguna fila existente ni rompe el arranque.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);
