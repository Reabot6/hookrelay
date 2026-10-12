/**
 * Built by Reabot6 from SFG (seofg.xyz)
 * Open-source — github.com/reabot6/hookrelay
 */
import type { NextFunction, Response } from 'express';
import type { AuthRequest, CustomError, Endpoint } from '../shared/types.js';
import { db } from '../db/index.js';
import { endpointTable } from '../db/schema.js';
import crypto from 'crypto';
import { encrypt } from '../service/encryption.js';
import { and, eq } from 'drizzle-orm';

const resolveUserId = (req: AuthRequest): string => {
    const id = req.user?.id ?? req.userId;
    if (!id) { const e: CustomError = new Error('Unauthenticated'); e.statusCode = 401; throw e; }
    return id;
};

export const createEndpoint = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const activeUserId = resolveUserId(req);
        const { url, subscribed_event, external_source } = req.body;
        let secret = req.body.secret ?? crypto.randomBytes(32).toString('hex');

        const [ep] = await db.insert(endpointTable).values({
            endpointPath:    url,
            secret:          encrypt(secret),
            subscribedEvent: subscribed_event.split(','),
            externalSource:  external_source,
            userId:          activeUserId,
        }).returning();
        if (!ep) { const e: CustomError = new Error('Failed to create endpoint'); e.statusCode = 500; throw e; }

        res.status(201).json({ endpoint: { ...ep, secret } as Endpoint });
    } catch (err) { const e = err as CustomError; if (!e.statusCode) e.statusCode = 500; next(e); }
};

export const listEndpoints = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = resolveUserId(req);
        const eps    = await db.query.endpointTable.findMany({
            where: eq(endpointTable.userId, userId),
            with:  { callbacks: { columns: { status: true } } },
        });

        const result = eps.map(({ callbacks, ...ep }) => ({
            ...ep,
            deliveredCount: callbacks.filter(c => c.status === 'delivered').length,
            failedCount:    callbacks.filter(c => c.status === 'failed').length,
            deadCount:      callbacks.filter(c => c.status === 'dead').length,
        }));

        res.status(200).json({ endpoints: result });
    } catch (err) { const e = err as CustomError; if (!e.statusCode) e.statusCode = 500; next(e); }
};

export const getEndpoint = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId     = resolveUserId(req);
        const endpointId = req.params.id as string;
        if (!endpointId) { const e: CustomError = new Error('Missing endpoint ID'); e.statusCode = 400; throw e; }

        const ep = await db.query.endpointTable.findFirst({
            where: and(eq(endpointTable.id, endpointId), eq(endpointTable.userId, userId)),
            with:  { callbacks: { columns: { status: true } } },
        });
        if (!ep) { const e: CustomError = new Error('Endpoint not found'); e.statusCode = 404; throw e; }

        const { callbacks, ...epData } = ep;
        const stats = callbacks.reduce((a, c) => {
            if (c.status === 'delivered') a.deliveredCount++;
            else if (c.status === 'failed') a.failedCount++;
            else if (c.status === 'dead')   a.deadCount++;
            return a;
        }, { deliveredCount: 0, failedCount: 0, deadCount: 0 });

        res.status(200).json({ endpoint: { ...epData, stats } });
    } catch (err) { const e = err as CustomError; if (!e.statusCode) e.statusCode = 500; next(e); }
};

export const updateEndpoint = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId     = resolveUserId(req);
        const endpointId = req.params.id as string;
        if (!endpointId) { const e: CustomError = new Error('Missing endpoint ID'); e.statusCode = 400; throw e; }

        const patch: Partial<typeof endpointTable.> = {};
        if (req.body.url              !== undefined) patch.endpointPath    = req.body.url;
        if (req.body.status           !== undefined) patch.status          = req.body.status;
        if (req.body.subscribed_event !== undefined) patch.subscribedEvent = req.body.subscribed_event.split(',');
        if (req.body.secret           !== undefined) patch.secret          = encrypt(req.body.secret);

        if (Object.keys(patch).length === 0) {
            const e: CustomError = new Error('No update data provided'); e.statusCode = 400; throw e;
        }

        const [updated] = await db.update(endpointTable).set(patch)
            .where(and(eq(endpointTable.id, endpointId), eq(endpointTable.userId, userId)))
            .returning();
        if (!updated) { const e: CustomError = new Error('Endpoint not found or unauthorized'); e.statusCode = 403; throw e; }

        res.status(200).json({ endpoint: updated });
    } catch (err) { const e = err as CustomError; if (!e.statusCode) e.statusCode = 500; next(e); }
};

export const deleteEndpoint = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId     = resolveUserId(req);
        const endpointId = req.params.id as string;
        if (!endpointId) { const e: CustomError = new Error('Missing endpoint ID'); e.statusCode = 400; throw e; }

        const ep = await db.query.endpointTable.findFirst({ where: eq(endpointTable.id, endpointId) });
        if (!ep) { const e: CustomError = new Error('Endpoint not found'); e.statusCode = 404; throw e; }
        if (ep.userId !== userId) { const e: CustomError = new Error('Unauthorized'); e.statusCode = 403; throw e; }

        await db.delete(endpointTable).where(eq(endpointTable.id, endpointId));
        res.status(200).json({ message: 'Endpoint deleted' });
    } catch (err) { const e = err as CustomError; if (!e.statusCode) e.statusCode = 500; next(e); }
};
