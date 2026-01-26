import express from "express";
import authRoutes from "./routes/auth.routes";
import db from "./db";

const app = express();

app.use(express.json());

app.use("/auth", authRoutes);

app.get("/health/db", async (_req, res) => {
  await db.query("SELECT 1");
  res.json({ ok: true });
});

export default app;
