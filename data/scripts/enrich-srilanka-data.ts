import { promises as fs } from "fs";
import * as path from "path";
import OpenAI from "openai";

type SkeletonLocation = {
  location_id: string;
  name: string;
  category: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number];
  };
};

type GeneratedHistory = {
  era: string;
  summary: string;
  architectural_details: string;
  cultural_significance: string;
  tts_hints: {
    pronunciation_guide: string;
    key_facts_short: string;
  };
};

type ProductionLocation = {
  location_id: string;
  name: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number];
  };
  category: string;
  era: string;
  deep_history: {
    summary: string;
    architectural_details: string;
    cultural_significance: string;
  };
  tags: string[];
  tts_hints: {
    pronunciation_guide: string;
    key_facts_short: string;
  };
};

const cwd = process.cwd();
const DATA_DIR = path.basename(cwd).toLowerCase() === "data" ? cwd : path.resolve(cwd, "data");
const RAW_PATH = path.resolve(DATA_DIR, "raw_srilanka_skeleton.json");
const OUTPUT_PATH = path.resolve(DATA_DIR, "production_srilanka_db.json");

const MODEL = "gpt-4o-mini";
const BATCH_START = Number.parseInt(process.env.BATCH_START ?? "0", 10);
const BATCH_LIMIT = Number.parseInt(process.env.BATCH_LIMIT ?? "20", 10);
const REQUEST_DELAY_MS = Number.parseInt(process.env.REQUEST_DELAY_MS ?? "300", 10);
const MAX_RETRIES = Number.parseInt(process.env.MAX_RETRIES ?? "3", 10);
const FORCE_REFRESH = process.argv.includes("--force") || process.argv.includes("--refresh");
const DRY_RUN = process.argv.includes("--dry-run");

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  throw new Error("Model did not return a JSON object.");
}

function getRetryDelayMs(error: unknown): number {
  const fallbackMs = 7000;
  const message = error instanceof Error ? error.message : String(error);

  const secondsMatch = message.match(/retry in\s+(\d+(?:\.\d+)?)s/i);
  if (secondsMatch?.[1]) {
    return Math.ceil(Number(secondsMatch[1]) * 1000);
  }

  const msMatch = message.match(/retry in\s+(\d+(?:\.\d+)?)ms/i);
  if (msMatch?.[1]) {
    return Math.ceil(Number(msMatch[1]));
  }

  return fallbackMs;
}

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /429|rate.?limit|quota|too many requests/i.test(message);
}

async function writeProductionFile(rows: ProductionLocation[]): Promise<void> {
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(rows, null, 2), "utf8");
}

function validateGeneratedHistory(data: unknown): GeneratedHistory {
  const candidate = data as Partial<GeneratedHistory>;

  if (typeof candidate?.era !== "string" || !candidate.era.trim()) {
    throw new Error("Invalid era.");
  }
  if (
    typeof candidate?.summary !== "string" ||
    typeof candidate?.architectural_details !== "string" ||
    typeof candidate?.cultural_significance !== "string"
  ) {
    throw new Error("Invalid summary/architectural_details/cultural_significance fields.");
  }
  if (
    typeof candidate?.tts_hints?.pronunciation_guide !== "string" ||
    typeof candidate?.tts_hints?.key_facts_short !== "string"
  ) {
    throw new Error("Invalid tts_hints fields.");
  }

  return {
    era: candidate.era.trim(),
    summary: candidate.summary.trim(),
    architectural_details: candidate.architectural_details.trim(),
    cultural_significance: candidate.cultural_significance.trim(),
    tts_hints: {
      pronunciation_guide: candidate.tts_hints.pronunciation_guide.trim(),
      key_facts_short: candidate.tts_hints.key_facts_short.trim(),
    },
  };
}

function buildPrompt(location: SkeletonLocation): string {
  const [lon, lat] = location.coordinates.coordinates;

  return `
Return ONLY a strict JSON object with this exact structure (no markdown, no prose):
{
  "era": "string",
  "summary": "string",
  "architectural_details": "string",
  "cultural_significance": "string",
  "tts_hints": {
    "pronunciation_guide": "string",
    "key_facts_short": "string"
  }
}

Landmark context:
- location_id: ${location.location_id}
- name: ${location.name}
- category: ${location.category}
- latitude: ${lat}
- longitude: ${lon}

Requirements:
- Write historically grounded, concise, realistic content for Sri Lanka.
- Keep summary to 2-3 concise sentences.
- Avoid fabricated certainty; if uncertain, use careful wording.
`.trim();
}

async function enrichOne(client: OpenAI, location: SkeletonLocation): Promise<GeneratedHistory> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= MAX_RETRIES) {
    try {
      const response = await client.chat.completions.create({
        model: MODEL,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a Sri Lankan heritage researcher writing factual, concise tourism data. Always return valid JSON only.",
          },
          { role: "user", content: buildPrompt(location) },
        ],
      });

      const text = response.choices[0]?.message?.content ?? "";
      if (!text) {
        throw new Error("Empty model response.");
      }

      const jsonText = extractJsonObject(text);
      const parsed = JSON.parse(jsonText) as unknown;
      return validateGeneratedHistory(parsed);
    } catch (error) {
      lastError = error;

      if (!isRateLimitError(error) || attempt >= MAX_RETRIES) {
        break;
      }

      const waitMs = getRetryDelayMs(error);
      console.warn(
        `Rate limited for ${location.location_id}. Retrying in ${waitMs}ms (attempt ${attempt + 1}/${
          MAX_RETRIES
        })...`
      );
      await sleep(waitMs);
      attempt += 1;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function run(): Promise<void> {
  const rawText = await fs.readFile(RAW_PATH, "utf8");
  const allLocations = JSON.parse(rawText) as SkeletonLocation[];

  if (!Array.isArray(allLocations)) {
    throw new Error("Input file is not a valid array.");
  }

  const safeStart = Number.isFinite(BATCH_START) && BATCH_START >= 0 ? BATCH_START : 0;
  const safeLimit = Number.isFinite(BATCH_LIMIT) && BATCH_LIMIT > 0 ? BATCH_LIMIT : 20;
  const selected = allLocations.slice(safeStart, safeStart + safeLimit);

  let existingRows: ProductionLocation[] = [];
  try {
    const existingText = await fs.readFile(OUTPUT_PATH, "utf8");
    const parsed = JSON.parse(existingText) as ProductionLocation[];
    if (Array.isArray(parsed)) {
      existingRows = parsed;
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      throw new Error(
        `Could not read existing production file at ${OUTPUT_PATH}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  const rowsById = new Map(existingRows.map((row) => [row.location_id, row]));
  const existingIds = new Set(rowsById.keys());
  const pending = FORCE_REFRESH ? selected : selected.filter((location) => !existingIds.has(location.location_id));
  const existingInSelection =
    selected.length - selected.filter((location) => !existingIds.has(location.location_id)).length;
  const newCount = selected.length - existingInSelection;
  const overwriteCount = FORCE_REFRESH ? existingInSelection : 0;
  const skippedCount = FORCE_REFRESH ? 0 : existingInSelection;

  console.log(
    `Enriching ${pending.length}/${selected.length} locations (start=${safeStart}, limit=${safeLimit}) using ${MODEL}. Existing records loaded: ${existingRows.length}. Mode: ${
      FORCE_REFRESH ? "force-refresh" : "append-skip-existing"
    }.`
  );
  console.log(
    `Batch summary -> new: ${newCount}, skipped: ${skippedCount}, would_overwrite: ${overwriteCount}`
  );

  if (DRY_RUN) {
    console.log("Dry run enabled. Exiting before OpenAI API calls and without writing output.");
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing API key. Set OPENAI_API_KEY.");
  }

  const client = new OpenAI({ apiKey });
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < pending.length; i += 1) {
    const location = pending[i];
    console.log(`[${i + 1}/${pending.length}] ${location.name}`);

    try {
      const generated = await enrichOne(client, location);

      const enrichedRow: ProductionLocation = {
        location_id: location.location_id,
        name: location.name,
        coordinates: location.coordinates,
        category: location.category,
        era: generated.era,
        deep_history: {
          summary: generated.summary,
          architectural_details: generated.architectural_details,
          cultural_significance: generated.cultural_significance,
        },
        tags: [],
        tts_hints: generated.tts_hints,
      };

      // Checkpoint every successful item so interruptions do not lose progress.
      rowsById.set(enrichedRow.location_id, enrichedRow);
      await writeProductionFile(Array.from(rowsById.values()));
      successCount += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed ${location.location_id}: ${message}`);
      failureCount += 1;
    }

    if (REQUEST_DELAY_MS > 0) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  const finalRows = Array.from(rowsById.values());
  await writeProductionFile(finalRows);

  console.log(
    `Completed batch. Success: ${successCount}, failed: ${failureCount}. Total saved: ${finalRows.length} at ${OUTPUT_PATH}`
  );
}

run().catch((error) => {
  console.error("Failed to enrich Sri Lanka location data.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
