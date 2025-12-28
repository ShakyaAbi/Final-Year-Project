import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  createLogframeNodeSchema,
  projectLogframeParamsSchema,
  logframeNodeIdParamsSchema,
  updateLogframeNodeSchema
} from '../validators/logframeValidators';
import {
  createLogframeNode,
  deleteLogframeNode,
  getLogframeTree,
  updateLogframeNode
} from '../controllers/logframeController';

const router = Router();

router.post(
  '/projects/:projectId/logframe/nodes',
  authenticate,
  requireRoles(Role.ADMIN, Role.MANAGER),
  validate({ ...projectLogframeParamsSchema, ...createLogframeNodeSchema }),
  createLogframeNode
);

router.get(
  '/projects/:projectId/logframe/tree',
  authenticate,
  validate(projectLogframeParamsSchema),
  getLogframeTree
);

router.patch(
  '/logframe/nodes/:id',
  authenticate,
  requireRoles(Role.ADMIN, Role.MANAGER),
  validate(updateLogframeNodeSchema),
  updateLogframeNode
);

router.delete(
  '/logframe/nodes/:id',
  authenticate,
  requireRoles(Role.ADMIN),
  validate(logframeNodeIdParamsSchema),
  deleteLogframeNode
);

export default router;
