/**
 * Built by Reabot6 from SFG (seofg.xyz)
 * Open-source — github.com/reabot6/hookrelay
 */
import { Queue }   from 'bullmq';
import IORedis     from 'ioredis';

export const redisConnection = new IORedis({
    host:                 process.env.REDIS_HOST || 'localhost',
    port:                 Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
});

export const deliveryQueue = new Queue('delivery', { connection: redisConnection });

export const addDeliveryJob = async (callbackId: string, delayMs?: number) =>
    deliveryQueue.add('deliver-webhook', { callbackId }, { delay: delayMs });
