import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { listUsers, updateUserRole, removeUser } from '../controllers/usersController';

const router = Router();

router.get('/', authenticate, requireRoles(Role.ADMIN), listUsers);
router.patch('/:id/role', authenticate, requireRoles(Role.ADMIN), updateUserRole);
router.delete('/:id', authenticate, requireRoles(Role.ADMIN), removeUser);

export default router;
