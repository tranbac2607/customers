import { ICustomer, IIdentityDocument } from './customer.model';
import { Types } from 'mongoose';

export interface CustomerResponse {
  id: string;
  fullName: string;
  dateOfBirth: string;
  address: string;
  phone: string;
  email: string;
  gender: 'male' | 'female' | 'other';
  nationality: string;
  occupation: string;
  identityDocuments: Array<{
    id: string;
    type: 'CCCD' | 'DRIVER_LICENSE' | 'PASSPORT';
    number: string;
    issueDate: string;
    issuePlace: string;
  }>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const docToResponse = (d: IIdentityDocument) => ({
  id: d._id?.toString() ?? '',
  type: d.type,
  number: d.number,
  issueDate: d.issueDate.toISOString(),
  issuePlace: d.issuePlace,
});

export const customerResponseDto = (c: ICustomer): CustomerResponse => ({
  id: c._id.toString(),
  fullName: c.fullName,
  dateOfBirth: c.dateOfBirth.toISOString(),
  address: c.address,
  phone: c.phone,
  email: c.email,
  gender: c.gender,
  nationality: c.nationality,
  occupation: c.occupation,
  identityDocuments: c.identityDocuments.map(docToResponse),
  createdBy: c.createdBy instanceof Types.ObjectId ? c.createdBy.toString() : String(c.createdBy),
  createdAt: c.createdAt.toISOString(),
  updatedAt: c.updatedAt.toISOString(),
});

export interface PaginatedCustomersResponse {
  items: CustomerResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
