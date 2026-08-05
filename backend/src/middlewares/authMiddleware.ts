import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type AuthPayload = {
  id: number;
  username: string;
  email: string;
  role: string;
};

const JWT_SECRET = "voiceconnect_secret_key";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Token bulunamadı.",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;

    (req as Request & { user: AuthPayload }).user = decoded;

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Token geçersiz veya süresi dolmuş.",
    });
  }
};