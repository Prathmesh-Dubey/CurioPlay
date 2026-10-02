import { authApi, userApi, type User } from '@/api/api';

/*
 * Password reset / change, built on the existing API (no dedicated endpoint exists):
 *   find the account   → GET /auth/user?identifier=<email>
 *   set the password   → PUT /api/users/{id} { password }
 *   prove it took      → POST /auth/login with the new password
 * The last step matters: if the backend ignored or mis-stored the password, we say so instead of claiming success.
 */

export const MIN_PASSWORD = 6;

/** The account whose email is exactly this one (case-insensitive), or null. */
export async function findAccountByEmail(email: string): Promise<User | null> {
  const wanted = email.trim().toLowerCase();
  if (!wanted) return null;
  try {
    const user = await authApi.getUser(wanted);
    // The lookup also matches usernames; only an email match counts here.
    return user?.id && user.email?.toLowerCase() === wanted ? user : null;
  } catch {
    return null;
  }
}

/** True when `password` signs this account in. */
export async function passwordWorks(user: User, password: string): Promise<boolean> {
  try {
    await authApi.login({ identifier: user.email || user.username, password });
    return true;
  } catch {
    return false;
  }
}

/** Sets a new password, then signs in with it to confirm the server really saved it. */
export async function setNewPassword(user: User, password: string): Promise<void> {
  await userApi.update(user.id, { password } as Partial<User> & { password: string });
  if (!(await passwordWorks(user, password))) {
    throw new Error("The server didn't accept the new password. Your old password may still work. If not, contact support.");
  }
}
