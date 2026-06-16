/* eslint-disable no-console */
/**
 * Manual smoke test for the SMTP / Nodemailer integration. Not part of
 * jest, not part of the build — invoke with:
 *
 *   npx tsx src/scripts/test-email.ts <recipient@example.com>
 *
 * Reads SMTP_USER / SMTP_PASS / EMAIL_FROM from .env. If SMTP creds
 * are missing, the email service falls back to logging to stdout
 * (DEV EMAIL) and the script exits 0 with a notice.
 *
 * Used during local development to verify Gmail App Password setup
 * without going through the full register / forgot-password flow.
 */
import { emailService, emailConfig } from '@/services/email.service';
import { env } from '@/config/env';

async function main(): Promise<void> {
  const to = process.argv[2];
  if (!to) {
    console.error('Usage: tsx src/scripts/test-email.ts <recipient@example.com>');
    process.exit(2);
  }

  console.log('Email config:');
  console.log(`  configured: ${emailConfig.configured}`);
  console.log(`  from:       ${emailConfig.from}`);
  console.log(`  host:       ${emailConfig.host}:${emailConfig.port}`);
  console.log(`  base url:   ${env.APP_BASE_URL}`);
  console.log();

  if (!emailConfig.configured) {
    console.log(
      '⚠️  SMTP_USER or SMTP_PASS is empty — email service will fall back to [DEV EMAIL] logging.',
    );
    console.log('   The script still exercises the codepath below; you just will not get a real email.\n');
  }

  const token = 'TEST-TOKEN-' + Date.now();
  console.log(`Sending verification email to ${to}…`);
  await emailService.sendVerificationEmail(to, token);

  console.log('Sending password reset email to the same address…');
  await emailService.sendPasswordResetEmail(to, token);

  console.log('\n✅ Done. Check your inbox (or the [DEV EMAIL] log lines above).');
}

main().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
