import { Request, Response } from 'express';
import * as authService from '../services/authService';
import { asyncHandler } from '../utils/asyncHandler';

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await authService.listOrganizationUsers(req.user!.organizationId);
  res.json(users);
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id);
  const { role } = req.body;
  const user = await authService.updateUserRole(userId, req.user!.organizationId, role);
  res.json(user);
});

export const removeUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id);
  await authService.removeUser(userId, req.user!.organizationId);
  res.status(204).send();
});
