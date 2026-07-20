import { Router } from "express";
import {
  getServer,
  getWorkspaceCategories,
  getWorkspaceMembers,
} from "../controllers/workspaceController";

const router = Router();

router.get("/server", getServer);
router.get("/categories", getWorkspaceCategories);
router.get("/members", getWorkspaceMembers);

export default router;