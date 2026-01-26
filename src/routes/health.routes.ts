import { Router } from "express";
import { dbHealth } from "../controllers/health.controller";

const router = Router();

router.get("/", (_, res) => {
  res.json({ status: "ok" });
});

router.get("/db", dbHealth);

export default router;
