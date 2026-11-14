import type { NextFunction, Request, Response } from "express";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("🔥 Global error middleware captured an error:", err);

  const message = err instanceof Error ? err.message : "Internal Server Error";
  res.status(500).json({
    error: "An unexpected error occurred.",
    message,
    statusCode: 500,
  });
}
