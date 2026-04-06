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

export const createInvitation = asyncHandler(async (req: Request, res: Response) => {
  const invitation = await authService.createInvitation({
    email: req.body.email,
    organizationId: req.user!.organizationId,
    invitedByUserId: req.user!.id,
    role: req.body.role
  });
  res.status(201).json(invitation);
});

export const listInvitations = asyncHandler(async (req: Request, res: Response) => {
  const invitations = await authService.getOrganizationInvitations(req.user!.organizationId);
  res.json(invitations);
});

export const revokeInvitation = asyncHandler(async (req: Request, res: Response) => {
  const invitationId = parseInt(req.params.id);
  await authService.revokeInvitation(invitationId, req.user!.organizationId);
  res.status(204).send();
});

export const validateInvitation = asyncHandler(async (req: Request, res: Response) => {
  const token = req.query.token as string;
  const orgId = parseInt(req.query.orgId as string);
  const result = await authService.validateInvitation(token, orgId);
  res.json(result);
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  res.status(204).send();
});
