/**
 * Built by Reabot6 from SFG (seofg.xyz)
 * Open-source — github.com/reabot6/hookrelay
 */
import { createHmac, timingSafeEqual } from 'crypto';
import type { Response }               from 'express';
import type { BufferRequest, Callback, CustomError } from '../shared/types.js';
import { decrypt }        from './encryption.js';
import { db }             from '../db/index.js';
import { callbackTable, endpointTable } from '../db/schema.js';
import { and, arrayContains, eq } from 'drizzle-orm';
import { addDeliveryJob } from '../queue/delivery.js';

const createCallback = async (endpointId: string, event: string, body: unknown): Promise<Callback> => {
    const [cb] = await db.insert(callbackTable).values({
        status:     'pending',
        payload:    JSON.stringify(body),
        eventType:  event,
        endpointId,
    }).returning();
    if (!cb) { const e: CustomError = new Error('Failed to create callback'); e.statusCode = 500; throw e; }
    await addDeliveryJob(cb.id);
    return cb;
};

const resolveEndpoint = async (endpointId: string, event: string) => {
    const ep = await db.query.endpointTable.findFirst({
        where: and(eq(endpointTable.id, endpointId), arrayContains(endpointTable.subscribedEvent, [event]))
    });
    return ep ?? null;
};

export const githubHandler = async (req: BufferRequest, res: Response, endpointId: string): Promise<Callback | null> => {
    const signature = req.headers['x-hub-signature-256'] as string;
    const event     = req.headers['x-github-event'] as string;
    if (!signature || !event) { res.status(401).json({ message: 'Missing GitHub headers' }); return null; }

    const ep = await resolveEndpoint(endpointId, event);
    if (!ep)  { res.status(404).json({ message: 'Endpoint not found or not subscribed' }); return null; }

    const raw    = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    const secret = decrypt(ep.secret);
    const digest = 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex');
    if (!timingSafeEqual(Buffer.from(digest), Buffer.from(signature))) {
        res.status(401).json({ message: 'Invalid GitHub signature' }); return null;
    }
    return createCallback(endpointId, event, req.body);
};

export const stripeHandler = async (req: BufferRequest, res: Response, endpointId: string): Promise<Callback | null> => {
    const sigHeader = req.headers['stripe-signature'] as string;
    const event     = req.body.type as string;
    if (!sigHeader || !event) { res.status(401).json({ message: 'Missing Stripe headers' }); return null; }

    const ep = await resolveEndpoint(endpointId, event);
    if (!ep)  { res.status(404).json({ message: 'Endpoint not found or not subscribed' }); return null; }

    const parts     = sigHeader.split(',');
    const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
    const received  = parts.find(p => p.startsWith('v1='))?.split('=')[1];
    if (!timestamp || !received) { res.status(401).json({ message: 'Invalid signature format' }); return null; }

    const raw     = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    const secret  = decrypt(ep.secret);
    const computed = createHmac('sha256', secret).update(${timestamp}.).digest('hex');
    if (!timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(received, 'hex'))) {
        res.status(401).json({ message: 'Invalid Stripe signature' }); return null;
    }
    return createCallback(endpointId, event, req.body);
};

export const paystackHandler = async (req: BufferRequest, res: Response, endpointId: string): Promise<Callback | null> => {
    const signature = req.headers['x-paystack-signature'] as string;
    const event     = req.body.event as string;
    if (!signature || !event) { res.status(401).json({ message: 'Missing Paystack headers' }); return null; }

    const ep = await resolveEndpoint(endpointId, event);
    if (!ep)  { res.status(404).json({ message: 'Endpoint not found or not subscribed' }); return null; }

    const raw    = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    const digest = createHmac('sha512', decrypt(ep.secret)).update(raw).digest('hex');
    if (!timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(signature, 'hex'))) {
        res.status(401).json({ message: 'Invalid Paystack signature' }); return null;
    }
    return createCallback(endpointId, event, req.body);
};

export const slackHandler = async (req: BufferRequest, res: Response, endpointId: string): Promise<Callback | null> => {
    const signature = req.headers['x-slack-signature'] as string;
    const timestamp = req.headers['x-slack-request-timestamp'] as string;
    const event     = (req.body.event?.type ?? req.body.type) as string;
    if (!signature || !event || !timestamp) { res.status(401).json({ message: 'Missing Slack headers' }); return null; }

    if (parseInt(timestamp) < Math.floor(Date.now() / 1000) - 300) {
        res.status(401).json({ message: 'Replay attack detected' }); return null;
    }

    const ep = await resolveEndpoint(endpointId, event);
    if (!ep)  { res.status(404).json({ message: 'Endpoint not found or not subscribed' }); return null; }

    const raw    = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    const digest = 'v0=' + createHmac('sha256', decrypt(ep.secret)).update(0::).digest('hex');
    if (!timingSafeEqual(Buffer.from(digest), Buffer.from(signature))) {
        res.status(401).json({ message: 'Invalid Slack signature' }); return null;
    }
    return createCallback(endpointId, event, req.body);
};

export const shopifyHandler = async (req: BufferRequest, res: Response, endpointId: string): Promise<Callback | null> => {
    const signature = req.headers['x-shopify-hmac-sha256'] as string;
    const event     = req.headers['x-shopify-topic'] as string;
    if (!signature || !event) { res.status(401).json({ message: 'Missing Shopify headers' }); return null; }

    const ep = await resolveEndpoint(endpointId, event);
    if (!ep)  { res.status(404).json({ message: 'Endpoint not found or not subscribed' }); return null; }

    const raw    = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    const digest = createHmac('sha256', decrypt(ep.secret)).update(raw).digest('base64');
    if (!timingSafeEqual(Buffer.from(digest, 'base64'), Buffer.from(signature, 'base64'))) {
        res.status(401).json({ message: 'Invalid Shopify signature' }); return null;
    }
    return createCallback(endpointId, event, req.body);
};

export const SOURCE_HANDLERS: Record<string, (req: BufferRequest, res: Response, endpointId: string) => Promise<Callback | null>> = {
    github:   githubHandler,
    stripe:   stripeHandler,
    paystack: paystackHandler,
    slack:    slackHandler,
    shopify:  shopifyHandler,
};
