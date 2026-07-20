import express from "express";
import cors from "cors";
import healthRoutes from "./routes/healthRoutes";
import workspaceRoutes from "./routes/workspaceRoutes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("VoiceConnect backend ana sayfası çalışıyor");
});

app.use("/api", healthRoutes);
app.use("/api/workspace", workspaceRoutes);

export default app;