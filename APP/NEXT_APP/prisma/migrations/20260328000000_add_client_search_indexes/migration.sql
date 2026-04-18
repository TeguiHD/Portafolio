-- Add indexes to QuotationClient for faster search queries
CREATE INDEX IF NOT EXISTS "QuotationClient_name_idx" ON "QuotationClient"("name");
CREATE INDEX IF NOT EXISTS "QuotationClient_email_idx" ON "QuotationClient"("email");
CREATE INDEX IF NOT EXISTS "QuotationClient_rut_idx" ON "QuotationClient"("rut");
CREATE INDEX IF NOT EXISTS "QuotationClient_contactEmail_idx" ON "QuotationClient"("contactEmail");
