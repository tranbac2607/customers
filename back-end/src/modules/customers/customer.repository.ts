import { Customer, ICustomer, IIdentityDocument } from './customer.model';
import { Types } from 'mongoose';
import { ListCustomersQuery } from './customer.schema';

type FilterQuery<_T> = Record<string, unknown>;

export interface FindManyResult {
  items: ICustomer[];
  total: number;
}

export const customerRepository = {
  async create(
    data: {
      fullName: string;
      dateOfBirth: Date;
      address: string;
      phone: string;
      email: string;
      gender: 'male' | 'female' | 'other';
      nationality: string;
      occupation: string;
      identityDocuments?: IIdentityDocument[];
    },
    createdBy: string,
  ): Promise<ICustomer> {
    return Customer.create({
      ...data,
      identityDocuments: data.identityDocuments ?? [],
      createdBy: new Types.ObjectId(createdBy),
    });
  },

  async findByIdActive(id: string): Promise<ICustomer | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return Customer.findOne({ _id: id, isDeleted: false });
  },

  async update(id: string, data: Partial<ICustomer>): Promise<ICustomer | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return Customer.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: data },
      { returnDocument: 'after', runValidators: true },
    );
  },

  async softDelete(id: string): Promise<ICustomer | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return Customer.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true } },
      { returnDocument: 'after' },
    );
  },

  async findByEmailActive(email: string, excludeId?: string): Promise<ICustomer | null> {
    const filter: FilterQuery<ICustomer> = {
      email: email.toLowerCase().trim(),
      isDeleted: false,
    };
    if (excludeId) filter._id = { $ne: new Types.ObjectId(excludeId) };
    return Customer.findOne(filter);
  },

  async findMany(query: ListCustomersQuery): Promise<FindManyResult> {
    const { page, limit, search, sortBy, order } = query;
    const filter: FilterQuery<ICustomer> = { isDeleted: false };

    if (search && search.trim()) {
      const term = search.trim();
      // Regex OR across key fields (works well + indexable via text search fallback)
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { fullName: regex },
        { email: regex },
        { phone: regex },
        { nationality: regex },
        { occupation: regex },
        { address: regex },
      ];
    }

    const sort: Record<string, 1 | -1> = { [sortBy]: order === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Customer.find(filter).sort(sort).skip(skip).limit(limit),
      Customer.countDocuments(filter),
    ]);

    return { items, total };
  },
};
