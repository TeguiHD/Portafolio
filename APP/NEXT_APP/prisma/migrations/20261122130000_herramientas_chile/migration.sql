-- Herramientas chilenas (22-11-2026): RUT, UF/UTM, sueldo líquido y boleta de honorarios. Públicas y activas, como en el
-- registro (src/lib/tool-registry.ts). Si ya existen (alguien las creó en el panel), no se tocan.
INSERT INTO "Tool" ("id", "slug", "name", "description", "icon", "category", "isPublic", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
  ('tool_chile_rut', 'rut', 'Validador de RUT', 'Valida un RUT o una lista entera, calcula el dígito verificador y genera RUT de prueba para formularios.', 'rut', 'chile', true, true, 30, NOW(), NOW()),
  ('tool_chile_uf_utm', 'uf-utm', 'Conversor UF, UTM y dólar', 'Convierte UF, UTM, dólares y euros a pesos chilenos y al revés, con los valores de hoy.', 'uf-utm', 'chile', true, true, 31, NOW(), NOW()),
  ('tool_chile_sueldo', 'sueldo-liquido', 'Calculadora de sueldo líquido', 'Calcula el sueldo líquido desde el bruto, o el bruto que necesitas, con AFP, salud, cesantía e impuesto.', 'sueldo-liquido', 'chile', true, true, 32, NOW(), NOW()),
  ('tool_chile_honorarios', 'boleta-honorarios', 'Calculadora de boleta de honorarios', 'Calcula cuánto recibes de una boleta de honorarios, o cuánto cobrar, con la retención de este año.', 'boleta-honorarios', 'chile', true, true, 33, NOW(), NOW())
ON CONFLICT ("slug") DO NOTHING;
