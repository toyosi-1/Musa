/**
 * Well-known bucket under `vendors/` that stores the platform-wide vendor
 * directory managed by the super admin.
 *
 * Residents and estate admins can read this bucket in addition to their own
 * estate's vendors. Only users with the `admin` role can write to it.
 *
 * Using a string that cannot collide with a real Firebase-generated push id
 * (push ids don't contain underscores) keeps the schema backwards-compatible:
 * every existing `vendors/{estateId}/{vendorId}` path still works.
 */
export const PLATFORM_VENDORS_ESTATE_ID = '__platform__';

/**
 * Returns true if the given estateId identifies the platform-wide vendor
 * bucket rather than a real estate.
 */
export function isPlatformVendorBucket(estateId: string | undefined | null): boolean {
  return (estateId || '') === PLATFORM_VENDORS_ESTATE_ID;
}
