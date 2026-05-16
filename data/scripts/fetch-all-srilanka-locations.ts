import { promises as fs } from "fs";
import * as path from "path";
import * as https from "https";

type OSMElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements: OSMElement[];
};

type SkeletonLocation = {
  location_id: string;
  name: string;
  category: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number];
  };
};

const SRI_LANKA_BBOX = [5.91, 79.51, 9.85, 81.89] as const;
const [south, west, north, east] = SRI_LANKA_BBOX;
const cwd = process.cwd();
const OUTPUT_PATH =
  path.basename(cwd).toLowerCase() === "data"
    ? path.resolve(cwd, "raw_srilanka_skeleton.json")
    : path.resolve(cwd, "data", "raw_srilanka_skeleton.json");
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const MAX_RESPONSE_BYTES = 200 * 1024 * 1024;

function buildOverpassQuery(): string {
  const bbox = `${south},${west},${north},${east}`;
  return `
[out:json][timeout:240];
(
  node["historic"](${bbox});
  way["historic"](${bbox});
  node["heritage"](${bbox});
  way["heritage"](${bbox});
  node["tourism"="attraction"](${bbox});
  way["tourism"="attraction"](${bbox});
);
out center tags qt;
`.trim();
}

function postOverpassQuery(query: string): Promise<OverpassResponse> {
  const body = query;

  return new Promise((resolve, reject) => {
    const req = https.request(
      OVERPASS_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          Accept: "application/json, text/plain, */*",
          "User-Agent": "NaviX-SriLanka-Locations-Fetcher/1.0",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        let total = 0;

        res.on("data", (chunk: Buffer) => {
          total += chunk.length;
          if (total > MAX_RESPONSE_BYTES) {
            req.destroy(new Error(`Overpass response exceeded ${MAX_RESPONSE_BYTES} bytes.`));
            return;
          }
          chunks.push(chunk);
        });

        res.on("end", () => {
          try {
            const raw = Buffer.concat(chunks).toString("utf8");
            if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
              const reason = raw.slice(0, 500).trim();
              reject(
                new Error(
                  `Overpass request failed with status ${res.statusCode ?? "unknown"}.${
                    reason ? ` Response: ${reason}` : ""
                  }`
                )
              );
              return;
            }
            const parsed = JSON.parse(raw) as OverpassResponse;
            if (!Array.isArray(parsed.elements)) {
              reject(new Error("Invalid Overpass response: missing elements array."));
              return;
            }
            resolve(parsed);
          } catch (error) {
            reject(new Error(`Failed to parse Overpass response: ${(error as Error).message}`));
          }
        });
      }
    );

    req.on("error", (error) => {
      reject(error);
    });

    req.setTimeout(300000, () => {
      req.destroy(new Error("Overpass request timed out."));
    });

    req.write(body);
    req.end();
  });
}

function toSkeletonLocation(element: OSMElement): SkeletonLocation | null {
  const tags = element.tags ?? {};
  const englishName = tags["name:en"]?.trim();

  if (!englishName) {
    return null;
  }

  const lat = element.type === "node" ? element.lat : element.center?.lat;
  const lon = element.type === "node" ? element.lon : element.center?.lon;

  if (typeof lat !== "number" || typeof lon !== "number") {
    return null;
  }

  const category = tags.historic || tags.tourism || tags.heritage;
  if (!category) {
    return null;
  }

  return {
    location_id: `lk_osm_${element.type}_${element.id}`,
    name: englishName,
    category,
    coordinates: {
      type: "Point",
      coordinates: [lon, lat],
    },
  };
}

async function run(): Promise<void> {
  const query = buildOverpassQuery();
  console.log("Querying OpenStreetMap Overpass API for Sri Lanka tourist locations...");

  const response = await postOverpassQuery(query);
  const uniqueLocations = new Map<string, SkeletonLocation>();

  for (const element of response.elements) {
    const mapped = toSkeletonLocation(element);
    if (!mapped) {
      continue;
    }
    if (!uniqueLocations.has(mapped.location_id)) {
      uniqueLocations.set(mapped.location_id, mapped);
    }
  }

  const output = Array.from(uniqueLocations.values());

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf8");

  console.log(`Saved ${output.length} locations to ${OUTPUT_PATH}`);
}

run().catch((error) => {
  console.error("Failed to fetch and save Sri Lanka locations.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
