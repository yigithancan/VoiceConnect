import type { RequestHandler } from "express";

import {
  addRealtimeTracks,
  createRealtimeSession,
  type AddRealtimeTracksPayload,
} from "../services/realtimeService";

export const createSession: RequestHandler =
  async (_req, res) => {
    try {
      const session =
        await createRealtimeSession();

      res.status(201).json({
        success: true,
        message:
          "Cloudflare Realtime session oluşturuldu.",
        data: session,
      });
    } catch (error) {
      console.error(
        "Realtime session controller hatası:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Cloudflare Realtime session oluşturulamadı.",
        error:
          error instanceof Error
            ? error.message
            : "Bilinmeyen hata",
      });
    }
  };

export const publishTracks: RequestHandler =
  async (req, res) => {
    try {
      const sessionIdParam =
  req.params.sessionId;

const sessionId =
  Array.isArray(sessionIdParam)
    ? sessionIdParam[0]
    : sessionIdParam;

      const payload =
        req.body as AddRealtimeTracksPayload;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          message:
            "Realtime session ID gerekli.",
        });

        return;
      }

      if (
        !payload.sessionDescription &&
        !payload.tracks?.length
      ) {
        res.status(400).json({
          success: false,
          message:
            "Session description veya track bilgisi gerekli.",
        });

        return;
      }

      const result =
        await addRealtimeTracks(
          sessionId,
          payload
        );

      res.status(201).json({
        success: true,
        message:
          "Realtime track işlemi başarılı.",
        data: result,
      });
    } catch (error) {
      console.error(
        "Realtime track controller hatası:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Cloudflare Realtime track işlemi başarısız.",
        error:
          error instanceof Error
            ? error.message
            : "Bilinmeyen hata",
      });
    }
  };