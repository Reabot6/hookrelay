/**
 * Built by Reabot6 from SFG (seofg.xyz)
 * Open-source — github.com/reabot6/hookrelay
 */
import { Router } from 'express';
import { listDeliveries, replayDelivery, getStats, getRecentDeliveries } from '../controller/deliveries.js';

const router = Router();

router.get('/stats',                getStats);
router.get('/recent',               getRecentDeliveries);
router.get('/:endpointId',          listDeliveries);
router.post('/:callbackId/replay',  replayDelivery);

export default router;
