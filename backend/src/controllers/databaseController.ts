import type { RequestHandler } from "express";
import { pool } from "../config/database";

export const getDatabaseStatus: RequestHandler = async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
    );

    res.json({
      success: true,
      message: "PostgreSQL bağlantısı başarılı.",
      data: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "PostgreSQL bağlantısı başarısız.",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};