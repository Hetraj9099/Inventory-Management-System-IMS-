require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

async function setupDatabase() {
  const client = await pool.connect();
  try {
    console.log("Connected to database. Running schema...");

    const schemaPath = path.join(__dirname, "database", "schema.sql");
    const schemaSQL = fs.readFileSync(schemaPath, "utf8");

    await client.query("BEGIN");

    // Split by semicolon and execute each statement
    const statements = schemaSQL.split(";").map(s => s.trim()).filter(s => s.length > 0);

    for (const statement of statements) {
      if (statement) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await client.query(statement);
      }
    }

    await client.query("COMMIT");
    console.log("Schema setup complete.");

    // Now run seed if exists
    const seedPath = path.join(__dirname, "database", "seed.sql");
    if (fs.existsSync(seedPath)) {
      console.log("Running seed data...");
      const seedSQL = fs.readFileSync(seedPath, "utf8");
      const seedStatements = seedSQL.split(";").map(s => s.trim()).filter(s => s.length > 0);

      for (const statement of seedStatements) {
        if (statement) {
          await client.query(statement);
        }
      }
      console.log("Seed data inserted.");
    }

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error setting up database:", error);
    throw error;
  } finally {
    client.release();
  }
}

setupDatabase().then(() => {
  console.log("Database setup finished.");
  pool.end();
}).catch((err) => {
  console.error(err);
  pool.end();
  process.exit(1);
});