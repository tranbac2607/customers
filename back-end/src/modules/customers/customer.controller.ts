import { Request, Response } from 'express';
import { customerService } from './customer.service';
import { ok } from '@/utils/ApiResponse';
import { CreateCustomerInput, ListCustomersQuery, UpdateCustomerInput } from './customer.schema';

const paramString = (v: string | string[] | undefined): string => {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
};

const meta = (req: Request) => ({
  actorId: req.user!.id,
  ip: req.ip,
  userAgent: req.header('user-agent'),
});

export const customerController = {
  async list(req: Request, res: Response) {
    const query = req.query as unknown as ListCustomersQuery;
    const result = await customerService.list(query);
    res.json(ok(result));
  },

  async listTrashed(req: Request, res: Response) {
    const query = req.query as unknown as ListCustomersQuery;
    const result = await customerService.listTrashed(query, meta(req));
    res.json(ok(result));
  },

  async get(req: Request, res: Response) {
    const id = paramString(req.params.id);
    const customer = await customerService.get(id);
    res.json(ok(customer));
  },

  async create(req: Request, res: Response) {
    const input = req.body as CreateCustomerInput;
    const created = await customerService.create(input, meta(req));
    res.status(201).json(ok(created));
  },

  async update(req: Request, res: Response) {
    const id = paramString(req.params.id);
    const input = req.body as UpdateCustomerInput;
    const updated = await customerService.update(id, input, meta(req));
    res.json(ok(updated));
  },

  async remove(req: Request, res: Response) {
    const id = paramString(req.params.id);
    await customerService.remove(id, meta(req));
    res.status(204).send();
  },

  async restore(req: Request, res: Response) {
    const id = paramString(req.params.id);
    const restored = await customerService.restore(id, meta(req));
    res.json(ok(restored));
  },

  async hardDelete(req: Request, res: Response) {
    const id = paramString(req.params.id);
    await customerService.hardDelete(id, meta(req));
    res.status(204).send();
  },

  async bulkDelete(req: Request, res: Response) {
    const { ids } = req.body as { ids: string[] };
    const result = await customerService.bulkDelete(ids, meta(req));
    res.json(ok(result));
  },

  async bulkRestore(req: Request, res: Response) {
    const { ids } = req.body as { ids: string[] };
    const result = await customerService.bulkRestore(ids, meta(req));
    res.json(ok(result));
  },

  async exportCsv(req: Request, res: Response) {
    const query = req.query as unknown as ListCustomersQuery;
    const csv = await customerService.exportCsv(query);
    const filename = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  },
};