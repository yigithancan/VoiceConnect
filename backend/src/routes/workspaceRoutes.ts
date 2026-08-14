import { Router } from "express";

import { authMiddleware } from "../middlewares/authMiddleware";

import {
  createWorkspaceChannel,
  getServer,
  getWorkspaceCategories,
  getWorkspaceChannelMembers,
  getWorkspaceMembers,
  updateWorkspaceChannelMemberRole,
  updateWorkspaceMemberRole,
} from "../controllers/workspaceController";

const router =
  Router();

router.get(
  "/server",
  getServer
);

router.get(
  "/categories",
  getWorkspaceCategories
);

router.get(
  "/members",
  getWorkspaceMembers
);

/*
  Sadece giriş yapmış
  kullanıcı erişebilir.

  Asıl Kurucu/Yönetici kontrolü
  service içinde PostgreSQL'den
  yapılıyor.
*/
router.post(
  "/channels",
  authMiddleware,
  createWorkspaceChannel
);

router.patch(
  "/members/:userId/role",
  authMiddleware,
  updateWorkspaceMemberRole
);
router.get(
  "/channels/:channelId/members",
  authMiddleware,
  getWorkspaceChannelMembers
);

router.patch(
  "/channels/:channelId/members/:userId/role",
  authMiddleware,
  updateWorkspaceChannelMemberRole
);
export default router;