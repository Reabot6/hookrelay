/**
 * Built by Reabot6 from SFG (seofg.xyz)
 * Open-source — github.com/reabot6/hookrelay
 */
import type { NextFunction, Request, Response } from 'express';
import type { AuthRequest, CustomError, UserPayload } from '../shared/types.js';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { userTable } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { createHash } from 'crypto';

export const signup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const err: CustomError = new Error('Invalid inputs');
            err.statusCode = 422; err.data = errors.array(); throw err;
        }

        const { username, email, password } = req.body;
        const hashed = await bcrypt.hash(password, 12);

        const [user] = await db.insert(userTable).values({ username, email, password: hashed }).returning();
        if (!user) { const err: CustomError = new Error('Failed to register user'); err.statusCode = 500; throw err; }

        res.status(201).json({ message: 'User created' });
    } catch (err) {
        const e = err as CustomError;
        if (!e.statusCode) e.statusCode = 500;
        next(e);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const err: CustomError = new Error('Validation failed');
            err.statusCode = 422; err.data = errors.array(); throw err;
        }

        const { username, password } = req.body;
        const user = await db.query.userTable.findFirst({ where: eq(userTable.username, username) });
        if (!user) { const err: CustomError = new Error('User not found'); err.statusCode = 401; throw err; }

        const match = await bcrypt.compare(password, user.password);
        if (!match) { const err: CustomError = new Error('Invalid password'); err.statusCode = 401; throw err; }

        const payload: UserPayload = { username: user.username, email: user.email, userId: user.id };
        const opts: SignOptions     = { expiresIn: '1h' };
        const token = jwt.sign(payload, process.env.SECRET_KEY!, opts);

        res.status(200).json({ auth_token: token, userId: user.id, email: user.email, username: user.username, has_api_key: !!user.apiKey });
    } catch (err) {
        const e = err as CustomError;
        if (!e.statusCode) e.statusCode = 500;
        next(e);
    }
};

export const generateApiKey = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        if (!userId) { const err: CustomError = new Error('User not found'); err.statusCode = 401; throw err; }

        const raw    = hrelay_;
        const hashed = createHash('sha256').update(raw).digest('hex');

        await db.update(userTable).set({ apiKey: hashed }).where(eq(userTable.id, userId));
        res.status(200).json({ apiKey: raw });
    } catch (err) {
        const e = err as CustomError;
        if (!e.statusCode) e.statusCode = 500;
        next(e);
    }
};
