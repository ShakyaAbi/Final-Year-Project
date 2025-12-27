import { z } from 'zod';
import { Role } from '@prisma/client';

export const registerSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.nativeEnum(Role)
  })
};

export const loginSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8)
  })
};
