import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import fs from "fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../.env.local") });

const PDF_PATH = path.join(
  __dirname,
  "../../public/Carga inicial de ejercicios.pdf"
);

const GROUP_NAME_SEPARATOR = " · ";
const HEADING_LEVELS = 5;

function formatExerciseGroupName(headings) {
  const parts = headings
    .map((heading) => heading?.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(GROUP_NAME_SEPARATOR) : null;
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

function collectContentIds(node, ids = []) {
  if (!node) return ids;
  if (node.type === "content" && node.id) ids.push(node.id);
  for (const child of node.children || []) collectContentIds(child, ids);
  return ids;
}

function collectObjectIds(node, ids = []) {
  if (!node) return ids;
  if (node.type === "object" && node.id) ids.push(node.id);
  for (const child of node.children || []) collectObjectIds(child, ids);
  return ids;
}

function findRoles(node, role, acc = []) {
  if (!node) return acc;
  if (node.role === role) acc.push(node);
  for (const child of node.children || []) findRoles(child, role, acc);
  return acc;
}

function nodeText(node, textByMcid) {
  return collectContentIds(node)
    .map((id) => (textByMcid[id] || "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function cellLines(node, itemsByMcid) {
  const items = collectContentIds(node)
    .flatMap((id) => itemsByMcid[id] || [])
    .filter((item) => item.str);

  if (!items.length) return [];

  const lines = [];
  let currentY = items[0].y;
  let current = "";

  for (const item of items) {
    if (item.y != null && currentY != null && Math.abs(item.y - currentY) > 2) {
      const line = current.replace(/\s+/g, " ").trim();
      if (line) lines.push(line);
      current = item.str;
      currentY = item.y;
    } else {
      current += item.str;
      if (item.y != null) currentY = item.y;
    }
  }

  const line = current.replace(/\s+/g, " ").trim();
  if (line) lines.push(line);
  return lines;
}

function extractTitleAndDescription(cell, textByMcid, itemsByMcid) {
  const lines = cellLines(cell, itemsByMcid).filter(
    (line) => !isPlaceholderTitle(line)
  );
  if (lines.length > 0) {
    return {
      title: lines[0],
      description: lines.slice(1).join(" ") || null,
    };
  }

  const fallback = nodeText(cell, textByMcid);
  return { title: fallback, description: null };
}

function isPlaceholderTitle(title) {
  const compact = title.replace(/\s+/g, "").trim();
  return !compact || /^[Xx.]+$/.test(compact);
}

function cleanTitle(raw) {
  return raw
    .replace(/^[“"']+|[”"']+$/g, "")
    .replace(/^["]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function applyHeading(headings, level, title) {
  const text = title?.replace(/\s+/g, " ").trim();
  if (!text) return;
  headings[level - 1] = text;
  for (let i = level; i < HEADING_LEVELS; i++) headings[i] = null;
}

function buildPageIndex(textContent) {
  const textByMcid = {};
  const itemsByMcid = {};
  let currentId = null;

  for (const item of textContent.items) {
    if (item.type === "beginMarkedContentProps" && item.id) {
      currentId = item.id;
      if (!textByMcid[currentId]) textByMcid[currentId] = "";
      if (!itemsByMcid[currentId]) itemsByMcid[currentId] = [];
    } else if (item.type === "endMarkedContent") {
      currentId = null;
    } else if (currentId && item.str != null) {
      textByMcid[currentId] += item.str;
      itemsByMcid[currentId].push({
        str: item.str,
        hasEOL: item.hasEOL,
        y: item.transform?.[5] ?? null,
      });
    }
  }

  return { textByMcid, itemsByMcid };
}

function annotationUrlMap(annotations) {
  const map = new Map();
  for (const annotation of annotations || []) {
    if (annotation?.subtype === "Link" && annotation.url && annotation.id) {
      map.set(annotation.id, annotation.url);
    }
  }
  return map;
}

function videoUrlForRow(row, urlByAnnotId) {
  for (const link of findRoles(row, "Link")) {
    for (const objectId of collectObjectIds(link)) {
      const url = urlByAnnotId.get(objectId);
      if (url) return url;
    }
  }
  return null;
}

/**
 * Recorre el PDF etiquetado (Word) y asigna `group_name` con los
 * encabezados H1–H5 vigentes en cada ejercicio.
 */
async function parseExercisesFromPdf(pdfPath) {
  const buf = fs.readFileSync(pdfPath);
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const headings = Array(HEADING_LEVELS).fill(null);
  const exercises = [];
  const seen = new Set();

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const structTree = await page.getStructTree();
    if (!structTree) continue;

    const textContent = await page.getTextContent({ includeMarkedContent: true });
    const { textByMcid, itemsByMcid } = buildPageIndex(textContent);
    const urlByAnnotId = annotationUrlMap(await page.getAnnotations());

    function walk(node) {
      if (!node) return;

      const headingMatch = node.role && /^H([1-5])$/.exec(node.role);
      if (headingMatch) {
        applyHeading(headings, Number(headingMatch[1]), nodeText(node, textByMcid));
        return;
      }

      if (node.role === "Table") {
        for (const tbody of findRoles(node, "TBody")) {
          for (const row of (tbody.children || []).filter((child) => child.role === "TR")) {
            const cells = (row.children || []).filter(
              (child) => child.role === "TH" || child.role === "TD"
            );
            if (cells.length < 2) continue;

            const { title: rawTitle, description: rawDescription } =
              extractTitleAndDescription(cells[1], textByMcid, itemsByMcid);
            const title = cleanTitle(rawTitle);
            if (isPlaceholderTitle(title) || title.length < 3) continue;

            const description =
              rawDescription?.replace(/\s+/g, " ").trim() || null;
            const groupName = formatExerciseGroupName(headings);
            const key = `${groupName || ""}|${title}`.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);

            exercises.push({
              title,
              description,
              group_name: groupName,
              videoUrl: videoUrlForRow(row, urlByAnnotId),
            });
          }
        }
        return;
      }

      for (const child of node.children || []) walk(child);
    }

    walk(structTree);
  }

  return exercises;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const sqlOnly = process.argv.includes("--sql");

  const parsed = await parseExercisesFromPdf(PDF_PATH);

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

  const rows = parsed.map((exercise, index) => ({
    code: slugCode(exercise.title, index + 1),
    title: exercise.title,
    group_name: exercise.group_name ?? null,
    description: exercise.description ?? null,
    video_url: exercise.videoUrl ?? null,
  }));

  console.log(`Ejercicios detectados: ${rows.length}`);
  const groupCounts = {};
  for (const row of rows) {
    const group = row.group_name || "(sin grupo)";
    groupCounts[group] = (groupCounts[group] || 0) + 1;
  }
  console.log("Grupos:", groupCounts);
  for (const exercise of rows.slice(0, 12)) {
    console.log(`- [${exercise.group_name ?? "—"}] ${exercise.title}`);
  }
  if (rows.length > 12) console.log(`… y ${rows.length - 12} más`);

  if (dryRun) return;

  if (sqlOnly) {
    const values = rows
      .map(
        (row) =>
          `(${sqlEscape(row.code)}, ${sqlEscape(row.title)}, ${sqlEscape(
            row.group_name
          )}, ${sqlEscape(row.description)}, ${sqlEscape(row.video_url)})`
      )
      .join(",\n  ");
    const sql = `-- Carga inicial de ejercicios desde PDF (group_name = encabezados 1–5)
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
