/**
 * Built by Reabot6 from SFG (seofg.xyz)
 * Open-source — github.com/reabot6/hookrelay
 */
import { body } from 'express-validator';
import { db }   from '../db/index.js';
import { userTable } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const signupValidation = [
    body('username').notEmpty().trim().custom(async (value) => {
        const existing = await db.select().from(userTable).where(eq(userTable.username, value));
        if (existing.length > 0) return Promise.reject('Username already exists');
    }),
    body('email').trim().notEmpty().isEmail().withMessage('Provide a valid email'),
    body('password').trim().notEmpty().withMessage('Password is required'),
];

export const loginValidation = [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').trim().notEmpty().withMessage('Password is required'),
];
