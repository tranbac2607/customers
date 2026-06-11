import { Schema, model, Document, Types } from 'mongoose';

export const IDENTITY_DOCUMENT_TYPES = ['CCCD', 'DRIVER_LICENSE', 'PASSPORT'] as const;
export type IdentityDocumentType = (typeof IDENTITY_DOCUMENT_TYPES)[number];

export const GENDERS = ['male', 'female', 'other'] as const;
export type Gender = (typeof GENDERS)[number];

export interface IIdentityDocument {
  _id?: Types.ObjectId;
  type: IdentityDocumentType;
  number: string;
  issueDate: Date;
  issuePlace: string;
}

export interface ICustomer extends Document {
  _id: Types.ObjectId;
  fullName: string;
  dateOfBirth: Date;
  address: string;
  phone: string;
  email: string;
  gender: Gender;
  nationality: string;
  occupation: string;
  identityDocuments: IIdentityDocument[];
  isDeleted: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const identityDocumentSchema = new Schema<IIdentityDocument>(
  {
    type: {
      type: String,
      enum: IDENTITY_DOCUMENT_TYPES,
      required: true,
    },
    number: { type: String, required: true, trim: true, maxlength: 50 },
    issueDate: { type: Date, required: true },
    issuePlace: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { _id: true },
);

const customerSchema = new Schema<ICustomer>(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 200 },
    dateOfBirth: { type: Date, required: true },
    address: { type: String, required: true, trim: true, maxlength: 500 },
    phone: { type: String, required: true, trim: true, maxlength: 30, index: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    gender: { type: String, enum: GENDERS, required: true },
    nationality: { type: String, required: true, trim: true, maxlength: 100 },
    occupation: { type: String, required: true, trim: true, maxlength: 200 },
    identityDocuments: {
      type: [identityDocumentSchema],
      default: [],
      validate: {
        validator: (docs: IIdentityDocument[]) =>
          new Set(docs.map((d) => d.type)).size === docs.length,
        message: 'Each identity document type can appear at most once per customer',
      },
    },
    isDeleted: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

customerSchema.index({
  fullName: 'text',
  email: 'text',
  phone: 'text',
  nationality: 'text',
  occupation: 'text',
  address: 'text',
});
customerSchema.index({ createdAt: -1 });

customerSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const r = ret as unknown as Record<string, unknown>;
    r.id = r._id;
    delete r._id;
    delete r.__v;
    delete r.isDeleted;
    return r;
  },
});

export const Customer = model<ICustomer>('Customer', customerSchema);
