import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createProjectSchema, projectIdParamSchema, updateProjectSchema } from '../validators/projectValidators';
import {
  createProject,
  deleteProject,
  getProject,
  getProjectActivities,
  getProjectStats,
  listProjects,
  updateProject
} from '../controllers/projectController';

const router = Router();

router.post('/projects', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), validate(createProjectSchema), createProject);
router.get('/projects', authenticate, listProjects);
router.get('/projects/:id', authenticate, validate(projectIdParamSchema), getProject);
router.get('/projects/:id/stats', authenticate, validate(projectIdParamSchema), getProjectStats);
router.get('/projects/:id/activities', authenticate, validate(projectIdParamSchema), getProjectActivities);
router.patch('/projects/:id', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), validate(updateProjectSchema), updateProject);
router.delete('/projects/:id', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), validate(projectIdParamSchema), deleteProject);

export default router;
