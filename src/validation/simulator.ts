/**
 * Built by Reabot6 from SFG (seofg.xyz)
 * Open-source — github.com/reabot6/hookrelay
 */
import { body } from 'express-validator';

export const simulatorValidation = [
    body('type').trim().notEmpty().withMessage('Event type is required'),
];
