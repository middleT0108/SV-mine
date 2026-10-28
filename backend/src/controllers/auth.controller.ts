import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../models/db';
import { CONFIG } from '../config';
import { RequestWithUser } from '../middlewares/auth.middleware';

const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(1),
});

export class AuthController {
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: 'Invalid registration input.', errors: parsed.error.issues });
        return;
      }

      const { username, email, password } = parsed.data;

      // Check existing user
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
      if (existingUser) {
        res.status(409).json({ success: false, message: 'Username or email already in use.' });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const userId = crypto.randomUUID();

      db.prepare(`
        INSERT INTO users (id, username, email, password_hash, role)
        VALUES (?, ?, ?, ?, 'user')
      `).run(userId, username, email, passwordHash);

      const token = jwt.sign(
        { id: userId, username, email, role: 'user' },
        CONFIG.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        token,
        user: { id: userId, username, email, role: 'user' }
      });
    } catch (err: any) {
      console.error('[Auth] Register error:', err);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }

  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: 'Invalid credentials format.' });
        return;
      }

      const { emailOrUsername, password } = parsed.data;

      const user = db.prepare(`
        SELECT id, username, email, password_hash, role 
        FROM users 
        WHERE email = ? OR username = ?
      `).get(emailOrUsername, emailOrUsername) as {
        id: string;
        username: string;
        email: string;
        password_hash: string;
        role: string;
      } | undefined;

      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid username/email or password.' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Invalid username/email or password.' });
        return;
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email, role: user.role },
        CONFIG.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Login successful.',
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.role }
      });
    } catch (err: any) {
      console.error('[Auth] Login error:', err);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }

  public static async getProfile(req: RequestWithUser, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized.' });
      return;
    }

    const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    res.json({ success: true, user });
  }
}
