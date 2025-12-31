import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import { appConfig } from "./config";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import {
  authRoutes,
  userRoutes,
  postRoutes,
  categoryRoutes,
  paymentRoutes,
  uploadRoutes,
} from "./routes";

export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.ALLOWED_ORIGINS?.split(",") || [
        "http://localhost:3000",
      ],
      credentials: true,
    })
  );

  // Body parsing middleware
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API v1 routes
  app.use(`${appConfig.apiPrefix}/auth`, authRoutes);
  app.use(`${appConfig.apiPrefix}/users`, userRoutes);
  app.use(`${appConfig.apiPrefix}/posts`, postRoutes);
  app.use(`${appConfig.apiPrefix}/categories`, categoryRoutes);
  app.use(`${appConfig.apiPrefix}/payments`, paymentRoutes);
  app.use(`${appConfig.apiPrefix}/upload`, uploadRoutes);

  // 404 handler for undefined routes (must be after all routes)
  app.use(notFoundHandler);

  // Global error handling middleware (must be last)
  app.use(errorHandler);

  return app;
};
