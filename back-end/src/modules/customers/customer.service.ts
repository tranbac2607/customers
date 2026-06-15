import { customerRepository } from './customer.repository';
import { CreateCustomerInput, ListCustomersQuery, UpdateCustomerInput } from './customer.schema';
import { ApiError } from '@/utils/ApiError';
import { buildPaginationMeta } from '@/utils/pagination';
import { ICustomer } from './customer.model';
import { customerResponseDto, PaginatedCustomersResponse, CustomerResponse } from './customer.dto';
import { activityLogService } from '@/services/activityLog.service';

export const customerService = {
  async list(query: ListCustomersQuery): Promise<PaginatedCustomersResponse> {
    const { items, total } = await customerRepository.findMany(query);
    const meta = buildPaginationMeta(total, { page: query.page, limit: query.limit });
    return {
      items: items.map(customerResponseDto),
      pagination: meta,
    };
  },

  async listTrashed(
    query: ListCustomersQuery,
    meta: { actorId: string; ip?: string; userAgent?: string },
  ): Promise<PaginatedCustomersResponse> {
    const { items, total } = await customerRepository.findManyTrashed(query);
    await activityLogService.log({
      userId: meta.actorId,
      action: 'customer.restore',
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { scope: 'list_trash' },
    });
    return {
      items: items.map(customerResponseDto),
      pagination: buildPaginationMeta(total, { page: query.page, limit: query.limit }),
    };
  },

  async get(id: string): Promise<CustomerResponse> {
    const c = await customerRepository.findByIdActive(id);
    if (!c) throw ApiError.notFound('Customer not found');
    return customerResponseDto(c);
  },

  async create(
    input: CreateCustomerInput,
    meta: { actorId: string; ip?: string; userAgent?: string },
  ): Promise<CustomerResponse> {
    const existing = await customerRepository.findByEmailActive(input.email);
    if (existing) throw ApiError.conflict('A customer with this email already exists');

    const created = await customerRepository.create(
      {
        fullName: input.fullName,
        dateOfBirth: input.dateOfBirth,
        address: input.address,
        phone: input.phone,
        email: input.email,
        gender: input.gender,
        nationality: input.nationality,
        occupation: input.occupation,
        identityDocuments: input.identityDocuments ?? [],
      },
      meta.actorId,
    );
    await activityLogService.log({
      userId: meta.actorId,
      action: 'customer.create',
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { customerId: created._id.toString() },
    });
    return customerResponseDto(created as ICustomer);
  },

  async update(
    id: string,
    input: UpdateCustomerInput,
    meta: { actorId: string; ip?: string; userAgent?: string },
  ): Promise<CustomerResponse> {
    const current = await customerRepository.findByIdActive(id);
    if (!current) throw ApiError.notFound('Customer not found');

    if (input.email && input.email.toLowerCase() !== current.email) {
      const conflict = await customerRepository.findByEmailActive(input.email, id);
      if (conflict) throw ApiError.conflict('A customer with this email already exists');
    }

    const updateData: Partial<ICustomer> = {
      ...(input.fullName !== undefined && { fullName: input.fullName }),
      ...(input.dateOfBirth !== undefined && { dateOfBirth: input.dateOfBirth }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.gender !== undefined && { gender: input.gender }),
      ...(input.nationality !== undefined && { nationality: input.nationality }),
      ...(input.occupation !== undefined && { occupation: input.occupation }),
      ...(input.identityDocuments !== undefined && { identityDocuments: input.identityDocuments }),
    };

    const updated = await customerRepository.update(id, updateData);
    if (!updated) throw ApiError.notFound('Customer not found');

    await activityLogService.log({
      userId: meta.actorId,
      action: 'customer.update',
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { customerId: id },
    });
    return customerResponseDto(updated);
  },

  async remove(
    id: string,
    meta: { actorId: string; ip?: string; userAgent?: string },
  ): Promise<void> {
    const result = await customerRepository.softDelete(id);
    if (!result) throw ApiError.notFound('Customer not found');
    await activityLogService.log({
      userId: meta.actorId,
      action: 'customer.soft_delete',
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { customerId: id },
    });
  },

  async restore(
    id: string,
    meta: { actorId: string; ip?: string; userAgent?: string },
  ): Promise<CustomerResponse> {
    const result = await customerRepository.restore(id);
    if (!result) throw ApiError.notFound('Deleted customer not found');
    await activityLogService.log({
      userId: meta.actorId,
      action: 'customer.restore',
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { customerId: id },
    });
    return customerResponseDto(result);
  },

  async hardDelete(
    id: string,
    meta: { actorId: string; ip?: string; userAgent?: string },
  ): Promise<void> {
    const result = await customerRepository.hardDelete(id);
    if (!result) throw ApiError.notFound('Customer not found');
    await activityLogService.log({
      userId: meta.actorId,
      action: 'customer.hard_delete',
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { customerId: id },
    });
  },

  async bulkDelete(
    ids: string[],
    meta: { actorId: string; ip?: string; userAgent?: string },
  ): Promise<{ deleted: number }> {
    if (ids.length === 0) throw ApiError.badRequest('No ids provided');
    if (ids.length > 200) throw ApiError.badRequest('Too many ids (max 200)');
    const deleted = await customerRepository.softDeleteMany(ids);
    await activityLogService.log({
      userId: meta.actorId,
      action: 'customer.bulk_delete',
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { requested: ids.length, deleted },
    });
    return { deleted };
  },

  async bulkRestore(
    ids: string[],
    meta: { actorId: string; ip?: string; userAgent?: string },
  ): Promise<{ restored: number }> {
    if (ids.length === 0) throw ApiError.badRequest('No ids provided');
    if (ids.length > 200) throw ApiError.badRequest('Too many ids (max 200)');
    const restored = await customerRepository.restoreMany(ids);
    await activityLogService.log({
      userId: meta.actorId,
      action: 'customer.bulk_delete',
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { scope: 'restore', requested: ids.length, restored },
    });
    return { restored };
  },

  /**
   * Build a CSV string from the matched customers. We hand-roll CSV
   * (no library) to keep deps small — the columns are stable and
   * we always quote every string field to be safe.
   */
  async exportCsv(query: ListCustomersQuery): Promise<string> {
    const items = await customerRepository.findAllForExport(query);
    const header = [
      'id',
      'fullName',
      'email',
      'phone',
      'gender',
      'dateOfBirth',
      'address',
      'nationality',
      'occupation',
      'identityDocuments',
      'createdAt',
      'updatedAt',
    ];
    const escape = (v: unknown): string => {
      if (v == null) return '';
      const s = String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const rows = items.map((c) =>
      [
        c._id.toString(),
        c.fullName,
        c.email,
        c.phone,
        c.gender,
        c.dateOfBirth instanceof Date ? c.dateOfBirth.toISOString() : c.dateOfBirth,
        c.address,
        c.nationality,
        c.occupation,
        (c.identityDocuments ?? [])
          .map((d) => `${d.type}:${d.number}`)
          .join('; '),
        c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
        c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
      ]
        .map(escape)
        .join(','),
    );
    return [header.map(escape).join(','), ...rows].join('\n');
  },
};