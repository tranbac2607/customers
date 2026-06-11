import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { env } from './env';

const { combine, timestamp, printf, colorize, errors, splat, json } = winston.format;

const isProduction = env.NODE_ENV === 'production';

const consoleFormat = printf(({ level, message, timestamp: ts, requestId, stack }) => {
  const meta = requestId ? ` [req=${requestId}]` : '';
  const body = stack ?? (typeof message === 'object' ? JSON.stringify(message) : String(message));
  return `${ts} ${level}${meta} ${body}`;
});

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: combine(errors({ stack: true }), splat(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })),
  defaultMeta: { service: 'customers-api' },
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        splat(),
        consoleFormat,
      ),
      silent: env.NODE_ENV === 'test',
    }),
    new DailyRotateFile({
      filename: path.join('logs', 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: combine(timestamp(), errors({ stack: true }), splat(), json()),
      silent: env.NODE_ENV === 'test',
    }),
  ],
});

// Stream for morgan
export const morganStream = {
  write: (msg: string) => {
    if (logger.http) {
      logger.http(msg.trim());
    } else {
      logger.info(msg.trim());
    }
  },
};

// silence unused warning in non-prod
if (isProduction) {
  logger.info('Logger initialized (production mode)');
}
