// Placeholder PostgreSQL connection template for future database access.
const { Pool } = require("pg");
const databaseConfig = require("./config/database");

const pool = new Pool(databaseConfig.postgres);

module.exports = pool;
