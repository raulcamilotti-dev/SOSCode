import express from "express";
import routes from "./routes";
import { errorMiddleware } from "./middlewares/error.middleware";

const app = express();

app.use(express.json());
app.use(routes);

// 👇 ÚLTIMO middleware
app.use(errorMiddleware);

export default app;
