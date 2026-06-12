import type { Gender, IdentityDocument, IdentityDocumentType } from '@/store/auth/authTypes';

export { GENDERS, IDENTITY_DOCUMENT_TYPES } from '@/store/auth/authTypes';

export type SortBy = 'createdAt' | 'fullName' | 'dateOfBirth' | 'email';
export type SortOrder = 'asc' | 'desc';

export interface CustomerListQuery {
  page: number;
  limit: number;
  /** Legacy general search — ORs across multiple fields. */
  search?: string;
  /** Field-specific search terms. These AND together. */
  fullName?: string;
  gender?: Gender;
  phone?: string;
  sortBy: SortBy;
  order: SortOrder;
}

export interface CreateCustomerPayload {
  fullName: string;
  dateOfBirth: string;
  address: string;
  phone: string;
  email: string;
  gender: Gender;
  nationality: string;
  occupation: string;
  identityDocuments?: IdentityDocument[];
}

export interface UpdateCustomerPayload {
  fullName?: string;
  dateOfBirth?: string;
  address?: string;
  phone?: string;
  email?: string;
  gender?: Gender;
  nationality?: string;
  occupation?: string;
  identityDocuments?: IdentityDocument[];
}

export interface Customer extends CreateCustomerPayload {
  id: string;
  identityDocuments: IdentityDocument[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const IDENTITY_DOCUMENT_LABELS: Record<IdentityDocumentType, string> = {
  CCCD: 'Citizen ID',
  DRIVER_LICENSE: 'Driver License',
  PASSPORT: 'Passport',
};

export const GENDER_LABELS: Record<Gender, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};
