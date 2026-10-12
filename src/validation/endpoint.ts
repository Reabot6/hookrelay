/**
 * Built by Reabot6 from SFG (seofg.xyz)
 * Open-source — github.com/reabot6/hookrelay
 */
import { body } from 'express-validator';

export const createEndpointValidation = [
    body('url').trim().notEmpty().isURL().withMessage('Provide a valid URL'),
    body('subscribed_event').trim().notEmpty().withMessage('At least one event is required'),
    body('external_source').trim().notEmpty().withMessage('External source is required'),
    body('secret').optional().trim().notEmpty().withMessage('Secret cannot be empty if provided'),
];

export const updateEndpointValidation = [
    body('url').optional().trim().notEmpty().isURL().withMessage('Provide a valid URL'),
    body('subscribed_event').optional().trim().notEmpty().withMessage('At least one event is required'),
    body('status').optional().trim().isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
    body('secret').optional().trim().notEmpty().withMessage('Secret cannot be empty if provided'),
];
