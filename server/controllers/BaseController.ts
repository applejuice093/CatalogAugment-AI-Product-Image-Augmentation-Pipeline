import type { Response } from "express";

export abstract class BaseController {
  protected handleSuccess<T>(res: Response, data: T, statusCode = 200): Response {
    return res.status(statusCode).json(data);
  }

  protected handleCreated<T>(res: Response, data: T): Response {
    return res.status(201).json(data);
  }

  protected handleNotFound(res: Response, message = "Resource not found"): Response {
    return res.status(404).json({ error: message, statusCode: 404 });
  }

  protected handleUnauthorized(res: Response, message = "Authentication required"): Response {
    return res.status(401).json({ error: message, statusCode: 401 });
  }

  protected handleBadRequest(res: Response, message = "Bad request", errors?: unknown): Response {
    return res.status(400).json({ error: message, statusCode: 400, details: errors });
  }

  protected handleError(error: unknown, res: Response, context?: string): Response {
    const errorPrefix = context ? `[${context}] ` : "";
    const errorMessage = error instanceof Error ? error.message : "Internal server error";

    console.error(`🚨 ${errorPrefix}Unhandled error:`, error);

    // In production, avoid leaking raw internal stack traces
    return res.status(500).json({
      error: "An internal server error occurred.",
      message: errorMessage,
      statusCode: 500,
    });
  }
}
