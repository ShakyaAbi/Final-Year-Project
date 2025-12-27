import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export type TokenPayload = {
  sub: number;
  email: string;
  role: string;
};

export const signAccessToken = (payload: TokenPayload) =>
  jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, config.jwtSecret) as TokenPayload & { iat: number; exp: number };
