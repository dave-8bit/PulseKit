import type { Request, Response, NextFunction } from "express";

/**
 * Middleware: validateApiToken
 *
 * Why this exists:
 * - Controllers should assume they only receive valid, already-trusted
 *   data.
 * - Validating here prevents malformed/empty tokens from reaching the
 *   controller and avoids unnecessary DB work.
 * - This middleware also attaches the validated token to `req.apiToken`
 *   so downstream handlers can use it safely and consistently.
 */
export function validateApiToken(req: Request, res: Response, next: NextFunction): void {
  // Read api_token from the request body.
  const rawToken = (req.body as { api_token?: unknown }).api_token;

  // Verify basic shape.
  if (typeof rawToken !== "string") {
    res.status(401).json({
      success: false,
      error: "Invalid API token",
    });
    return;
  }

  // Normalize + validate content.
  const token = rawToken.trim();
  if (token.length === 0 || token.length < 32) {
    res.status(401).json({
      success: false,
      error: "Invalid API token",
    });
    return;
  }

  // Attach validated value to the request object.
  // Controllers can use req.apiToken after this middleware runs.
  req.apiToken = token;

  next();
}

