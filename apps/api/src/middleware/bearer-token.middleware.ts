import type { NextFunction, Request, Response } from "express";

/**
 * Middleware: bearerTokenMiddleware
 *
 * Reads Authorization: Bearer <api_token>
 *
 * On missing/malformed header, returns:
 * { success: false, error: "Unauthorized" }
 *
 * On success attaches the token to req.apiToken.
 */
export function bearerTokenMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.header("Authorization");

  if (typeof authHeader !== "string") {
    res.status(401).json({
      success: false,
      error: "Unauthorized",
    });
    return;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({
      success: false,
      error: "Unauthorized",
    });
    return;
  }

  const token = match[1]?.trim();
  if (!token) {
    res.status(401).json({
      success: false,
      error: "Unauthorized",
    });
    return;
  }

  req.apiToken = token;
  next();
}

