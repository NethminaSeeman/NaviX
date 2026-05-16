import { promises as fs } from "fs";
import * as path from "path";
import { MongoClient } from "mongodb";

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
const INPUT_PATH = path.resolve(DATA_DIR, "production_srilanka_db.json");
const COLLECTION_NAME = "heritage_locations";

function getDatabaseName(uri: string): string {
  const explicitDb = process.env.MONGODB_DB?.trim();
  if (explicitDb) {
    return explicitDb;
  }

  try {
    const parsed = new URL(uri);
    const dbFromPath = parsed.pathname.replace("/", "").trim();
    if (dbFromPath) {
      return dbFromPath;
    }
  } catch {
    // Fall back to a predictable default when URI parsing fails.
  }

  return "navix";
}

async function loadProductionData(): Promise<ProductionLocation[]> {
  const raw = await fs.readFile(INPUT_PATH, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected an array in ${INPUT_PATH}.`);
  }

  return parsed as ProductionLocation[];
}

async function run(): Promise<void> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable.");
  }

  const databaseName = getDatabaseName(uri);
  const docs = await loadProductionData();

  console.log(`Loaded ${docs.length} records from ${INPUT_PATH}`);
  console.log(`Connecting to MongoDB Atlas (db: ${databaseName})...`);

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(databaseName);
    const collection = db.collection<ProductionLocation>(COLLECTION_NAME);

    const exists = (await db.listCollections({ name: COLLECTION_NAME }, { nameOnly: true }).toArray())
      .length > 0;
    if (exists) {
      console.log(`Dropping existing collection '${COLLECTION_NAME}'...`);
      await collection.drop();
    }

    if (docs.length === 0) {
      console.log("No records to insert. Creating empty collection with 2dsphere index...");
      await db.createCollection(COLLECTION_NAME);
    } else {
      console.log(`Inserting ${docs.length} records into '${COLLECTION_NAME}'...`);
      const result = await collection.insertMany(docs, { ordered: false });
      console.log(`Inserted ${result.insertedCount} records.`);
    }

    const indexName = await db
      .collection<ProductionLocation>(COLLECTION_NAME)
      .createIndex({ coordinates: "2dsphere" });
    console.log(`Created geospatial index '${indexName}' on 'coordinates'.`);

    const finalCount = await db.collection(COLLECTION_NAME).countDocuments();
    console.log(`Seeding complete. Collection '${COLLECTION_NAME}' now has ${finalCount} documents.`);
  } finally {
    await client.close();
    console.log("MongoDB connection closed.");
  }
}

run().catch((error) => {
  console.error("Failed to seed MongoDB Atlas.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
