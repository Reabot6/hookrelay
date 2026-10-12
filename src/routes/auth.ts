/**
 * Built by Reabot6 from SFG (seofg.xyz)
 * Open-source — github.com/reabot6/hookrelay
 */
import { Router } from 'express';
import { signup, login, generateApiKey } from '../controller/auth.js';
import { isAuth } from '../middleware/is-auth.js';
import { loginValidation, signupValidation } from '../validation/auth.js';

const router = Router();

router.post('/register', signupValidation, signup);
router.post('/login',    loginValidation,  login);
router.put('/api-key',   isAuth,           generateApiKey);

export default router;
