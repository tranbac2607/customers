import { createApp } from './app';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/database';
import { logger } from './config/logger';

export const startServer = async (): Promise<void> => {
  try {
    await connectDB();
    const app = createApp();
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
      if (env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
        logger.info(`📚 Swagger UI:    http://localhost:${env.PORT}/api/docs`);
      }
    });

    server.on('error', (err) => {
      logger.error('HTTP server error', err);
      process.exit(1);
    });

    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}. Shutting down gracefully…`);
      server.close(async () => {
        await disconnectDB().catch((e) => logger.error('DB disconnect error', e));
        logger.info('Bye.');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10_000).unref();
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
};
