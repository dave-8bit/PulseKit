import { Router } from "express";

import { checkDatabaseConnection } from "../services/health.service";

// Health-check route
// --------------------
// This route is intentionally minimal.
// It checks database connectivity via the health service.
export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  const database = await checkDatabaseConnection();

  res.status(200).json({
    success: true,
    service: "pulsekit-api",
    ...database,
  });
});

