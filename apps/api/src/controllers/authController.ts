import { Request, Response } from 'express';
import * as authService from '../services/authService';
import { asyncHandler } from '../utils/asyncHandler';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.register(req.body);
  res.status(201).json(user);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  res.json(result);
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.user!.id);
  res.json(user);
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.updateCurrentUser(req.user!.id, req.body);
  res.json(user);
});
