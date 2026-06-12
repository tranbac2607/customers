import { Router } from 'express';
import { customerController } from './customer.controller';
import { authenticate } from '@/modules/auth/auth.middleware';
import { validate } from '@/middlewares/validate.middleware';
import {
  createCustomerSchema,
  idParamSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from './customer.schema';
import { asyncHandler } from '@/utils/asyncHandler';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/customers:
 *   get:
 *     tags: [Customers]
 *     summary: List customers (paginated, searchable, sortable)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [createdAt, fullName, dateOfBirth, email] }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: List with pagination meta
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Customer' }
 *                     pagination: { $ref: '#/components/schemas/Pagination' }
 *       401: { description: Unauthorized }
 */
router.get('/', validate(listCustomersQuerySchema, 'query'), asyncHandler(customerController.list));

/**
 * @openapi
 * /api/customers/{id}:
 *   get:
 *     tags: [Customers]
 *     summary: Get a customer by id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Customer object }
 *       404: { description: Not found }
 */
router.get('/:id', validate(idParamSchema, 'params'), asyncHandler(customerController.get));

/**
 * @openapi
 * /api/customers:
 *   post:
 *     tags: [Customers]
 *     summary: Create a customer
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateCustomerRequest' }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Validation error }
 *       409: { description: Email already exists }
 */
router.post('/', validate(createCustomerSchema), asyncHandler(customerController.create));

/**
 * @openapi
 * /api/customers/{id}:
 *   put:
 *     tags: [Customers]
 *     summary: Update a customer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateCustomerRequest' }
 *     responses:
 *       200: { description: Updated customer }
 *       404: { description: Not found }
 */
router.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateCustomerSchema),
  asyncHandler(customerController.update),
);

/**
 * @openapi
 * /api/customers/{id}:
 *   delete:
 *     tags: [Customers]
 *     summary: Soft delete a customer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: No content }
 *       404: { description: Not found }
 */
router.delete('/:id', validate(idParamSchema, 'params'), asyncHandler(customerController.remove));

// Swagger component schemas (registered once via app.ts registration of paths file)
export const customerSchemas = {
  Customer: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      fullName: { type: 'string' },
      dateOfBirth: { type: 'string', format: 'date-time' },
      address: { type: 'string' },
      phone: { type: 'string' },
      email: { type: 'string' },
      gender: { type: 'string', enum: ['male', 'female', 'other'] },
      nationality: { type: 'string' },
      occupation: { type: 'string' },
      identityDocuments: {
        type: 'array',
        items: { $ref: '#/components/schemas/IdentityDocument' },
      },
      createdBy: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  IdentityDocument: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      type: { type: 'string', enum: ['CCCD', 'DRIVER_LICENSE', 'PASSPORT'] },
      number: { type: 'string' },
      issueDate: { type: 'string', format: 'date-time' },
      issuePlace: { type: 'string' },
    },
  },
  CreateCustomerRequest: {
    type: 'object',
    required: [
      'fullName',
      'dateOfBirth',
      'address',
      'phone',
      'email',
      'gender',
      'nationality',
      'occupation',
    ],
    properties: {
      fullName: { type: 'string', maxLength: 200 },
      dateOfBirth: { type: 'string', format: 'date-time' },
      address: { type: 'string', maxLength: 500 },
      phone: { type: 'string', maxLength: 30 },
      email: { type: 'string', format: 'email' },
      gender: { type: 'string', enum: ['male', 'female', 'other'] },
      nationality: { type: 'string', maxLength: 100 },
      occupation: { type: 'string', maxLength: 200 },
      identityDocuments: {
        type: 'array',
        items: { $ref: '#/components/schemas/IdentityDocument' },
        maxItems: 10,
      },
    },
  },
  UpdateCustomerRequest: {
    type: 'object',
    properties: {
      fullName: { type: 'string', maxLength: 200 },
      dateOfBirth: { type: 'string', format: 'date-time' },
      address: { type: 'string', maxLength: 500 },
      phone: { type: 'string', maxLength: 30 },
      email: { type: 'string', format: 'email' },
      gender: { type: 'string', enum: ['male', 'female', 'other'] },
      nationality: { type: 'string', maxLength: 100 },
      occupation: { type: 'string', maxLength: 200 },
      identityDocuments: {
        type: 'array',
        items: { $ref: '#/components/schemas/IdentityDocument' },
        maxItems: 10,
      },
    },
  },
  Pagination: {
    type: 'object',
    properties: {
      page: { type: 'integer' },
      limit: { type: 'integer' },
      total: { type: 'integer' },
      totalPages: { type: 'integer' },
      hasNext: { type: 'boolean' },
      hasPrev: { type: 'boolean' },
    },
  },
};

export default router;
