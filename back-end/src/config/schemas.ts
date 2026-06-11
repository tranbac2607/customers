import { customerSchemas } from '@/modules/customers/customer.routes';

export const allSchemas = {
  ...customerSchemas,
  Error: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      error: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          message: { type: 'string' },
          details: {},
        },
      },
    },
  },
};
