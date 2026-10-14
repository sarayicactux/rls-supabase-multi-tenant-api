import express from "express";
import { env } from "./config/env.js";
import { setupSwagger } from "./docs/swagger.js";
import authRouter from "./routes/auth.routes.js";
import ordersRouter from "./routes/orders.routes.js";

const app = express();

app.disable("x-powered-by");

app.use(express.json({ limit: "100kb" }));

setupSwagger(app);

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/orders", ordersRouter);

app.use((_req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
  console.log(`Swagger UI: http://localhost:${env.PORT}/api/docs`);
});
