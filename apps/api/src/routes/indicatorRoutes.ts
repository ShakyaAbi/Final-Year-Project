import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  createIndicatorSchema,
  projectIndicatorParamsSchema,
  indicatorIdParamsSchema,
  updateIndicatorSchema
} from '../validators/indicatorValidators';
import {
  createIndicator,
  getIndicator,
  getIndicatorsByProject,
  updateIndicator
} from '../controllers/indicatorController';

const router = Router();

router.post(
  '/projects/:projectId/indicators',
  authenticate,
  requireRoles(Role.ADMIN, Role.MANAGER),
  validate({ ...projectIndicatorParamsSchema, ...createIndicatorSchema }),
  createIndicator
);

router.get(
  '/projects/:projectId/indicators',
  authenticate,
  validate(projectIndicatorParamsSchema),
  getIndicatorsByProject
);

router.get(
  '/indicators/:id',
  authenticate,
  validate(indicatorIdParamsSchema),
  getIndicator
);

router.patch(
  '/indicators/:id',
  authenticate,
  requireRoles(Role.ADMIN, Role.MANAGER),
  validate(updateIndicatorSchema),
  updateIndicator
);

export default router;
