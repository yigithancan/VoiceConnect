import { Request, Response } from "express";

export const getHealthStatus = (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "VoiceConnect backend çalışıyor",
  });
};