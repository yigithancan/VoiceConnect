import type { Request, RequestHandler } from "express";
import type { AuthPayload } from "../middlewares/authMiddleware";
import { loginUser, registerUser } from "../services/authService";

export const register: RequestHandler = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Kullanıcı adı, e-posta ve şifre zorunludur.",
      });
      return;
    }

    const user = await registerUser(username, email, password);

    res.status(201).json({
      success: true,
      message: "Kayıt başarılı.",
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Kayıt başarısız.",
    });
  }
};

export const login: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "E-posta ve şifre zorunludur.",
      });
      return;
    }

    const result = await loginUser(email, password);

    res.json({
      success: true,
      message: "Giriş başarılı.",
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : "Giriş başarısız.",
    });
  }
};
type AuthRequest = Request & {
  user?: AuthPayload;
};

export const getMe: RequestHandler = (req, res) => {
  const authReq = req as AuthRequest;

  res.json({
    success: true,
    message: "Kullanıcı bilgisi getirildi.",
    data: authReq.user,
  });
};