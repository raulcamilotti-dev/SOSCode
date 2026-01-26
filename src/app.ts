import express from "express";
import db from "./db";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("API ONLINE");
});

app.get("/health/db", async (_req, res) => {
  await db.query("SELECT 1");
  res.json({ ok: true });
});

export default app;
