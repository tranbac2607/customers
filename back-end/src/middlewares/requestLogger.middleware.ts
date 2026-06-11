import morgan from 'morgan';
import { morganStream } from '@/config/logger';
import { env } from '@/config/env';

export const requestLoggerMiddleware = morgan(
  ':remote-addr ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms',
  {
    stream: morganStream,
    skip: (req) => env.NODE_ENV === 'test' || req.url === '/api/health',
  },
);
