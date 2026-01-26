import { Request, Response } from "express";
import db from "../db";

export async function dbHealth(req: Request, res: Response) {
  try {
    await db.query("SELECT 1");
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
}
