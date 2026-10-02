import { useState } from 'react';
import { userApi, type User } from '@/api/api';
import { useConfirm, useToast } from '@/components/ui/Feedback';

/** Shared guarded account-deletion flow (profile + settings). */
export function useDeleteAccount(user: User, onLogout: () => void) {
  const confirm = useConfirm();
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);

  const requestDelete = async () => {
    const ok = await confirm({
      title: 'Delete your account?',
      description: `This permanently deletes "${user.username}" and all associated data, including scores and achievements. This cannot be undone.`,
      tone: 'danger',
      confirmLabel: 'Delete account',
    });
    if (!ok) return;
    try {
      setDeleting(true);
      await userApi.deleteAccount(user.id);
      try {
        localStorage.removeItem('curioplay_user');
      } catch {
        /* ignore */
      }
      toast.success('Account deleted', 'Your account and data have been permanently removed.');
      onLogout();
    } catch (err) {
      toast.error('Could not delete account', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return { deleting, requestDelete };
}
