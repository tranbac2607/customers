/* eslint-disable no-console */
import { connectDB, disconnectDB } from '@/config/database';
import { logger } from '@/config/logger';
import { authRepository } from '@/modules/auth/auth.repository';
import { hashPassword } from '@/utils/password';
import { Customer } from '@/modules/customers/customer.model';
import { Types } from 'mongoose';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? 'System Admin';

const SAMPLE_CUSTOMERS: Array<{
  fullName: string;
  dateOfBirth: string;
  address: string;
  phone: string;
  email: string;
  gender: 'male' | 'female' | 'other';
  nationality: string;
  occupation: string;
  identityDocuments: Array<{
    type: 'CCCD' | 'DRIVER_LICENSE' | 'PASSPORT';
    number: string;
    issueDate: string;
    issuePlace: string;
  }>;
}> = [
  {
    fullName: 'Nguyen Van An',
    dateOfBirth: '1990-05-12',
    address: '12 Le Loi, District 1, HCMC',
    phone: '+84 901 234 567',
    email: 'an.nguyen@example.com',
    gender: 'male',
    nationality: 'Vietnamese',
    occupation: 'Software Engineer',
    identityDocuments: [
      { type: 'CCCD', number: '079090012345', issueDate: '2020-06-15', issuePlace: 'HCMC Public Security' },
      { type: 'DRIVER_LICENSE', number: 'B2-123456', issueDate: '2018-03-22', issuePlace: 'HCMC Dept. of Transport' },
    ],
  },
  {
    fullName: 'Tran Thi Binh',
    dateOfBirth: '1995-09-23',
    address: '45 Tran Hung Dao, Hanoi',
    phone: '+84 988 765 432',
    email: 'binh.tran@example.com',
    gender: 'female',
    nationality: 'Vietnamese',
    occupation: 'Marketing Manager',
    identityDocuments: [
      { type: 'CCCD', number: '001095123456', issueDate: '2019-08-10', issuePlace: 'Hanoi Public Security' },
    ],
  },
  {
    fullName: 'Le Hoang Cuong',
    dateOfBirth: '1988-02-14',
    address: '78 Phan Dinh Phung, Da Nang',
    phone: '+84 905 111 222',
    email: 'cuong.le@example.com',
    gender: 'male',
    nationality: 'Vietnamese',
    occupation: 'Architect',
    identityDocuments: [
      { type: 'PASSPORT', number: 'B1234567', issueDate: '2021-11-05', issuePlace: 'Vietnam Immigration' },
      { type: 'CCCD', number: '048088998877', issueDate: '2017-04-20', issuePlace: 'Da Nang Public Security' },
    ],
  },
  {
    fullName: 'Pham Thi Dung',
    dateOfBirth: '1992-11-30',
    address: '23 Nguyen Hue, District 1, HCMC',
    phone: '+84 909 333 444',
    email: 'dung.pham@example.com',
    gender: 'female',
    nationality: 'Vietnamese',
    occupation: 'Doctor',
    identityDocuments: [
      { type: 'CCCD', number: '079192556677', issueDate: '2018-09-12', issuePlace: 'HCMC Public Security' },
    ],
  },
  {
    fullName: 'John Smith',
    dateOfBirth: '1985-07-04',
    address: '500 5th Avenue, New York, USA',
    phone: '+1 212 555 0100',
    email: 'john.smith@example.com',
    gender: 'male',
    nationality: 'American',
    occupation: 'Financial Analyst',
    identityDocuments: [
      { type: 'PASSPORT', number: 'US1234567', issueDate: '2019-01-20', issuePlace: 'U.S. Dept. of State' },
      { type: 'DRIVER_LICENSE', number: 'NY-998877', issueDate: '2016-05-15', issuePlace: 'New York DMV' },
    ],
  },
  {
    fullName: 'Yuki Tanaka',
    dateOfBirth: '1993-03-19',
    address: 'Shibuya 2-1, Tokyo, Japan',
    phone: '+81 80 1234 5678',
    email: 'yuki.tanaka@example.com',
    gender: 'female',
    nationality: 'Japanese',
    occupation: 'UI Designer',
    identityDocuments: [
      { type: 'PASSPORT', number: 'JP9876543', issueDate: '2022-04-01', issuePlace: 'Japan MoFA' },
    ],
  },
  {
    fullName: 'Hoang Van Em',
    dateOfBirth: '2000-12-05',
    address: '99 Bach Khoa, Hanoi',
    phone: '+84 983 222 111',
    email: 'em.hoang@example.com',
    gender: 'other',
    nationality: 'Vietnamese',
    occupation: 'Student',
    identityDocuments: [
      { type: 'CCCD', number: '001200334455', issueDate: '2021-10-08', issuePlace: 'Hanoi Public Security' },
      { type: 'PASSPORT', number: 'C7654321', issueDate: '2023-02-14', issuePlace: 'Vietnam Immigration' },
    ],
  },
  {
    fullName: 'Vu Thi Phuong',
    dateOfBirth: '1987-08-17',
    address: '5 Ly Tu Trong, District 1, HCMC',
    phone: '+84 908 555 666',
    email: 'phuong.vu@example.com',
    gender: 'female',
    nationality: 'Vietnamese',
    occupation: 'Accountant',
    identityDocuments: [
      { type: 'CCCD', number: '079187667788', issueDate: '2016-12-01', issuePlace: 'HCMC Public Security' },
      { type: 'DRIVER_LICENSE', number: 'C-789012', issueDate: '2020-05-30', issuePlace: 'HCMC Dept. of Transport' },
    ],
  },
  {
    fullName: 'Doan Van Giang',
    dateOfBirth: '1991-04-22',
    address: '101 Le Hong Phong, Hai Phong',
    phone: '+84 977 888 999',
    email: 'giang.doan@example.com',
    gender: 'male',
    nationality: 'Vietnamese',
    occupation: 'Civil Engineer',
    identityDocuments: [
      { type: 'CCCD', number: '031091778899', issueDate: '2019-06-25', issuePlace: 'Hai Phong Public Security' },
    ],
  },
  {
    fullName: 'Bui Thi Hanh',
    dateOfBirth: '1996-06-09',
    address: '18 Hung Vuong, Can Tho',
    phone: '+84 929 444 333',
    email: 'hanh.bui@example.com',
    gender: 'female',
    nationality: 'Vietnamese',
    occupation: 'Teacher',
    identityDocuments: [
      { type: 'CCCD', number: '096196889900', issueDate: '2020-03-17', issuePlace: 'Can Tho Public Security' },
      { type: 'PASSPORT', number: 'B5566778', issueDate: '2022-08-22', issuePlace: 'Vietnam Immigration' },
    ],
  },
  {
    fullName: 'Michael Chen',
    dateOfBirth: '1989-10-11',
    address: '88 Queen Street, Toronto, Canada',
    phone: '+1 416 555 0199',
    email: 'michael.chen@example.com',
    gender: 'male',
    nationality: 'Canadian',
    occupation: 'Product Manager',
    identityDocuments: [
      { type: 'DRIVER_LICENSE', number: 'ON-223344', issueDate: '2017-09-09', issuePlace: 'Ontario MTO' },
      { type: 'PASSPORT', number: 'CA4455667', issueDate: '2020-12-12', issuePlace: 'Canada Immigration' },
    ],
  },
  {
    fullName: 'Ngo Van Khanh',
    dateOfBirth: '1984-01-25',
    address: '60 Quang Trung, Da Lat',
    phone: '+84 906 121 212',
    email: 'khanh.ngo@example.com',
    gender: 'male',
    nationality: 'Vietnamese',
    occupation: 'Hotel Manager',
    identityDocuments: [
      { type: 'CCCD', number: '068084112233', issueDate: '2015-04-04', issuePlace: 'Lam Dong Public Security' },
    ],
  },
  {
    fullName: 'Sophie Laurent',
    dateOfBirth: '1998-07-30',
    address: '12 Rue de Rivoli, Paris, France',
    phone: '+33 6 12 34 56 78',
    email: 'sophie.laurent@example.com',
    gender: 'female',
    nationality: 'French',
    occupation: 'Chef',
    identityDocuments: [
      { type: 'PASSPORT', number: 'FR2233445', issueDate: '2021-05-20', issuePlace: 'French Govt.' },
    ],
  },
  {
    fullName: 'Trinh Van Long',
    dateOfBirth: '1993-09-09',
    address: '4 Tran Phu, Nha Trang',
    phone: '+84 935 303 404',
    email: 'long.trinh@example.com',
    gender: 'male',
    nationality: 'Vietnamese',
    occupation: 'Tour Guide',
    identityDocuments: [
      { type: 'CCCD', number: '056093334455', issueDate: '2018-11-11', issuePlace: 'Khanh Hoa Public Security' },
      { type: 'DRIVER_LICENSE', number: 'D-556677', issueDate: '2019-02-19', issuePlace: 'Khanh Hoa Dept. of Transport' },
    ],
  },
  {
    fullName: 'Ly Thi My',
    dateOfBirth: '1997-05-05',
    address: '33 Phan Chu Trinh, Hue',
    phone: '+84 939 606 707',
    email: 'my.ly@example.com',
    gender: 'female',
    nationality: 'Vietnamese',
    occupation: 'Graphic Designer',
    identityDocuments: [
      { type: 'CCCD', number: '046197445566', issueDate: '2020-07-30', issuePlace: 'Thua Thien Hue Public Security' },
    ],
  },
  {
    fullName: 'Carl Mueller',
    dateOfBirth: '1982-12-12',
    address: '15 Unter den Linden, Berlin, Germany',
    phone: '+49 30 12345678',
    email: 'carl.mueller@example.com',
    gender: 'male',
    nationality: 'German',
    occupation: 'Researcher',
    identityDocuments: [
      { type: 'PASSPORT', number: 'DE9988776', issueDate: '2019-08-25', issuePlace: 'Germany Govt.' },
      { type: 'DRIVER_LICENSE', number: 'DE-DL-112233', issueDate: '2016-03-14', issuePlace: 'Berlin LEA' },
    ],
  },
  {
    fullName: 'Dinh Cong Nhat',
    dateOfBirth: '1986-11-18',
    address: '20 Pham Ngu Lao, District 1, HCMC',
    phone: '+84 909 818 181',
    email: 'nhat.dinh@example.com',
    gender: 'male',
    nationality: 'Vietnamese',
    occupation: 'Banker',
    identityDocuments: [
      { type: 'CCCD', number: '079086556677', issueDate: '2015-09-09', issuePlace: 'HCMC Public Security' },
      { type: 'PASSPORT', number: 'B3344556', issueDate: '2021-12-04', issuePlace: 'Vietnam Immigration' },
    ],
  },
  {
    fullName: 'Maria Garcia',
    dateOfBirth: '1994-04-04',
    address: 'Calle Serrano 50, Madrid, Spain',
    phone: '+34 600 123 456',
    email: 'maria.garcia@example.com',
    gender: 'female',
    nationality: 'Spanish',
    occupation: 'Journalist',
    identityDocuments: [
      { type: 'PASSPORT', number: 'ES6677889', issueDate: '2018-06-06', issuePlace: 'Spanish Govt.' },
    ],
  },
  {
    fullName: 'Phan Van Oanh',
    dateOfBirth: '1999-10-10',
    address: '11 Tran Hung Dao, Bien Hoa',
    phone: '+84 938 010 101',
    email: 'oanh.phan@example.com',
    gender: 'male',
    nationality: 'Vietnamese',
    occupation: 'Freelancer',
    identityDocuments: [
      { type: 'CCCD', number: '075199667788', issueDate: '2021-05-05', issuePlace: 'Dong Nai Public Security' },
    ],
  },
  {
    fullName: 'Au Thi Quynh',
    dateOfBirth: '1991-02-28',
    address: '8 Nguyen Thi Minh Khai, District 3, HCMC',
    phone: '+84 903 282 828',
    email: 'quynh.au@example.com',
    gender: 'female',
    nationality: 'Vietnamese',
    occupation: 'Pharmacist',
    identityDocuments: [
      { type: 'CCCD', number: '079191778899', issueDate: '2016-08-08', issuePlace: 'HCMC Public Security' },
      { type: 'DRIVER_LICENSE', number: 'A2-998877', issueDate: '2017-11-29', issuePlace: 'HCMC Dept. of Transport' },
    ],
  },
];

export const seed = async (): Promise<void> => {
  try {
    await connectDB();
    logger.info('🌱 Seeding database…');

    // Admin
    const existing = await authRepository.findByEmailWithPassword(ADMIN_EMAIL);
    let adminId: string;
    if (existing) {
      adminId = existing._id.toString();
      logger.info(`  ✓ Admin already exists: ${ADMIN_EMAIL}`);
    } else {
      const passwordHash = await hashPassword(ADMIN_PASSWORD);
      const admin = await authRepository.create({
        email: ADMIN_EMAIL,
        passwordHash,
        name: ADMIN_NAME,
        role: 'admin',
      });
      adminId = admin._id.toString();
      logger.info(`  ✅ Created admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    }

    // Customers
    let createdCount = 0;
    let updatedCount = 0;

    for (const c of SAMPLE_CUSTOMERS) {
      const existing = await Customer.findOne({ email: c.email });
      const docs = c.identityDocuments.map((d) => ({
        type: d.type,
        number: d.number,
        issueDate: new Date(d.issueDate),
        issuePlace: d.issuePlace,
      }));
      if (existing) {
        existing.set({
          fullName: c.fullName,
          dateOfBirth: new Date(c.dateOfBirth),
          address: c.address,
          phone: c.phone,
          gender: c.gender,
          nationality: c.nationality,
          occupation: c.occupation,
          identityDocuments: docs,
        });
        await existing.save();
        updatedCount++;
      } else {
        await Customer.create({
          fullName: c.fullName,
          dateOfBirth: new Date(c.dateOfBirth),
          address: c.address,
          phone: c.phone,
          email: c.email,
          gender: c.gender,
          nationality: c.nationality,
          occupation: c.occupation,
          identityDocuments: docs,
          createdBy: new Types.ObjectId(adminId),
        });
        createdCount++;
      }
    }

    logger.info(`  ✅ Customers created: ${createdCount}, updated: ${updatedCount}`);
    logger.info('🎉 Seed done.');
  } catch (err) {
    logger.error('Seed failed', err);
    process.exitCode = 1;
  } finally {
    await disconnectDB().catch(() => undefined);
  }
};
