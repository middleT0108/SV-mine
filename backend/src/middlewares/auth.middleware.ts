import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

export function authenticateToken(
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required. Missing token.' });
    return;
  }

  jwt.verify(token, CONFIG.JWT_SECRET, (err, decoded) => {
    if (err || !decoded) {
      res.status(403).json({ success: false, message: 'Invalid or expired token.' });
      return;
    }

    req.user = decoded as AuthenticatedUser;
    next();
  });
}
