/**
 * Centralised winston logger. Configure transports at module load
 * based on NODE_ENV: dev → console (colorised), prod → daily rotate
 * file in /logs.
 */
import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import { env } from '@/config/env';

const isProd = env.NODE_ENV === 'production';
const logDir = path.resolve(process.cwd(), 'logs');

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level} ${message}${metaStr}`;
  }),
);

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: isProd ? fileFormat : consoleFormat,
  }),
];

if (isProd) {
  transports.push(
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '20m',
      format: fileFormat,
    }),
  );
  transports.push(
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d',
      format: fileFormat,
    }),
  );
}

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  transports,
});
