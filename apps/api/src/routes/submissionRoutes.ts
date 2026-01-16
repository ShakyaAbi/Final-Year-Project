import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createSubmissionSchema,
  indicatorSubmissionsParamsSchema,
  listSubmissionsQuerySchema,
  acknowledgeAnomalySchema,
  updateAnomalyStatusSchema
} from '../validators/submissionValidators';
import { 
  createSubmission, 
  listSubmissions,
  acknowledgeAnomaly,
  resolveAnomaly,
  markAnomalyFalsePositive,
  updateAnomalyStatus
} from '../controllers/submissionController';

const router = Router();

router.post(
  '/indicators/:indicatorId/submissions',
  authenticate,
  validate({ ...indicatorSubmissionsParamsSchema, ...createSubmissionSchema }),
  createSubmission
);

router.get(
  '/indicators/:indicatorId/submissions',
  authenticate,
  validate({ ...indicatorSubmissionsParamsSchema, ...listSubmissionsQuerySchema }),
  listSubmissions
);

router.post(
  '/submissions/:id/anomaly/acknowledge',
  authenticate,
  validate(acknowledgeAnomalySchema),
  acknowledgeAnomaly
);

router.post(
  '/submissions/:id/anomaly/resolve',
  authenticate,
  validate(acknowledgeAnomalySchema),
  resolveAnomaly
);

router.post(
  '/submissions/:id/anomaly/false-positive',
  authenticate,
  validate(acknowledgeAnomalySchema),
  markAnomalyFalsePositive
);

router.put(
  '/submissions/:id/anomaly/status',
  authenticate,
  validate(updateAnomalyStatusSchema),
  updateAnomalyStatus
);

export default router;
