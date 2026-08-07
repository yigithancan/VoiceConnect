import type { RequestHandler } from "express";
import {
  getCategories,
  getMembers,
  getServerInfo,
} from "../services/workspaceService";

export const getServer: RequestHandler = async (_req, res) => {
  try {
    const server = await getServerInfo();

    res.json({
      success: true,
      data: server,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Sunucu bilgisi alınamadı.",
    });
  }
};

export const getWorkspaceCategories: RequestHandler = async (_req, res) => {
  try {
    const categories = await getCategories();

    res.json({
      success: true,
      data: categories,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Kategori ve kanal bilgileri alınamadı.",
    });
  }
};

export const getWorkspaceMembers: RequestHandler = async (_req, res) => {
  try {
    const members = await getMembers();

    res.json({
      success: true,
      data: members,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Üye bilgileri alınamadı.",
    });
  }
};