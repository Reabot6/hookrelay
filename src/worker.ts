/**
 * Built by Reabot6 from SFG (seofg.xyz)
 * Open-source — github.com/reabot6/hookrelay
 */
import { Worker } from 'bullmq';
import { addDeliveryJob, redisConnection } from './queue/delivery.js';
import { db } from './db/index.js';
import { callbackTable } from './db/schema.js';
import { eq } from 'drizzle-orm';
import { createHmac } from 'node:crypto';
import { decrypt } from './service/encryption.js';

const RETRY_DELAYS = [10, 30, 120, 600, 3600]; // seconds

const worker = new Worker(
    'delivery',
    async (job) => {
        const { callbackId } = job.data;
        console.log([Worker] Processing: );

        const callback = await db.query.callbackTable.findFirst({
            where: eq(callbackTable.id, callbackId),
            with: { endpoint: true },
        });

        if (!callback?.endpoint) throw new Error(Callback  not found);

        if (callback.endpoint.status !== 'active') {
            console.log([Worker] Endpoint inactive, skipping: );
            await db.update(callbackTable)
                .set({ status: 'failed', responseBody: 'Endpoint inactive', responseCode: '200' })
                .where(eq(callbackTable.id, callbackId));
            return;
        }

        const scheduleRetry = async (code: string, body: string) => {
            if ((callback.attempts ?? 0) >= RETRY_DELAYS.length) {
                await db.update(callbackTable)
                    .set({ status: 'dead', responseCode: code, responseBody: body })
                    .where(eq(callbackTable.id, callbackId));
                console.log([Worker] Dead: );
                return;
            }
            const base  = (RETRY_DELAYS[callback.attempts ?? 0] ?? 0) * 1000;
            const delay = base + Math.random() * base;
            await addDeliveryJob(callbackId, delay);
            await db.update(callbackTable).set({
                status:       'failed',
                responseCode:  code,
                responseBody:  body,
                attempts:     (callback.attempts ?? 0) + 1,
                nextRetry:     new Date(Date.now() + delay).toISOString(),
            }).where(eq(callbackTable.id, callbackId));
            console.log([Worker] Retrying  in  min);
        };

        try {
            const payload   = callback.payload ?? '';
            const hmac      = createHmac('sha256', decrypt(callback.endpoint.secret));
            const signature = 'hrelay_sha256=' + hmac.update(payload).digest('hex');

            const response = await fetch(callback.endpoint.endpointPath, {
                method:  'POST',
                headers: {
                    'Content-Type':           'application/json',
                    'X-HookRelay-Signature':  signature,
                    'X-HookRelay-Event':      callback.eventType,
                    'X-HookRelay-Callback-Id': callback.id,
                },
                body:   payload || '{}',
                signal: AbortSignal.timeout(10_000),
            });

            const responseBody = (await response.text()).slice(0, 1000);

            if (response.ok) {
                await db.update(callbackTable).set({
                    status:       'delivered',
                    responseCode:  response.status.toString(),
                    responseBody,
                    attempts:     (callback.attempts ?? 0) + 1,
                }).where(eq(callbackTable.id, callbackId));
                console.log([Worker] Delivered:  ());
            } else {
                await scheduleRetry(response.status.toString(), responseBody);
            }
        } catch (err) {
            await scheduleRetry('500', (err as Error).message);
        }
    },
    { connection: redisConnection, concurrency: 5 }
);

worker.on('completed', (job) => console.log([Worker] Job  completed));
worker.on('failed',    (job, err) => console.log([Worker] Job  failed: ));

console.log('HookRelay worker started — listening for jobs...');
