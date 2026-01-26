import express from "express";
import authRoutes from "./auth.routes";
import healthRoutes from "./health.routes";

const app = express();

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/health", healthRoutes);

app.get("/", (_, res) => {
  res.send("API ONLINE");
});

app.listen(3000, () => {
  console.log("API rodando na porta 3000");
});
