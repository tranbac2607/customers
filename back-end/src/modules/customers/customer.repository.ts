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

  async findByIdIncludingDeleted(id: string): Promise<ICustomer | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return Customer.findById(id);
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

  async restore(id: string): Promise<ICustomer | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return Customer.findOneAndUpdate(
      { _id: id, isDeleted: true },
      { $set: { isDeleted: false } },
      { returnDocument: 'after' },
    );
  },

  async hardDelete(id: string): Promise<ICustomer | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return Customer.findByIdAndDelete(id);
  },

  async softDeleteMany(ids: string[]): Promise<number> {
    const validIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (validIds.length === 0) return 0;
    const result = await Customer.updateMany(
      { _id: { $in: validIds }, isDeleted: false },
      { $set: { isDeleted: true } },
    );
    return result.modifiedCount;
  },

  async restoreMany(ids: string[]): Promise<number> {
    const validIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (validIds.length === 0) return 0;
    const result = await Customer.updateMany(
      { _id: { $in: validIds }, isDeleted: true },
      { $set: { isDeleted: false } },
    );
    return result.modifiedCount;
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
    return this._findManyWithFilter(query, { isDeleted: false });
  },

  /**
   * Same filter logic as `findMany` but for soft-deleted rows.
   * The list-trash endpoint is admin-only, so this isn't paginated
   * for end-users — admins can page through deleted records.
   */
  async findManyTrashed(query: ListCustomersQuery): Promise<FindManyResult> {
    return this._findManyWithFilter(query, { isDeleted: true });
  },

  /**
   * Export all customers matching the filter — no pagination, no
   * limit, since the caller is asking for a complete dataset.
   */
  async findAllForExport(query: ListCustomersQuery): Promise<ICustomer[]> {
    const { search, fullName, gender, phone, nationality, occupation, sortBy, order } = query;
    const filter: FilterQuery<ICustomer> = { isDeleted: false };
    this._applyFieldFilters(filter, {
      fullName,
      gender,
      phone,
      nationality,
      occupation,
      search,
    });
    const sort: Record<string, 1 | -1> = { [sortBy]: order === 'asc' ? 1 : -1 };
    return Customer.find(filter).sort(sort);
  },

  async _findManyWithFilter(
    query: ListCustomersQuery,
    baseFilter: FilterQuery<ICustomer>,
  ): Promise<FindManyResult> {
    const { page, limit, search, fullName, gender, phone, nationality, occupation, sortBy, order } =
      query;
    const filter: FilterQuery<ICustomer> = { ...baseFilter };
    this._applyFieldFilters(filter, { fullName, gender, phone, nationality, occupation, search });
    const sort: Record<string, 1 | -1> = { [sortBy]: order === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Customer.find(filter).sort(sort).skip(skip).limit(limit),
      Customer.countDocuments(filter),
    ]);
    return { items, total };
  },

  _applyFieldFilters(
    filter: FilterQuery<ICustomer>,
    opts: {
      fullName?: string;
      gender?: string;
      phone?: string;
      nationality?: string;
      occupation?: string;
      search?: string;
    },
  ): void {
    const { fullName, gender, phone, nationality, occupation, search } = opts;
    if (fullName && fullName.trim()) {
      const escaped = fullName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.fullName = new RegExp(escaped, 'i');
    }
    if (gender) {
      filter.gender = gender;
    }
    if (phone && phone.trim()) {
      // Allow any non-digit between each query digit so '901234567'
      // matches the spaced form '+84 901 234 567'.
      const digitsOnly = phone.trim().replace(/\D/g, '');
      if (digitsOnly) {
        const pattern = digitsOnly.split('').join('\\D*');
        filter.phone = new RegExp(pattern, 'i');
      }
    }
    if (nationality && nationality.trim()) {
      const escaped = nationality.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.nationality = new RegExp(escaped, 'i');
    }
    if (occupation && occupation.trim()) {
      const escaped = occupation.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.occupation = new RegExp(escaped, 'i');
    }
    if (search && search.trim()) {
      const term = search.trim();
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
  },
};