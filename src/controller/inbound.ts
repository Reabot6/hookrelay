/**
 * Built by Reabot6 from SFG (seofg.xyz)
 * Open-source — github.com/reabot6/hookrelay
 */
import type { NextFunction, Response } from 'express';
import type { BufferRequest, CustomError } from '../shared/types.js';
import { SOURCE_HANDLERS } from '../service/verify-webhook.js';

type SourceKey = 'stripe' | 'github' | 'slack' | 'paystack' | 'shopify';

export const handleInbound = async (req: BufferRequest, res: Response, next: NextFunction) => {
    try {
        const endpointId = req.params.endpointId as string;
        if (!endpointId) { const e: CustomError = new Error('Missing endpoint ID'); e.statusCode = 400; throw e; }

        const source: SourceKey | null =
            req.headers['x-hub-signature-256']  ? 'github'   :
            req.headers['stripe-signature']      ? 'stripe'   :
            req.headers['x-paystack-signature']  ? 'paystack' :
            req.headers['x-slack-signature']     ? 'slack'    :
            req.headers['x-shopify-hmac-sha256'] ? 'shopify'  : null;

        if (!source) { const e: CustomError = new Error('Unsupported webhook source'); e.statusCode = 400; throw e; }

        const handler  = SOURCE_HANDLERS[source];
        const callback = await handler(req, res, endpointId);

        if (!callback) return;

        res.status(200).json({ callbackId: callback.id, status: callback.status, response: { code: 200, body: 'Accepted' } });
    } catch (err) {
        const e = err as CustomError;
        if (!e.statusCode) e.statusCode = 500;
        next(e);
    }
};
