import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import fs from "fs";
import { PDFParse } from "pdf-parse";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../.env.local") });

const PDF_PATH = path.join(
  __dirname,
  "../../public/Carga inicial de ejercicios.pdf"
);

function isNoiseLine(line) {
  const l = line.trim();
  if (!l) return true;
  if (/^-- \d+ of \d+ --$/.test(l)) return true;
  if (/^[Xx.\s]+$/.test(l)) return true;
  if (/bloque\s+ejercicio\s+dosis\s+video/i.test(l)) return true;
  if (/^(planos?|plano)$/i.test(l)) return true;
  if (/^(bloque|ejercicio|dosis|video)$/i.test(l)) return true;

  const categories = [
    "neurodinámia",
    "neurodinamia",
    "analíticos",
    "analiticos",
    "estructura",
    "foam",
    "movilizar",
    "estiramiento estático activo",
    "estiramiento estatico activo",
    "estiramiento dinámico",
    "estiramiento dinamico",
    'ais “active isolated stretching”',
    'ais "active isolated stretching"',
    "ais active isolated stretching",
    "pnf",
    "pnf/crac (distracción)",
    "pnf/crac (distraccion)",
    "estabilidad (bajo carga)> fuerza analítica",
    "estabilidad (bajo carga)> fuerza analitica",
    "tobillo",
    "rodilla",
    "cadera",
    "hombro",
    "columna",
    "cervical",
    "lumbar",
    "muñeca",
    "muneca",
    "codo",
    "mano",
    "pie",
    "core",
    "1er meta",
    "iso",
    "ecc",
    "cuadric",
    "l.corta",
    "isquio",
    "tibial",
    "posteri",
    "perone",
    "soleo",
    "gemelo",
  ];

  const normalized = l
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return categories.some((c) => {
    const cn = c
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return normalized === cn;
  });
}

function sqlEscape(value) {
  if (value == null) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function slugCode(title, index) {
  const base = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28);
  return `${String(index).padStart(3, "0")}-${base || "EXE"}`;
}

function cleanTitle(raw) {
  return raw
    .replace(/^PLANOS?\s+/i, "")
    .replace(/^[“"']+|[”"']+$/g, "")
    .replace(/^["]+/, "")
    .trim();
}

function parseExercises(text) {
  const chunks = text.split(/\bLink\b/i);
  const exercises = [];
  const seen = new Set();

  for (const chunk of chunks) {
    const lines = chunk
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => !isNoiseLine(l));

    if (!lines.length) continue;

    // Sometimes title is prefixed with anatomy fragment on previous short line
    let startIdx = 0;
    if (
      lines.length > 1 &&
      lines[0].length <= 18 &&
      !/[a-z]{4,}/.test(lines[0]) &&
      /raise|stretch|slide|curl|press|hold|walk|circle|masaje|moviliz|estiramiento|flexion|extension|band|iso|ecc|pnf|distraction|adduction|abduction/i.test(
        lines[1]
      )
    ) {
      // keep as part of title prefix if useful, else skip
      startIdx = 0;
    }

    const title = cleanTitle(lines[startIdx]);
    if (!title || title.length < 3) continue;
    if (isNoiseLine(title)) continue;

    const description =
      lines
        .slice(startIdx + 1)
        .map(cleanTitle)
        .filter((l) => !isNoiseLine(l))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim() || null;

    // Drop dose leftovers like "2x8 Lado 2:3:2" alone titles? keep if meaningful
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    exercises.push({ title, description });
  }

  return exercises;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const sqlOnly = process.argv.includes("--sql");

  const buf = fs.readFileSync(PDF_PATH);
  const parser = new PDFParse({ data: buf });
  const { text } = await parser.getText();
  const parsed = parseExercises(text);

  const rows = parsed.map((e, i) => ({
    code: slugCode(e.title, i + 1),
    title: e.title,
    description: e.description,
    video_url: null,
  }));

  console.log(`Ejercicios detectados: ${rows.length}`);
  for (const e of rows.slice(0, 15)) {
    console.log(`- [${e.code}] ${e.title}`);
  }
  if (rows.length > 15) console.log(`… y ${rows.length - 15} más`);

  if (dryRun) return;

  if (sqlOnly) {
    const values = rows
      .map(
        (r) =>
          `(${sqlEscape(r.code)}, ${sqlEscape(r.title)}, ${sqlEscape(r.description)}, NULL)`
      )
      .join(",\n  ");
    const sql = `-- Carga inicial de ejercicios desde PDF
insert into public.exercises (code, title, description, video_url)
values
  ${values};
`;
    const outSql = path.join(__dirname, "seed-exercises.sql");
    fs.writeFileSync(outSql, sql, "utf8");

    const outJson = path.join(__dirname, "../src/data/exercises-seed.json");
    fs.mkdirSync(path.dirname(outJson), { recursive: true });
    fs.writeFileSync(outJson, JSON.stringify(rows, null, 2), "utf8");

    console.log(`SQL generado: ${outSql}`);
    console.log(`JSON generado: ${outJson}`);
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || /your_|tu_/.test(serviceKey)) {
    throw new Error(
      "Configura SUPABASE_SERVICE_ROLE_KEY en .env.local o ejecuta con --sql"
    );
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const batchSize = 40;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from("exercises").insert(batch);
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    inserted += batch.length;
    console.log(`Insertados ${inserted}/${rows.length}`);
  }

  console.log("Importación completada.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
