import cors from "cors";
import express from "express";
import { config } from "./config/unifiedConfig.ts";
import { errorHandler } from "./middleware/errorHandler.ts";
import { apiRouter } from "./routes/index.ts";

export const app = express();

// Security & CORS configuration
app.use(
  cors({
    origin: [...config.server.corsOrigins],
    credentials: true,
  })
);

// Standard parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Primary API Router
app.use("/api", apiRouter);

// Fallback 404 for unmapped API routes
app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found", statusCode: 404 });
});

// Centralized error boundary middleware
app.use(errorHandler);
