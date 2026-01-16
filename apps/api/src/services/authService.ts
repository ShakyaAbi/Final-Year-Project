import { Role } from '@prisma/client';
import * as userRepo from '../repositories/userRepository';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { hashPassword, comparePassword } from '../utils/password';
import { signAccessToken } from '../utils/jwt';

const sanitizeUser = (user: any) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  name: user.name ?? null,
  jobTitle: user.jobTitle ?? null,
  organization: user.organization ?? null,
  timezone: user.timezone ?? null,
  avatar: user.avatar ?? null,
  notificationPreferences: user.notificationPreferences ?? null,
  createdAt: user.createdAt
});

export const register = async (input: { email: string; password: string; role: Role }) => {
  const existing = await userRepo.findByEmail(input.email);
  if (existing) {
    throw new BadRequestError('EMAIL_TAKEN', 'Email already registered');
  }
  const passwordHash = await hashPassword(input.password);
  const user = await userRepo.create({ email: input.email, passwordHash, role: input.role });
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
  const token = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  return { token, user: sanitizeUser(user) };
};

export const getCurrentUser = async (id: number) => {
  const user = await userRepo.findById(id);
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
