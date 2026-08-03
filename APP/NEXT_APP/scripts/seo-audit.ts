/**
 * Auditoría SEO mecánica. Falla el proceso si alguna regla se rompe.
 * Uso: pnpm seo:audit
 */
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { TOOLS_SEO, type ToolSeoEntry } from "../src/lib/seo/tools-content";

const TOOLS_DIR = join(process.cwd(), "src/app/herramientas");
const TITLE_MIN = 50;
const TITLE_MAX = 60;
const DESC_MIN = 150;
const DESC_MAX = 160;

const errors: string[] = [];
const fail = (msg: string) => errors.push(msg);

function routeSlugs(): string[] {
    return readdirSync(TOOLS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .filter((d) => existsSync(join(TOOLS_DIR, d.name, "page.tsx")))
        .map((d) => d.name)
        .sort();
}

function checkCoverage(routes: string[]) {
    const registered = new Set(Object.keys(TOOLS_SEO));
    for (const slug of routes) {
        if (!registered.has(slug)) fail(`Ruta sin entrada en TOOLS_SEO: ${slug}`);
    }
    for (const slug of registered) {
        if (!routes.includes(slug)) fail(`Entrada en TOOLS_SEO sin ruta real: ${slug}`);
    }
}

function checkEntry(key: string, entry: ToolSeoEntry) {
    const { slug, title, description, h1, primaryKeyword, related } = entry;

    if (key !== slug) fail(`clave del registro "${key}" no coincide con entry.slug "${slug}"`);
    if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
        fail(`${slug}: title mide ${title.length}, debe estar entre ${TITLE_MIN} y ${TITLE_MAX}`);
    }
    if (description.length < DESC_MIN || description.length > DESC_MAX) {
        fail(`${slug}: description mide ${description.length}, debe estar entre ${DESC_MIN} y ${DESC_MAX}`);
    }
    if (h1.trim().length === 0) fail(`${slug}: h1 vacío`);
    if (primaryKeyword.trim().length === 0) fail(`${slug}: primaryKeyword vacío`);
    if (related.length < 2) fail(`${slug}: related necesita al menos 2 slugs para enlazado interno`);
    if (related.includes(slug)) fail(`${slug}: related se apunta a sí mismo`);
    for (const r of related) {
        if (!TOOLS_SEO[r]) fail(`${slug}: related apunta a slug inexistente "${r}"`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.lastModified)) {
        fail(`${slug}: lastModified debe ser YYYY-MM-DD, es "${entry.lastModified}"`);
    }
}

function checkUniqueness(field: "title" | "description" | "primaryKeyword") {
    const seen = new Map<string, string>();
    for (const entry of Object.values(TOOLS_SEO)) {
        const value = entry[field].trim().toLowerCase();
        const previous = seen.get(value);
        if (previous) fail(`${field} duplicado entre "${previous}" y "${entry.slug}": ${value}`);
        else seen.set(value, entry.slug);
    }
}

const routes = routeSlugs();
checkCoverage(routes);
Object.entries(TOOLS_SEO).forEach(([key, entry]) => checkEntry(key, entry));
(["title", "description", "primaryKeyword"] as const).forEach(checkUniqueness);

if (errors.length > 0) {
    console.error(`\n✗ Auditoría SEO: ${errors.length} problema(s)\n`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
}

console.log(`✓ Auditoría SEO OK — ${routes.length} herramientas, 0 problemas`);
