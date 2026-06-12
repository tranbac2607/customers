import swaggerJSDoc from 'swagger-jsdoc';
import path from 'path';
import { env } from './env';
import { allSchemas } from './schemas';

const isProduction = env.NODE_ENV === 'production';

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Customer Management API',
      version: '1.0.0',
      description: 'REST API for managing customers and their identity documents.',
      contact: { name: 'API Support' },
    },
    servers: [
      { url: `http://localhost:${env.PORT}`, description: 'Local dev' },
      { url: 'https://api.example.com', description: 'Production (placeholder)' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste access token from /api/auth/login',
        },
      },
      schemas: allSchemas,
    },
    tags: [{ name: 'Health' }, { name: 'Auth' }, { name: 'Customers' }],
  },
  apis: isProduction
    ? [
        path.join(__dirname, '..', 'modules', '**', '*.{ts,js}'),
        path.join(__dirname, '..', 'app.js'),
      ]
    : ['./src/modules/**/*.ts', './src/app.ts'],
});

export const isSwaggerEnabled =
  env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true';
