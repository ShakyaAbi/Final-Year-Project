import { Router } from "express";
import authRoutes from "./authRoutes";
import projectRoutes from "./projectRoutes";
import logframeRoutes from "./logframeRoutes";
import indicatorRoutes from "./indicatorRoutes";
import submissionRoutes from "./submissionRoutes";
import importRoutes from "./importRoutes";
import exportRoutes from "./exportRoutes";
import templateRoutes from "./templateRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/", projectRoutes);
router.use("/", logframeRoutes);
router.use("/", indicatorRoutes);
router.use("/", submissionRoutes);
router.use("/", importRoutes);
router.use("/", exportRoutes);
router.use("/", templateRoutes);

export default router;
