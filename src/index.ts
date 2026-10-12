/**
 * Built by Reabot6 from SFG (seofg.xyz)
 * Open-source — github.com/reabot6/hookrelay
 */
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { pool } from './db/index.js';
import type { BufferRequest, CustomError } from './shared/types.js';
import authRouter      from './routes/auth.js';
import endpointRouter  from './routes/endpoint.js';
import inboundRouter   from './routes/inbound.js';
import simulatorRouter from './routes/simulator.js';
import deliveryRouter  from './routes/deliveries.js';
import { hasApiKey }   from './middleware/has-api-key.js';
import { isAuth }      from './middleware/is-auth.js';

const app  = express();
const PORT = process.env.PORT || 8080;

app.use(cors());

// Inbound MUST be mounted before express.json() to capture raw body buffer
app.use('/api/inbound', express.json({
    verify: (req: BufferRequest, _res, buf) => { req.rawBody = buf; }
}), inboundRouter);

app.use(express.json());

// Global error handler
app.use((error: CustomError, _req: Request, res: Response, _next: NextFunction) => {
    res.status(error.statusCode || 500).json({
        message: error.message,
        data:    error.data,
    });
});

app.get('/api', (_req: Request, res: Response) => {
    res.json({ message: 'HookRelay API is live' });
});

// Programmatic routes (API key auth)
app.use('/api/auth',       authRouter);
app.use('/api/endpoints',  hasApiKey, endpointRouter);
app.use('/api/simulator',  hasApiKey, simulatorRouter);
app.use('/api/deliveries', hasApiKey, deliveryRouter);

// Dashboard routes (JWT auth)
app.use('/api/dashboard/endpoints',  isAuth, endpointRouter);
app.use('/api/dashboard/deliveries', isAuth, deliveryRouter);
app.use('/api/dashboard/simulator',  isAuth, simulatorRouter);

const boot = async () => {
    try {
        await pool.query('SELECT 1');
        console.log('Database connected');
        app.listen(PORT, () => console.log(HookRelay API running at http://localhost:));
    } catch (err) {
        console.error('Failed to connect to database:', err);
        process.exit(1);
    }
};

boot();
