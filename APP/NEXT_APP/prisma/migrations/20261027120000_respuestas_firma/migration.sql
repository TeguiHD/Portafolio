-- Respuestas del cliente al firmar (campos y opciones que declara el documento).
ALTER TABLE "ClientApproval" ADD COLUMN IF NOT EXISTS "respuestas" JSONB;
