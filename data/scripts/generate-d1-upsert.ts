import { promises as fs } from "fs";
import * as path from "path";

type ProductionLocation = {
  location_id: string;
  name: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number];
  };
  category?: string;
  era?: string;
  deep_history?: unknown;
  tags?: unknown;
  tts_hints?: unknown;
};

const cwd = process.cwd();
const DATA_DIR = path.basename(cwd).toLowerCase() === "data" ? cwd : path.resolve(cwd, "data");
const INPUT_PATH = path.resolve(DATA_DIR, "production_srilanka_db.json");
const OUTPUT_PATH = path.resolve(DATA_DIR, "seed-upsert.sql");

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

function sqlText(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return "NULL";
  }
  return `'${escapeSqlString(value)}'`;
}

function sqlReal(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid numeric value: ${value}`);
  }
  return String(value);
}

async function run(): Promise<void> {
  const raw = await fs.readFile(INPUT_PATH, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected an array in ${INPUT_PATH}`);
  }

  const rows = parsed as ProductionLocation[];

  const statements: string[] = [];
  statements.push("-- Auto-generated D1 upsert SQL for heritage locations");
  statements.push(`CREATE TABLE IF NOT EXISTS heritage_locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  longitude REAL NOT NULL,
  latitude REAL NOT NULL,
  category TEXT,
  era TEXT,
  deep_history TEXT, -- Store the JSON stringified
  tags TEXT, -- Store the JSON stringified array
  tts_hints TEXT -- Store the JSON stringified
);`);
  statements.push("");

  let upsertedCount = 0;

  for (const item of rows) {
    const coords = item.coordinates?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) {
      continue;
    }

    const longitude = Number(coords[0]);
    const latitude = Number(coords[1]);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      continue;
    }

    const deepHistoryJson = JSON.stringify(item.deep_history ?? null);
    const tagsJson = JSON.stringify(item.tags ?? []);
    const ttsHintsJson = JSON.stringify(item.tts_hints ?? null);

    statements.push(
      `INSERT OR REPLACE INTO heritage_locations (id, name, longitude, latitude, category, era, deep_history, tags, tts_hints) VALUES (${sqlText(
        item.location_id
      )}, ${sqlText(item.name)}, ${sqlReal(longitude)}, ${sqlReal(latitude)}, ${sqlText(
        item.category ?? null
      )}, ${sqlText(item.era ?? null)}, ${sqlText(deepHistoryJson)}, ${sqlText(tagsJson)}, ${sqlText(
        ttsHintsJson
      )});`
    );
    upsertedCount += 1;
  }

  statements.push("");
  await fs.writeFile(OUTPUT_PATH, `${statements.join("\n")}\n`, "utf8");

  console.log(`Generated ${OUTPUT_PATH} with ${upsertedCount} UPSERT rows.`);
}

run().catch((error) => {
  console.error("Failed to generate D1 upsert SQL.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
