import { Router } from 'express';
import authRoutes from './authRoutes';
import projectRoutes from './projectRoutes';
import logframeRoutes from './logframeRoutes';
import indicatorRoutes from './indicatorRoutes';
import submissionRoutes from './submissionRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/', projectRoutes);
router.use('/', logframeRoutes);
router.use('/', indicatorRoutes);
router.use('/', submissionRoutes);

export default router;
