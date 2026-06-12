// Customer-feature pure helpers.
//
// Rules for this file:
//   - No React, no Redux, no Antd imports → tree-shakeable, safe to
//     use from server components, trivial to unit-test.
//   - One responsibility per function. If a helper grows, split it.
//   - Keep the public surface small; prefer reusing the same util in
//     several call sites over adding a near-duplicate.

import dayjs, { type Dayjs } from 'dayjs';

/**
 * Calculate a customer's current age in years from their date of
 * birth. Returns `0` for missing or invalid input so the caller can
 * render the result without a separate null check.
 *
 * The form's zod schema already prevents a future DOB from being
 * saved, so the negative-result branch can't be hit in normal use.
 * The defensive `0` return is for the (theoretical) case of a record
 * that pre-dates the validation, e.g. imported from a legacy dump.
 */
export function calculateAge(dateOfBirth: string | Dayjs | Date | null | undefined): number {
  if (!dateOfBirth) return 0;
  const dob = dayjs(dateOfBirth);
  if (!dob.isValid()) return 0;
  return dayjs().diff(dob, 'year');
}

/**
 * Truncate a customer full name for compact list rendering. Returns
 * the input unchanged if it already fits within `maxLength`, otherwise
 * returns the first `maxLength - 1` characters plus a U+2026
 * horizontal ellipsis.
 *
 * The caller is expected to set the full name as a `title` attribute
 * on the rendered element so users can see the untruncated value on
 * hover (and screen-reader users can hear it).
 */
export function truncateFullName(name: string, maxLength = 32): string {
  if (!name) return '';
  if (name.length <= maxLength) return name;
  return `${name.slice(0, maxLength - 1).trimEnd()}…`;
}
