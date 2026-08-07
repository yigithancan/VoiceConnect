import { Router } from "express";
import { getDatabaseStatus } from "../controllers/databaseController";

const router = Router();

router.get("/status", getDatabaseStatus);

export default router;