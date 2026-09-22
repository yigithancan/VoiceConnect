import { Router } from "express";

import { authMiddleware } from "../middlewares/authMiddleware";

import {
  createSession,
  publishTracks,
} from "../controllers/realtimeController";

const router = Router();

router.post(
  "/session",
  authMiddleware,
  createSession
);

router.post(
  "/session/:sessionId/tracks",
  authMiddleware,
  publishTracks
);

export default router;