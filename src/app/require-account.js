import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSession } from './session.jsx';

// "Sign in to continue" without losing what you were doing.
//
// Every consumer action that writes demand goes through this: it either runs
// the action, or sends you to /join carrying the address you were on and the
// reason you were interrupted, so the account screen can explain itself and
// put you back. The action is replayed by the screen on return rather than
// queued here — a stored callback cannot survive the navigation.
export function useRequireAccount() {
  const nav = useNavigate();
  const { pathname, search } = useLocation();
  const { signedIn } = useSession();

  return useCallback((action, { intent, next } = {}) => {
    if (signedIn) return action?.();
    nav('/join', { state: { next: next ?? `${pathname}${search}`, intent } });
    return undefined;
  }, [signedIn, nav, pathname, search]);
}
