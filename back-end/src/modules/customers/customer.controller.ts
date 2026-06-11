import { Request, Response } from 'express';
import { customerService } from './customer.service';
import { ok } from '@/utils/ApiResponse';
import { CreateCustomerInput, ListCustomersQuery, UpdateCustomerInput } from './customer.schema';

const paramString = (v: string | string[] | undefined): string => {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
};

export const customerController = {
  async list(req: Request, res: Response) {
    const query = req.query as unknown as ListCustomersQuery;
    const result = await customerService.list(query);
    res.json(ok(result));
  },

  async get(req: Request, res: Response) {
    const id = paramString(req.params.id);
    const customer = await customerService.get(id);
    res.json(ok(customer));
  },

  async create(req: Request, res: Response) {
    const input = req.body as CreateCustomerInput;
    const created = await customerService.create(input, req.user!.id);
    res.status(201).json(ok(created));
  },

  async update(req: Request, res: Response) {
    const id = paramString(req.params.id);
    const input = req.body as UpdateCustomerInput;
    const updated = await customerService.update(id, input);
    res.json(ok(updated));
  },

  async remove(req: Request, res: Response) {
    const id = paramString(req.params.id);
    await customerService.remove(id);
    res.status(204).send();
  },
};
