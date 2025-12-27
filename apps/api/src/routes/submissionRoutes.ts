import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createSubmissionSchema,
  indicatorSubmissionsParamsSchema,
  listSubmissionsQuerySchema
} from '../validators/submissionValidators';
import { createSubmission, listSubmissions } from '../controllers/submissionController';

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

export default router;
