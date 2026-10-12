/**
 * Built by Reabot6 from SFG (seofg.xyz)
 * Open-source — github.com/reabot6/hookrelay
 */
import type { Request }          from 'express';
import type { ValidationError }  from 'express-validator';
import type { JwtPayload }       from 'jsonwebtoken';

export type CustomError = Error & {
    statusCode?: number;
    data?: ValidationError[];
};

export interface AuthRequest extends Request {
    userId?: string;
    user?:   User;
}

export interface BufferRequest extends Request {
    rawBody?: Buffer<ArrayBufferLike>;
}

export interface UserPayload extends JwtPayload {
    username: string;
    email:    string;
    userId:   string;
}

export interface User {
    id:        string;
    username:  string;
    email:     string;
    password:  string;
    apiKey:    string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface Endpoint {
    id:              string;
    endpointPath:    string;
    secret:          string;
    status:          'active' | 'inactive';
    subscribedEvent: string[];
    externalSource:  string;
    userId:          string;
    createdAt:       Date;
    updatedAt:       Date;
}

export interface Callback {
    id:           string;
    status:       'pending' | 'delivered' | 'failed' | 'dead';
    responseCode: string | null;
    responseBody: string | null;
    attempts:     number;
    nextRetry:    string | null;
    payload:      string | null;
    eventType:    string;
    endpointId:   string;
    createdAt:    Date;
    updatedAt:    Date;
}
