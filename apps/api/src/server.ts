import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";

import { apiRouter } from "./routes/index.js";
import { prisma } from "./prisma/client";

// Minimal ingestion server for analytics events.
const app = express();


// CORS: restrict browser access to known local dev origins.
app.use(
  cors({
    origin: [
      "http://127.0.0.1:5500",
      "http://localhost:5500",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);

// Request JSON parsing
app.use(express.json({ limit: "1mb" }));

// Health + ingestion routes
app.use(apiRouter);

// Centralized error handler
app.use(
  (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ): void => {
    // Basic “production-ready” error response without leaking internals.
    // eslint-disable-next-line no-console
    console.error("Unhandled error:", err);

    const status = 500;
    res.status(status).json({
      success: false,
      error: "Internal Server Error",
    });
  }
);

const PORT = Number(process.env.PORT ?? 4000);
const NODE_ENV = process.env.NODE_ENV ?? "development";

// Graceful startup: validate Prisma client can be constructed.
// (We don't force a DB connectivity test here to keep startup fast.)
prisma
  .$connect()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error("Prisma connection warning:", e);
  })
  .finally(async () => {
    const server = app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`PulseKit API listening on port ${PORT} [${NODE_ENV}]`);
    });

    const shutdown = async () => {
      try {
        // Stop accepting requests
        server.close(() => {
          // eslint-disable-next-line no-console
          console.log("HTTP server closed");
        });
      } finally {
        // Ensure Prisma disconnects
        await prisma.$disconnect().catch(() => undefined);
      }
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  });


