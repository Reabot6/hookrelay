/**
 * Built by Reabot6 from SFG (seofg.xyz)
 * Open-source — github.com/reabot6/hookrelay
 */
import { Router } from 'express';
import { handleInbound } from '../controller/inbound.js';

const router = Router();
router.post('/:endpointId', handleInbound);

export default router;
