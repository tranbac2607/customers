/**
 * One-off migration: backfill `username` on any User that
 * pre-dates the field. We derive a slug from the email's local
 * part (everything before @), lowercased and constrained to the
 * regex the schema enforces. If that slug is already taken we
 * suffix a numeric tag.
 *
 * Run: `npx tsx src/db/migrate-backfill-username.ts`
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '@/modules/auth/auth.model';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const USERNAME_RE = /^[a-z0-9_.-]+$/;

const deriveBaseUsername = (email: string): string => {
  const local = email.split('@')[0] ?? email;
  // strip anything outside the allowed set, then trim/length
  return local.toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 32) || 'user';
};

const uniqueUsername = async (base: string): Promise<string> => {
  let candidate = base;
  let i = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await User.findOne({ username: candidate });
    if (!existing) return candidate;
    i += 1;
    candidate = `${base}-${i}`;
  }
};

const main = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Aborting.');
    process.exit(1);
  }
  await mongoose.connect(uri);

  const cursor = User.find({
    $or: [{ username: { $exists: false } }, { username: null }, { username: '' }],
  }).cursor();

  let updated = 0;
  for await (const u of cursor) {
    const base = deriveBaseUsername(u.email);
    const finalUsername = await uniqueUsername(base);
    u.username = finalUsername;
    await u.save();
    updated += 1;
    console.log(`  ${u.email}  →  username="${finalUsername}"`);
  }

  console.log(`\nDone. ${updated} user(s) updated.`);
  await mongoose.disconnect();
};

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});