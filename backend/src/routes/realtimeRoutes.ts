import { Router } from "express";

import { authMiddleware } from "../middlewares/authMiddleware";

import {
  closeTracks,
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

router.put(
  "/session/:sessionId/tracks/close",
  authMiddleware,
  closeTracks
);

export default router;