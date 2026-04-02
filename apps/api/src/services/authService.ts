import { Role } from '@prisma/client';
import * as userRepo from '../repositories/userRepository';
import * as orgRepo from '../repositories/organizationRepository';
import * as invitationRepo from '../repositories/invitationRepository';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { hashPassword, comparePassword } from '../utils/password';
import { signAccessToken } from '../utils/jwt';
import { randomBytes } from 'crypto';
import { sendReminderEmail } from '../utils/email';
import { config } from '../config/env';

const sanitizeUser = (user: any) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  organizationId: user.organizationId,
  name: user.name ?? null,
  jobTitle: user.jobTitle ?? null,
  organization: user.organization ?? null,
  timezone: user.timezone ?? null,
  avatar: user.avatar ?? null,
  notificationPreferences: user.notificationPreferences ?? null,
  createdAt: user.createdAt
});

export const register = async (input: { 
  email: string; 
  password: string;
  name?: string;
  jobTitle?: string;
  role?: Role;
  organizationId?: number;
  organizationName?: string;
  invitationToken?: string;
}) => {
  const existing = await userRepo.findByEmail(input.email);
  if (existing) {
    throw new BadRequestError('EMAIL_TAKEN', 'Email already registered');
  }

  let organizationId = input.organizationId;

  if (input.invitationToken) {
    const invitation = await invitationRepo.findByToken(input.invitationToken);
    if (!invitation) {
      throw new BadRequestError('INVALID_INVITATION', 'Invalid invitation token');
    }
    if (invitation.email !== input.email) {
      throw new BadRequestError('EMAIL_MISMATCH', 'Invitation email does not match provided email');
    }
    if (invitation.organizationId !== input.organizationId) {
      throw new BadRequestError('ORGANIZATION_MISMATCH', 'Invitation is for a different organization');
    }
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      throw new BadRequestError('INVITATION_EXPIRED', 'Invitation token has expired');
    }
    if (invitation.acceptedAt) {
      throw new BadRequestError('INVITATION_USED', 'Invitation has already been used');
    }
    organizationId = invitation.organizationId;
    await invitationRepo.acceptInvitation(invitation.id, { acceptedAt: new Date() });
  } else if (!organizationId && input.organizationName) {
    let org = await orgRepo.findByName(input.organizationName);
    if (!org) {
      org = await orgRepo.create({ name: input.organizationName });
    }
    organizationId = org.id;
  }

  if (!organizationId) {
    throw new BadRequestError('ORGANIZATION_REQUIRED', 'Organization is required');
  }

  const organization = await orgRepo.findById(organizationId);
  if (!organization) {
    throw new NotFoundError('ORGANIZATION_NOT_FOUND', 'Organization not found');
  }

  let role = input.role || Role.DATA_ENTRY;

  const passwordHash = await hashPassword(input.password);
  const user = await userRepo.create({
    email: input.email,
    passwordHash,
    role,
    organizationId: organizationId!,
    name: input.name ?? null,
    jobTitle: input.jobTitle ?? null
  });
  return sanitizeUser(user);
};

export const login = async (input: { email: string; password: string }) => {
  const user = await userRepo.findByEmail(input.email);
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }
  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid credentials');
  }
  const token = signAccessToken({ sub: user.id, email: user.email, role: user.role, organizationId: user.organizationId });
  return { token, user: sanitizeUser(user) };
};

export const getCurrentUser = async (id: number) => {
  const numericId = typeof id === 'string' ? Number(id) : id;
  const user = await userRepo.findById(numericId as number);
  if (!user) {
    throw new NotFoundError('USER_NOT_FOUND', 'User not found');
  }
  return sanitizeUser(user);
};

export const updateCurrentUser = async (
  id: number,
  data: Partial<{
    name: string | null;
    jobTitle: string | null;
    organization: string | null;
    timezone: string | null;
    avatar: string | null;
    notificationPreferences: Record<string, any> | null;
  }>
) => {
  const user = await userRepo.updateById(id, data);
  return sanitizeUser(user);
};

export const createInvitation = async (input: {
  email: string;
  organizationId: number;
  invitedByUserId: number;
  role: Role;
}) => {
  const existingUser = await userRepo.findByEmail(input.email);
  if (existingUser) {
    throw new BadRequestError('EMAIL_REGISTERED', 'User with this email already exists');
  }

  const existingInvitation = await invitationRepo.findByEmailAndOrg(input.email, input.organizationId);
  if (existingInvitation && !existingInvitation.acceptedAt) {
    throw new BadRequestError('INVITATION_EXISTS', 'Invitation already sent to this email');
  }

  const organization = await orgRepo.findById(input.organizationId);
  if (!organization) {
    throw new NotFoundError('ORGANIZATION_NOT_FOUND', 'Organization not found');
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await invitationRepo.create({
    email: input.email,
    organizationId: input.organizationId,
    invitedByUserId: input.invitedByUserId,
    role: input.role,
    token,
    expiresAt
  });

  const inviteLink = `${config.appUrl}/#/register?token=${token}&org=${organization.id}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>You're invited to join ${organization.name}</h2>
      <p>You have been invited by an administrator to join <strong>${organization.name}</strong> as a <strong>${input.role}</strong>.</p>
      <p>Click the button below to create your account:</p>
      <div style="margin: 30px 0;">
        <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a>
      </div>
      <p>Or copy and paste this link: <br/><a href="${inviteLink}" style="color: #2563eb;">${inviteLink}</a></p>
      <p style="color: #64748b; font-size: 14px; margin-top: 30px;">This invitation expires in 7 days.</p>
    </div>
  `;

  await sendReminderEmail({
    to: input.email,
    subject: `You're invited to join ${organization.name}`,
    text: `You have been invited to join ${organization.name}. Click here to accept: ${inviteLink}`,
    html
  });

  return invitation;
};

export const getOrganizationInvitations = async (organizationId: number) => {
  return invitationRepo.findByOrganization(organizationId);
};

export const revokeInvitation = async (invitationId: number, organizationId: number) => {
  const invitation = await invitationRepo.findById(invitationId);
  if (!invitation) {
    throw new NotFoundError('INVITATION_NOT_FOUND', 'Invitation not found');
  }
  if (invitation.organizationId !== organizationId) {
    throw new UnauthorizedError('Not authorized to revoke this invitation');
  }
  if (invitation.acceptedAt) {
    throw new BadRequestError('INVITATION_ACCEPTED', 'Cannot revoke accepted invitation');
  }
  return invitationRepo.deleteById(invitationId);
};

export const validateInvitation = async (token: string, organizationId: number) => {
  const invitation = await invitationRepo.findByToken(token);
  if (!invitation) {
    throw new NotFoundError('INVITATION_NOT_FOUND', 'Invalid invitation token');
  }
  if (invitation.organizationId !== organizationId) {
    throw new BadRequestError('ORGANIZATION_MISMATCH', 'Invitation is for a different organization');
  }
  if (invitation.acceptedAt) {
    throw new BadRequestError('INVITATION_USED', 'Invitation has already been used');
  }
  if (invitation.expiresAt && invitation.expiresAt < new Date()) {
    throw new BadRequestError('INVITATION_EXPIRED', 'Invitation token has expired');
  }
  const organization = await orgRepo.findById(organizationId);
  return {
    email: invitation.email,
    role: invitation.role,
    organizationName: organization?.name ?? 'Unknown Organization'
  };
};

export const listOrganizationUsers = async (organizationId: number) => {
  const users = await orgRepo.getUsers(organizationId);
  return users.map((user: any) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name ?? null,
    jobTitle: user.jobTitle ?? null,
    createdAt: user.createdAt,
  }));
};

export const updateUserRole = async (
  userId: number,
  organizationId: number,
  role: Role
) => {
  const user = await userRepo.findById(userId);
  if (!user) {
    throw new NotFoundError('USER_NOT_FOUND', 'User not found');
  }
  if (user.organizationId !== organizationId) {
    throw new UnauthorizedError('Not authorized to modify this user');
  }
  return userRepo.updateRole(userId, role);
};

export const removeUser = async (userId: number, organizationId: number) => {
  const user = await userRepo.findById(userId);
  if (!user) {
    throw new NotFoundError('USER_NOT_FOUND', 'User not found');
  }
  if (user.organizationId !== organizationId) {
    throw new UnauthorizedError('Not authorized to remove this user');
  }
  if (user.role === Role.ADMIN) {
    throw new BadRequestError('CANNOT_REMOVE_ADMIN', 'Cannot remove an admin user');
  }
  return userRepo.deleteById(userId);
};
