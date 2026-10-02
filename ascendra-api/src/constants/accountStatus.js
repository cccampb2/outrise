export const ACCOUNT_STATUSES = ["active", "flagged", "suspended", "banned"];
export const ACCESSIBLE_ACCOUNT_STATUSES = ["active", "flagged"];

export function canAccessAccount(status) {
  return ACCESSIBLE_ACCOUNT_STATUSES.includes(status);
}
