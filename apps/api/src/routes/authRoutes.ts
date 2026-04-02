import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema, updateMeSchema, createInvitationSchema } from '../validators/authValidators';
import { register, login, me, updateMe, createInvitation, listInvitations, revokeInvitation, validateInvitation } from '../controllers/authController';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/invitations/validate', validateInvitation);
router.get('/me', authenticate, me);
router.patch('/me', authenticate, validate(updateMeSchema), updateMe);

router.post('/invitations', authenticate, requireRoles(Role.ADMIN), validate(createInvitationSchema), createInvitation);
router.get('/invitations', authenticate, requireRoles(Role.ADMIN), listInvitations);
router.delete('/invitations/:id', authenticate, requireRoles(Role.ADMIN), revokeInvitation);

export default router;
