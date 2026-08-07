import authRoutes from "./routes/authRoutes";
import express from "express";
import cors from "cors";
import healthRoutes from "./routes/healthRoutes";
import workspaceRoutes from "./routes/workspaceRoutes";
import databaseRoutes from "./routes/databaseRoutes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("VoiceConnect backend ana sayfası çalışıyor");
});

app.use("/api", healthRoutes);
app.use("/api/workspace", workspaceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/database", databaseRoutes);

export default app;