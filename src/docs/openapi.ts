import type { OpenAPIV3 } from "openapi-types";

export const openApiDocument: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "Multi-Tenant Orders API",
    version: "1.0.0",
    description:
      "Express + Supabase API with Row Level Security. " +
      "Access is scoped by company membership; knowing another company's order ID is not enough to read, update, or delete it.\n\n" +
      "## How to authenticate\n" +
      "1. Call `POST /api/auth/login` with email and password.\n" +
      "2. Copy `access_token` from the response.\n" +
      "3. Click **Authorize** and paste the token.\n" +
      "4. Call the protected endpoints below.\n\n" +
      "Test users (from seed): `user-a@example.com` / `Password123!` and `user-b@example.com` / `Password123!`",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development",
    },
  ],
  tags: [
    { name: "Health", description: "Service health checks" },
    { name: "Auth", description: "Login and current user" },
    { name: "Orders", description: "Company-scoped order CRUD (RLS enforced)" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Supabase Auth access token from POST /api/auth/login",
      },
    },
    schemas: {
      ErrorMessage: {
        type: "object",
        required: ["message"],
        properties: {
          message: { type: "string" },
          errors: { type: "object", additionalProperties: true },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        additionalProperties: false,
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "user-a@example.com",
          },
          password: {
            type: "string",
            format: "password",
            example: "Password123!",
          },
        },
      },
      LoginResponse: {
        type: "object",
        required: ["access_token", "refresh_token", "token_type", "expires_in", "user"],
        properties: {
          access_token: { type: "string" },
          refresh_token: { type: "string" },
          token_type: { type: "string", example: "bearer" },
          expires_in: { type: "integer", example: 3600 },
          expires_at: { type: "integer" },
          user: {
            type: "object",
            required: ["id", "email"],
            properties: {
              id: { type: "string", format: "uuid" },
              email: { type: "string", format: "email" },
            },
          },
        },
      },
      CurrentUser: {
        type: "object",
        required: ["id", "email"],
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
        },
      },
      Order: {
        type: "object",
        required: ["id", "company_id", "title", "amount", "created_at"],
        properties: {
          id: { type: "string", format: "uuid" },
          company_id: { type: "string", format: "uuid" },
          title: { type: "string", example: "Company A Order" },
          amount: { type: "number", example: 100 },
          created_at: { type: "string", format: "date-time" },
        },
      },
      CreateOrder: {
        type: "object",
        required: ["company_id", "title", "amount"],
        additionalProperties: false,
        properties: {
          company_id: {
            type: "string",
            format: "uuid",
            example: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          },
          title: {
            type: "string",
            minLength: 1,
            maxLength: 200,
            example: "New order from Company A",
          },
          amount: {
            type: "number",
            minimum: 0,
            example: 150,
          },
        },
      },
      UpdateOrder: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: {
            type: "string",
            minLength: 1,
            maxLength: 200,
            example: "Updated title",
          },
          amount: {
            type: "number",
            minimum: 0,
            example: 175,
          },
        },
        description: "At least one of title or amount must be provided. company_id cannot be changed.",
      },
      HealthResponse: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string", example: "ok" },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        security: [],
        responses: {
          "200": {
            description: "Service is running",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        description:
          "Signs in with Supabase Auth and returns an access token for protected routes.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
          },
          "400": {
            description: "Invalid request body",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
          "401": {
            description: "Invalid email or password",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user",
        description: "Returns the authenticated user from the Bearer token.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Current user",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CurrentUser" },
              },
            },
          },
          "401": {
            description: "Missing or invalid token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
        },
      },
    },
    "/api/orders": {
      get: {
        tags: ["Orders"],
        summary: "List orders",
        description:
          "Returns orders visible to the authenticated user (member companies only). Optional company_id filter still respects RLS.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "company_id",
            in: "query",
            required: false,
            schema: { type: "string", format: "uuid" },
            description: "Optional filter. Non-member companies return an empty array.",
          },
        ],
        responses: {
          "200": {
            description: "Order list",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Order" },
                },
              },
            },
          },
          "400": {
            description: "Invalid company_id",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
          "401": {
            description: "Missing or invalid token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
          "500": {
            description: "Could not retrieve orders",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Orders"],
        summary: "Create order",
        description:
          "Creates an order for a company the user belongs to. Inserts for other companies are rejected by RLS.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateOrder" },
            },
          },
        },
        responses: {
          "201": {
            description: "Order created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Order" },
              },
            },
          },
          "400": {
            description: "Invalid body or create failed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
          "401": {
            description: "Missing or invalid token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
          "403": {
            description: "Not allowed to create for this company",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
        },
      },
    },
    "/api/orders/{id}": {
      patch: {
        tags: ["Orders"],
        summary: "Update order",
        description:
          "Updates title and/or amount. Orders from other companies appear as 404 due to RLS.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateOrder" },
            },
          },
        },
        responses: {
          "200": {
            description: "Order updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Order" },
              },
            },
          },
          "400": {
            description: "Invalid id or body",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
          "401": {
            description: "Missing or invalid token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
          "404": {
            description: "Order not found or not visible",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Orders"],
        summary: "Delete order",
        description:
          "Deletes an order in a company the user belongs to. Other companies return 404.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "204": {
            description: "Order deleted",
          },
          "400": {
            description: "Invalid id or delete failed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
          "401": {
            description: "Missing or invalid token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
          "404": {
            description: "Order not found or not visible",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
        },
      },
    },
  },
};
