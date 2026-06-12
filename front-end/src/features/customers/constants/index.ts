// Customer-feature constants.
//
// App-wide constants (APP_NAME, PAGE_SIZE_OPTIONS, TOKEN_STORAGE_KEY, …)
// live in /lib/constants.ts. This file is for customer-domain values
// that are referenced from more than one place AND have a non-obvious
// reason to live in a named constant (e.g. they mirror a BE limit).

/**
 * Hard cap on identity documents per customer.
 *
 * Mirrors the BE's createCustomerSchema in
 *   back-end/src/modules/customers/customer.schema.ts
 * (`.max(MAX_IDENTITY_DOCS_PER_CUSTOMER, ...)`).
 *
 * Used by CustomerForm to disable the "Add document" button when the
 * user has reached the cap, and by the zod schema to enforce the same
 * limit on the FE before submit (so the user gets an instant error
 * instead of a round-trip rejection from the BE).
 */
export const MAX_IDENTITY_DOCS_PER_CUSTOMER = 3;

/**
 * Date format string used by the CustomerForm's DatePickers (date of
 * birth + identity document issue date).
 *
 * Matches what the BE coerces to `Date` via `z.coerce.date()` on the
 * server, so a value submitted from the FE parses correctly.
 */
export const CUSTOMER_DATE_FORMAT = 'YYYY-MM-DD';
