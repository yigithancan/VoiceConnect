import express from "express";
import cors from "cors";
import * as fs from "node:fs";
import * as path from "node:path";

import authRoutes from "./routes/authRoutes";
import healthRoutes from "./routes/healthRoutes";
import workspaceRoutes from "./routes/workspaceRoutes";
import databaseRoutes from "./routes/databaseRoutes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", healthRoutes);
app.use("/api/workspace", workspaceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/database", databaseRoutes);

const frontendDistCandidates = [
  path.resolve(process.cwd(), "frontend", "dist"),
  path.resolve(process.cwd(), "..", "frontend", "dist"),
];

const frontendDistPath = frontendDistCandidates.find((candidate) =>
  fs.existsSync(candidate)
);

if (frontendDistPath) {
  app.use(express.static(frontendDistPath));

  app.use((req, res, next) => {
    if (
      req.method !== "GET" ||
      req.path.startsWith("/api") ||
      req.path.startsWith("/socket.io")
    ) {
      next();
      return;
    }

    res.sendFile(
      path.join(frontendDistPath, "index.html")
    );
  });
}

export default app;
