/**
 * Built by Reabot6 from SFG (seofg.xyz)
 * Open-source — github.com/reabot6/hookrelay
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const KEY       = Buffer.from(process.env.ENCRYPT_KEY!, 'hex');
const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
    const iv      = randomBytes(16);
    const cipher  = createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return ${iv.toString('hex')}::;
}

export function decrypt(hash: string): string {
    const [iv, authTag, encryptedText] = hash.split(':');
    if (!iv || !authTag || !encryptedText) throw new Error('Invalid encrypted hash format');

    const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    return decipher.update(encryptedText, 'hex', 'utf8') + decipher.final('utf8');
}
