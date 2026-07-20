import type { RequestHandler } from "express";
import {
  getCategories,
  getMembers,
  getServerInfo,
} from "../services/workspaceService";

export const getServer: RequestHandler = (_req, res) => {
  res.json({
    success: true,
    data: getServerInfo(),
  });
};

export const getWorkspaceCategories: RequestHandler = (_req, res) => {
  res.json({
    success: true,
    data: getCategories(),
  });
};

export const getWorkspaceMembers: RequestHandler = (_req, res) => {
  res.json({
    success: true,
    data: getMembers(),
  });
};