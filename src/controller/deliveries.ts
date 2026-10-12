/**
 * Built by Reabot6 from SFG (seofg.xyz)
 * Open-source — github.com/reabot6/hookrelay
 */
import type { NextFunction, Response } from 'express';
import type { AuthRequest, CustomError } from '../shared/types.js';
import { db } from '../db/index.js';
import { callbackTable, endpointTable } from '../db/schema.js';
import { desc, eq, inArray } from 'drizzle-orm';
import { addDeliveryJob } from '../queue/delivery.js';

const resolveUserId = (req: AuthRequest): string => {
    const id = req.user?.id ?? req.userId;
    if (!id) { const e: CustomError = new Error('Unauthenticated'); e.statusCode = 401; throw e; }
    return id;
};

export const listDeliveries = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId     = resolveUserId(req);
        const endpointId = req.params.endpointId as string;
        if (!endpointId) { const e: CustomError = new Error('Missing endpoint ID'); e.statusCode = 400; throw e; }

        const ep = await db.query.endpointTable.findFirst({
            where: eq(endpointTable.id, endpointId),
            with:  { callbacks: true },
        });

        if (!ep || ep.userId !== userId) {
            const e: CustomError = new Error('Not authorized'); e.statusCode = 403; throw e;
        }

        res.status(200).json({ callbacks: ep.callbacks });
    } catch (err) { const e = err as CustomError; if (!e.statusCode) e.statusCode = 500; next(e); }
};

export const replayDelivery = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId     = resolveUserId(req);
        const callbackId = req.params.callbackId as string;
        if (!callbackId) { const e: CustomError = new Error('Missing callback ID'); e.statusCode = 400; throw e; }

        const cb = await db.query.callbackTable.findFirst({
            where: eq(callbackTable.id, callbackId),
            with:  { endpoint: true },
        });

        if (!cb?.endpoint || cb.endpoint.userId !== userId) {
            const e: CustomError = new Error('Not authorized'); e.statusCode = 403; throw e;
        }

        if (cb.status !== 'failed' && cb.status !== 'dead') {
            const e: CustomError = new Error('Only failed or dead deliveries can be replayed'); e.statusCode = 400; throw e;
        }

        const [updated] = await db.update(callbackTable)
            .set({ status: 'pending', attempts: 0, nextRetry: null })
            .where(eq(callbackTable.id, callbackId)).returning();
        if (!updated) { const e: CustomError = new Error('Failed to update callback'); e.statusCode = 500; throw e; }

        await addDeliveryJob(updated.id);
        res.status(200).send('Accepted');
    } catch (err) { const e = err as CustomError; if (!e.statusCode) e.statusCode = 500; next(e); }
};

export const getStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = resolveUserId(req);
        const eps    = await db.query.endpointTable.findMany({
            where: eq(endpointTable.userId, userId),
            with:  { callbacks: true },
        });

        const stats = eps.reduce((acc, ep) => {
            acc.totalDeliveries += ep.callbacks.length;
            ep.callbacks.forEach(cb => {
                if (cb.status === 'delivered') acc.delivered++;
                else if (cb.status === 'failed') acc.failed++;
                else if (cb.status === 'dead')   acc.dead++;
            });
            return acc;
        }, { totalEndpoints: eps.length, totalDeliveries: 0, delivered: 0, failed: 0, dead: 0 });

        res.status(200).json(stats);
    } catch (err) { next(err); }
};

export const getRecentDeliveries = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = resolveUserId(req);
        const eps    = await db.query.endpointTable.findMany({
            where:   eq(endpointTable.userId, userId),
            columns: { id: true },
        });

        if (eps.length === 0) { res.status(200).json({ deliveries: [] }); return; }

        const deliveries = await db.query.callbackTable.findMany({
            where:   inArray(callbackTable.endpointId, eps.map(e => e.id)),
            orderBy: [desc(callbackTable.createdAt)],
            limit:   10,
            with:    { endpoint: true },
        });

        res.status(200).json({ deliveries });
    } catch (err) { next(err); }
};
