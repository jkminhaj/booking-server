/** Strips fields that should never leave the server on a User object. */
export function sanitizeUser(user) {
  if (!user) return user;
  const { passwordHash, tokenVersion, firebaseId, ...safe } = user;
  return safe;
}
