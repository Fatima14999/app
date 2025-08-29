const express = require("express");
const mysql = require("mysql2/promise");
const bodyParser = require("body-parser");
const cors = require("cors");



const app = express();
app.use(cors());
app.use(bodyParser.json());

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user",
  password: process.env.DB_PASSWORD || "pass",
  database: process.env.DB_NAME || "myappdb",
};

let pool;

async function connectWithRetry(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      pool = await mysql.createPool(dbConfig);
      // Try a simple query to check readiness
      await pool.query("SELECT 1");
      console.log("✅ Connected to MySQL and ready!");
      
      // Create table if it doesn’t exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          text VARCHAR(255) NOT NULL
        )
      `);
      console.log("✅ Table items is ready");
      return pool;
    } catch (err) {
      console.log(`❌ MySQL not ready, retrying in ${delay/1000}s...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error("❌ Could not connect to MySQL after multiple attempts");
}

(async () => {
  await connectWithRetry();
})();


app.post("/add", async (req, res) => {
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: "No data provided" });
  try {
    await pool.query("INSERT INTO items (text) VALUES (?)", [data]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/get", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM items");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.listen(5000, () => console.log("🚀 Backend running on port 5000"));
