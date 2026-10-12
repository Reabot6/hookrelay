/**
 * Built by Reabot6 from SFG (seofg.xyz)
 * Open-source — github.com/reabot6/hookrelay
 */
import type { NextFunction, Response } from 'express';
import { createHash }                  from 'crypto';
import type { AuthRequest, CustomError, User } from '../shared/types.js';
import { db }        from '../db/index.js';
import { userTable } from '../db/schema.js';
import { eq }        from 'drizzle-orm';

export const hasApiKey = async (req: AuthRequest, _res: Response, next: NextFunction) => {
    const header = req.get('Authorization');
    const token  = header?.split(' ')[1];

    if (!header || !token) {
        const err: CustomError = new Error('Missing API key');
        err.statusCode = 401;
        return next(err);
    }

    try {
        const hashed     = createHash('sha256').update(token).digest('hex');
        const loadedUser = await db.query.userTable.findFirst({ where: eq(userTable.apiKey, hashed) });

        if (!loadedUser) {
            const err: CustomError = new Error('Invalid API key');
            err.statusCode = 401;
            return next(err);
        }

        req.user = loadedUser as User;
        next();
    } catch (err) {
        const error     = err as CustomError;
        error.message   = 'API key invalid';
        error.statusCode = 401;
        next(error);
    }
};
