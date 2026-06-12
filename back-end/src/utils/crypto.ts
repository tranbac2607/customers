import { createHash, randomUUID } from 'crypto';

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const newJti = (): string => randomUUID();
