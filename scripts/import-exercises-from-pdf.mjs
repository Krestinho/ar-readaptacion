import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import fs from "fs";
import { PDFParse } from "pdf-parse";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../.env.local") });

const PDF_PATH = path.join(
  __dirname,
  "../../public/Carga inicial de ejercicios.pdf"
);

const TOP_EXERCISE_GROUPS = ["NEURODINÁMIA", "ANALÍTICOS"];

const EXERCISE_SUB_GROUPS = [
  "Estructura",
  "Foam",
  "Movilizar",
  "Estiramiento estático activo",
  "Estiramiento dinámico",
  'AIS "Active isolated stretching"',
  "PNF",
  "PNF/CrAc (distracción)",
  "Estabilidad (bajo carga)> fuerza analítica",
  "Tobillo",
  "Rodilla",
  "Cadera",
  "Hombro",
  "Columna",
  "Cervical",
  "Lumbar",
  "Muñeca",
  "Codo",
  "Mano",
  "Pie",
  "Core",
];

const TOP_GROUP_LOOKUP = new Map(
  TOP_EXERCISE_GROUPS.map((g) => [normalizeGroupKey(g), g])
);
const SUB_GROUP_LOOKUP = new Map(
  EXERCISE_SUB_GROUPS.map((g) => [normalizeGroupKey(g), g])
);
const GROUP_CONTEXT_SKIP = new Set(
  ["1er meta", "plano", "planos"].map(normalizeGroupKey)
);

/** Códigos de la columna «Bloque» del PDF (PLANOS, ECC, …). No son grupos. */
const PDF_BLOCK_CODES = new Set(
  [
    "PLANOS",
    "PE",
    "ECC",
    "ADD",
    "IR",
    "ER",
    "EXT",
    "FLEX",
    "ABD",
    "DB",
    "KB",
    "ISO",
    "LMN",
    "LS",
    "PIMA",
    "BB",
    "CMJ",
  ].map(normalizeGroupKey)
);

function normalizeGroupKey(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function matchTopGroup(line) {
  return TOP_GROUP_LOOKUP.get(normalizeGroupKey(line)) ?? null;
}

function matchSubGroup(line) {
  const key = normalizeGroupKey(line);
  if (GROUP_CONTEXT_SKIP.has(key)) return null;
  return SUB_GROUP_LOOKUP.get(key) ?? null;
}

function formatExerciseGroupName(topGroup, subGroup) {
  if (subGroup && topGroup) return `${topGroup} · ${subGroup}`;
  if (topGroup) return topGroup;
  if (subGroup) return subGroup;
  return null;
}

function isNoiseLine(line) {
  const l = line.trim();
  if (!l) return true;
  if (/^-- \d+ of \d+ --$/.test(l)) return true;
  if (/^[Xx.\s]+$/.test(l)) return true;
  if (/bloque\s+ejercicio\s+dosis\s+video/i.test(l)) return true;
  if (/^(bloque|ejercicio|dosis|video)$/i.test(l)) return true;

  if (matchTopGroup(l) || matchSubGroup(l)) return true;

  const categories = [
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

  const normalized = normalizeGroupKey(l);
  return categories.some((c) => normalized === normalizeGroupKey(c));
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

function isPdfBlockCode(token) {
  return PDF_BLOCK_CODES.has(normalizeGroupKey(token));
}

function updateGroupContext(line, state) {
  const top = matchTopGroup(line);
  if (top) {
    state.topGroup = top;
    state.subGroup = null;
    return;
  }

  const sub = matchSubGroup(line);
  if (sub) {
    state.subGroup = sub;
  }
}

function parseExercisesWithGroups(text, linkUrls) {
  const chunks = text.split(/\bLink\b/i);
  const exercises = [];
  const seen = new Set();
  const groupState = { topGroup: null, subGroup: null };

  const headerRe = /bloque\s+ejercicio\s+dosis\s+video/i;

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    const rawLines = chunk
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (!rawLines.length) continue;

    const headerIdx = rawLines.findIndex((l) => headerRe.test(l));

    for (const line of headerIdx >= 0 ? rawLines.slice(0, headerIdx) : rawLines) {
      updateGroupContext(line, groupState);
    }

    const contentLines = headerIdx >= 0 ? rawLines.slice(headerIdx + 1) : rawLines;
    if (!contentLines.length) continue;

    const content = contentLines
      .filter((l) => !/^--\s*\d+\s+of\s+\d+\s*--$/i.test(l))
      .filter((l) => !/^(x|X)$/i.test(l))
      .filter((l) => !isNoiseLine(l));

    if (!content.length) continue;

    let titleLine = content[0];
    let titleLineIndex = 0;
    const possibleBlockAndTitle = content[0].match(
      /^([A-ZÁÉÍÓÚÜÑ0-9\/]{2,})\s+(.+)$/
    );

    if (possibleBlockAndTitle && isPdfBlockCode(possibleBlockAndTitle[1])) {
      titleLine = possibleBlockAndTitle[2];
      titleLineIndex = 0;
    }

    const title = cleanTitle(titleLine);
    if (!title || title.length < 3) continue;
    if (isNoiseLine(title)) continue;

    let description =
      content
        .slice(titleLineIndex + 1)
        .map(cleanTitle)
        .filter((l) => !isNoiseLine(l))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim() || null;

    if (description) {
      const titleNorm = title.toLowerCase();
      const descNorm = description.toLowerCase();
      if (descNorm.startsWith(titleNorm)) {
        description =
          description.slice(title.length).replace(/^[\s:.-]+/, "").trim() || null;
      }
    }

    const groupName = formatExerciseGroupName(
      groupState.topGroup,
      groupState.subGroup
    );

    const key = `${groupName || ""}|${title}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const videoUrl = linkUrls?.[chunkIndex] ?? null;

    exercises.push({ title, description, group_name: groupName, videoUrl });
  }

  return exercises;
}

async function extractLinkUrlsFromPdf(pdfPath) {
  const buf = fs.readFileSync(pdfPath);
  const data = new Uint8Array(buf);
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  const urls = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const annots = await page.getAnnotations();
    for (const a of annots || []) {
      if (a?.subtype === "Link" && a.url) {
        urls.push(a.url);
      }
    }
  }
  return urls;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const sqlOnly = process.argv.includes("--sql");

  const buf = fs.readFileSync(PDF_PATH);
  const parser = new PDFParse({ data: buf });
  const { text } = await parser.getText();
  const linkUrls = await extractLinkUrlsFromPdf(PDF_PATH);
  const parsed = parseExercisesWithGroups(text, linkUrls);

  if (!dryRun && !sqlOnly) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error: deletePlanExercisesError } = await supabase
      .from("plan_exercises")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (deletePlanExercisesError) {
      throw new Error(
        `Error borrando plan_exercises: ${deletePlanExercisesError.message}`
      );
    }

    const { error: deleteExercisesError } = await supabase
      .from("exercises")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteExercisesError) {
      throw new Error(
        `Error borrando ejercicios existentes: ${deleteExercisesError.message}`
      );
    }
  }

  const rows = parsed.map((e, i) => ({
    code: slugCode(e.title, i + 1),
    title: e.title,
    group_name: e.group_name ?? null,
    description: e.description ?? null,
    video_url: e.videoUrl ?? null,
  }));

  console.log(`Ejercicios detectados: ${rows.length}`);
  const groupCounts = {};
  for (const row of rows) {
    const g = row.group_name || "(sin grupo)";
    groupCounts[g] = (groupCounts[g] || 0) + 1;
  }
  console.log("Grupos:", groupCounts);
  for (const e of rows.slice(0, 10)) {
    console.log(`- [${e.group_name ?? "—"}] ${e.title}`);
  }
  if (rows.length > 10) console.log(`… y ${rows.length - 10} más`);

  if (dryRun) return;

  if (sqlOnly) {
    const values = rows
      .map(
        (r) =>
          `(${sqlEscape(r.code)}, ${sqlEscape(r.title)}, ${sqlEscape(
            r.group_name
          )}, ${sqlEscape(r.description)}, ${sqlEscape(r.video_url)})`
      )
      .join(",\n  ");
    const sql = `-- Carga inicial de ejercicios desde PDF
insert into public.exercises (code, title, group_name, description, video_url)
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
