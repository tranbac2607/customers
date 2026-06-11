import { customerRepository } from './customer.repository';
import { CreateCustomerInput, ListCustomersQuery, UpdateCustomerInput } from './customer.schema';
import { ApiError } from '@/utils/ApiError';
import { buildPaginationMeta } from '@/utils/pagination';
import { ICustomer } from './customer.model';
import { customerResponseDto, PaginatedCustomersResponse, CustomerResponse } from './customer.dto';

export const customerService = {
  async list(query: ListCustomersQuery): Promise<PaginatedCustomersResponse> {
    const { items, total } = await customerRepository.findMany(query);
    const meta = buildPaginationMeta(total, { page: query.page, limit: query.limit });
    return {
      items: items.map(customerResponseDto),
      pagination: meta,
    };
  },

  async get(id: string): Promise<CustomerResponse> {
    const c = await customerRepository.findByIdActive(id);
    if (!c) throw ApiError.notFound('Customer not found');
    return customerResponseDto(c);
  },

  async create(input: CreateCustomerInput, userId: string): Promise<CustomerResponse> {
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
      userId,
    );
    return customerResponseDto(created as ICustomer);
  },

  async update(id: string, input: UpdateCustomerInput): Promise<CustomerResponse> {
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
    return customerResponseDto(updated);
  },

  async remove(id: string): Promise<void> {
    const result = await customerRepository.softDelete(id);
    if (!result) throw ApiError.notFound('Customer not found');
  },
};
