export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  lastLoginAt?: string;
  createdAt: string;
}

export const IDENTITY_DOCUMENT_TYPES = ['CCCD', 'DRIVER_LICENSE', 'PASSPORT'] as const;
export type IdentityDocumentType = (typeof IDENTITY_DOCUMENT_TYPES)[number];

export const GENDERS = ['male', 'female', 'other'] as const;
export type Gender = (typeof GENDERS)[number];

export interface IdentityDocument {
  id?: string;
  type: IdentityDocumentType;
  number: string;
  issueDate: string;
  issuePlace: string;
}

export interface Customer {
  id: string;
  fullName: string;
  dateOfBirth: string;
  address: string;
  phone: string;
  email: string;
  gender: Gender;
  nationality: string;
  occupation: string;
  identityDocuments: IdentityDocument[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
