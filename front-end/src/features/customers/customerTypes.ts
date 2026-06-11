import type { Gender, IdentityDocument, IdentityDocumentType } from '@/features/auth/authTypes';

export { GENDERS, IDENTITY_DOCUMENT_TYPES } from '@/features/auth/authTypes';

export type SortBy = 'createdAt' | 'fullName' | 'dateOfBirth' | 'email';
export type SortOrder = 'asc' | 'desc';

export interface CustomerListQuery {
  page: number;
  limit: number;
  search?: string;
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
  CCCD: 'Căn cước công dân',
  DRIVER_LICENSE: 'Giấy phép lái xe',
  PASSPORT: 'Hộ chiếu',
};

export const GENDER_LABELS: Record<Gender, string> = {
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác',
};
