import { Router } from "express";

// Health-check route
// --------------------
// This route is intentionally minimal and does not hit the database.
//
// Why? Health endpoints are usually called by uptime monitors and load
// balancers. They should be fast and reliable, and should not fail due to
// temporary database/network issues.

export const healthRouter = Router();

import { checkDatabaseConnection } from "../services/health.service";

healthRouter.get("/health", async (_req, res) => {
  const database = await checkDatabaseConnection();

  res.status(200).json({
    success: true,
    service: "pulsekit-api",
    ...database,
  });
});


