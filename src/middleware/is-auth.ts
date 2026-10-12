/**
 * Built by Reabot6 from SFG (seofg.xyz)
 * Open-source — github.com/reabot6/hookrelay
 */
import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthRequest, CustomError, UserPayload } from '../shared/types.js';

export const isAuth = (req: AuthRequest, _res: Response, next: NextFunction) => {
    const header = req.get('Authorization');
    const token  = header?.split(' ')[1];

    if (!header || !token) {
        const err: CustomError = new Error('Not authenticated');
        err.statusCode = 401;
        return next(err);
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY!) as unknown as UserPayload;
        req.userId    = decoded.userId;
        next();
    } catch (err) {
        const error      = err as CustomError;
        error.message    = 'Token expired or invalid';
        error.statusCode = 401;
        next(error);
    }
};
