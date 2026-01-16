import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';

export type TokenPayload = {
  sub: number;
  email: string;
  role: string;
};

export const signAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as SignOptions) as string;
};

export const verifyAccessToken = (token: string): TokenPayload & { iat: number; exp: number } =>
  jwt.verify(token, config.jwtSecret) as unknown as TokenPayload & { iat: number; exp: number };
