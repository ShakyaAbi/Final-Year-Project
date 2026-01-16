import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema, updateMeSchema } from '../validators/authValidators';
import { register, login, me, updateMe } from '../controllers/authController';

const router = Router();

router.post('/register', authenticate, requireRoles(Role.ADMIN), validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', authenticate, me);
router.patch('/me', authenticate, validate(updateMeSchema), updateMe);

export default router;
