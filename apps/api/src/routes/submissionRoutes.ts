import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import {
  createSubmissionSchema,
  indicatorSubmissionsParamsSchema,
  listSubmissionsQuerySchema,
  acknowledgeAnomalySchema,
  updateAnomalyStatusSchema,
  updateSubmissionSchema,
  restoreSubmissionSchema,
  submissionIdParamsSchema,
} from "../validators/submissionValidators";
import {
  createSubmission,
  listSubmissions,
  updateSubmission,
  deleteSubmission,
  restoreSubmission,
  acknowledgeAnomaly,
  resolveAnomaly,
  markAnomalyFalsePositive,
  updateAnomalyStatus,
} from "../controllers/submissionController";

const router = Router();

router.post(
  "/indicators/:indicatorId/submissions",
  authenticate,
  validate({ ...indicatorSubmissionsParamsSchema, ...createSubmissionSchema }),
  createSubmission
);

router.get(
  "/indicators/:indicatorId/submissions",
  authenticate,
  validate({
    ...indicatorSubmissionsParamsSchema,
    ...listSubmissionsQuerySchema,
  }),
  listSubmissions
);

router.patch(
  "/submissions/:id",
  authenticate,
  validate(updateSubmissionSchema),
  updateSubmission
);

router.delete(
  "/submissions/:id",
  authenticate,
  validate(submissionIdParamsSchema),
  deleteSubmission
);

router.post(
  "/submissions/:id/restore",
  authenticate,
  requireRoles(Role.ADMIN, Role.MANAGER),
  validate(restoreSubmissionSchema),
  restoreSubmission
);

router.post(
  "/submissions/:id/anomaly/acknowledge",
  authenticate,
  validate(acknowledgeAnomalySchema),
  acknowledgeAnomaly
);

router.post(
  "/submissions/:id/anomaly/resolve",
  authenticate,
  validate(acknowledgeAnomalySchema),
  resolveAnomaly
);

router.post(
  "/submissions/:id/anomaly/false-positive",
  authenticate,
  validate(acknowledgeAnomalySchema),
  markAnomalyFalsePositive
);

router.put(
  "/submissions/:id/anomaly/status",
  authenticate,
  validate(updateAnomalyStatusSchema),
  updateAnomalyStatus
);

export default router;
