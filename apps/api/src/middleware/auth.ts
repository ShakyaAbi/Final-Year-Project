import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { UnauthorizedError } from "../utils/errors";
import { config } from "../config/env";

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  // Bypass authentication if disabled
  if (config.authDisabled) {
    req.user = { id: 1, email: "admin@gmail.com", role: "ADMIN" };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(
      new UnauthorizedError("Missing or invalid Authorization header"),
    );
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role as any,
    };
    return next();
  } catch (err) {
    return next(new UnauthorizedError("Invalid or expired token"));
  }
};
