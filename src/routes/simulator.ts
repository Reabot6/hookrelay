/**
 * Built by Reabot6 from SFG (seofg.xyz)
 * Open-source — github.com/reabot6/hookrelay
 */
import { Router } from 'express';
import { simulatorValidation } from '../validation/simulator.js';
import { simulateEvent } from '../controller/simulator.js';

const router = Router();
router.post('/:endpointId', simulatorValidation, simulateEvent);

export default router;
