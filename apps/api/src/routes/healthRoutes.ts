import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { getMlHealth } from "../controllers/healthController";

const router = Router();

router.get(
  "/health/ml",
  authenticate,
  requireRoles(Role.ADMIN, Role.MANAGER),
  getMlHealth,
);

export default router;
