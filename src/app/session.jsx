import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ROLES, can as grants, verification } from '../lib/marketplace.js';
import { isUnlocked } from './admin/gate.jsx';

// Who is acting, and what that lets them do.
//
// This sits deliberately BESIDE the existing auth rather than on top of it.
// /verify still owns sign-in and ProfileProvider still owns the name and the
// avatar; nothing here replaces either. What was missing was the layer between
// "there is a person" and "this person may submit an offer": roles held as
// memberships, a verification level that the demand maths can weight, and an
// organization link for the merchant side.
//
// One account can hold several roles at once. A founder who buys sunscreen on
// Sunday and reviews their brand's offers on Monday is one login and two sets
// of permissions, and the store must never collapse them into a single "user
// type" column — that decision is expensive to undo later.

const KEY = 'ax.session.v0';
const SessionContext = createContext(null);

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (!data || typeof data !== 'object') return empty();
    return { ...empty(), ...data };
  } catch {
    return empty();
  }
}

function empty() {
  return {
    user: null,
    // Membership rows, not a column. `{ role, orgId, grantedAt }`.
    memberships: [],
    verificationLevel: 'V0',
    // Set when the person completed a purchase flow; promotes V1/V2 → V3.
    purchaseVerified: false,
  };
}

function persist(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* blocked */ }
}

const uid = () => `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function SessionProvider({ children }) {
  const [state, setState] = useState(load);

  const commit = useCallback((fn) => {
    setState((prev) => {
      const next = fn(prev);
      persist(next);
      return next;
    });
  }, []);

  const api = useMemo(() => {
    const signedIn = Boolean(state.user);

    // Admin is not stored on the account: the console's existing session lock
    // is still the gate, and this reflects it rather than duplicating it.
    const roles = [
      signedIn ? ROLES.consumer : ROLES.visitor,
      ...state.memberships.map((m) => m.role),
      ...(isUnlocked() ? [ROLES.admin] : []),
    ];
    const effective = [...new Set(roles)];

    // A purchase proves more than an email does, so the level is derived from
    // behaviour rather than being a field someone can set.
    const level = !signedIn
      ? 'V0'
      : state.purchaseVerified
        ? 'V3'
        : state.verificationLevel === 'V2' ? 'V2' : 'V1';

    const merchantMembership = state.memberships.find((m) => m.role === ROLES.merchant) ?? null;

    const signUp = ({ firstName, email, provider = 'email', ageRange = null, region = null, sourceType = 'direct', communityId = null }) => {
      const user = {
        id: uid(),
        firstName: String(firstName || '').trim() || 'You',
        email: String(email || '').trim(),
        provider,
        // Asked once, optional, and only because they sharpen a match. No
        // school, no phone, no address, no gender, no income.
        ageRange,
        region,
        sourceType,
        communityId,
        createdAt: new Date().toISOString(),
      };
      commit((prev) => ({ ...prev, user, verificationLevel: 'V1' }));
      return user;
    };

    const signOut = () => commit(() => empty());

    const update = (patch) => commit((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...patch } : prev.user,
    }));

    const addRole = (role, orgId = null) => commit((prev) => {
      if (prev.memberships.some((m) => m.role === role && m.orgId === orgId)) return prev;
      return {
        ...prev,
        memberships: [...prev.memberships, { role, orgId, grantedAt: new Date().toISOString() }],
      };
    });

    const removeRole = (role) => commit((prev) => ({
      ...prev,
      memberships: prev.memberships.filter((m) => m.role !== role),
    }));

    const markPurchaseVerified = () => commit((prev) => ({ ...prev, purchaseVerified: true }));

    return {
      user: state.user,
      userId: state.user?.id ?? null,
      signedIn,
      roles: effective,
      memberships: state.memberships,
      verificationLevel: level,
      verification: verification(level),
      orgId: merchantMembership?.orgId ?? null,
      isMerchant: effective.includes(ROLES.merchant),
      isScout: effective.includes(ROLES.scout),
      isAdmin: effective.includes(ROLES.admin),
      can: (permission) => grants(effective, permission),
      signUp,
      signOut,
      update,
      addRole,
      removeRole,
      markPurchaseVerified,
    };
  }, [state, commit]);

  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>;
}

// A context-less fallback so a component can be rendered on its own in a test
// without a provider tree: a signed-out visitor, which is the safest default —
// it grants nothing.
const VISITOR = {
  user: null,
  userId: null,
  signedIn: false,
  roles: [ROLES.visitor],
  memberships: [],
  verificationLevel: 'V0',
  verification: verification('V0'),
  orgId: null,
  isMerchant: false,
  isScout: false,
  isAdmin: false,
  can: (p) => grants([ROLES.visitor], p),
  signUp: () => null,
  signOut: () => {},
  update: () => {},
  addRole: () => {},
  removeRole: () => {},
  markPurchaseVerified: () => {},
};

export function useSession() {
  return useContext(SessionContext) ?? VISITOR;
}
