import express from "express";
import auth from "./routes/auth.routes";
import { errorMiddleware } from "./middlewares/error.middleware";

const app = express();

app.use(express.json());
app.use(auth);

app.get("/", (_, res) => {
  res.send("API ONLINE");
}); 
// 👇 ÚLTIMO middleware
app.use(errorMiddleware);

export default app;
