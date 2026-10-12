/**
 * Built by Reabot6 from SFG (seofg.xyz)
 * Open-source — github.com/reabot6/hookrelay
 */
import type { NextFunction, Response } from 'express';
import type { AuthRequest, CustomError } from '../shared/types.js';
import { db } from '../db/index.js';
import { callbackTable, endpointTable } from '../db/schema.js';
import { validationResult } from 'express-validator';
import { and, eq, sql } from 'drizzle-orm';
import { addDeliveryJob } from '../queue/delivery.js';

export const simulateEvent = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const e: CustomError = new Error('Invalid inputs'); e.statusCode = 422; e.data = errors.array(); throw e;
        }

        const endpointId  = req.params.endpointId as string;
        const eventType   = req.body.type as string;
        const activeUserId = req.user?.id ?? req.userId;

        if (!activeUserId) { const e: CustomError = new Error('Unauthenticated'); e.statusCode = 401; throw e; }
        if (!endpointId)   { const e: CustomError = new Error('Missing endpoint ID'); e.statusCode = 400; throw e; }

        const ep = await db.query.endpointTable.findFirst({
            where: and(
                eq(endpointTable.id, endpointId),
                sql${endpointTable.subscribedEvent} @> ARRAY[]::text[]
            )
        });

        if (!ep || ep.userId !== activeUserId) {
            const e: CustomError = new Error('Not authorized'); e.statusCode = 403; throw e;
        }

        const [cb] = await db.insert(callbackTable).values({
            status:     'pending',
            payload:    JSON.stringify(req.body),
            eventType,
            endpointId,
        }).returning();
        if (!cb) { const e: CustomError = new Error('Failed to create callback'); e.statusCode = 500; throw e; }

        await addDeliveryJob(cb.id);
        res.status(200).json({ callbackId: cb.id, status: cb.status, response: { code: 200, body: 'Accepted' } });
    } catch (err) {
        const e = err as CustomError;
        if (!e.statusCode) e.statusCode = 500;
        next(e);
    }
};
