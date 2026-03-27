/** User belongs to a company that exists but has not been approved yet (backend gates login and APIs). */
export function isCompanyPendingVerification(user) {
  return !!(user?.companyId && user?.companyVerified === false);
}
