/**
 * Built by Reabot6 from SFG (seofg.xyz)
 * Open-source — github.com/reabot6/hookrelay
 */
import { Router } from 'express';
import { createEndpointValidation, updateEndpointValidation } from '../validation/endpoint.js';
import { createEndpoint, listEndpoints, getEndpoint, updateEndpoint, deleteEndpoint } from '../controller/endpoint.js';

const router = Router();

router.post('/',    createEndpointValidation, createEndpoint);
router.get('/',     listEndpoints);
router.get('/:id',  getEndpoint);
router.put('/:id',  updateEndpointValidation, updateEndpoint);
router.delete('/:id', deleteEndpoint);

export default router;
