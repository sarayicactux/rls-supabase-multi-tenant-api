import type { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./openapi.js";
import { env } from "../config/env.js";

export function setupSwagger(app: Express) {
  const document = {
    ...openApiDocument,
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: "Local development",
      },
    ],
  };

  app.get("/api/docs.json", (_req, res) => {
    res.status(200).json(document);
  });

  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(document, {
      customSiteTitle: "Multi-Tenant Orders API",
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
    }),
  );
}
