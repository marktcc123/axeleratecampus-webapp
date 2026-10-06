import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

// Who is signed in — a name and a photo — session-only, like everything else
// this app holds. Mounted around the whole router in App.jsx rather than in
// CartRoot, because the gate that WRITES it (/verify) sits outside CartRoot and
// the header that READS it sits inside.
//
// There is still no account behind this: it is what sign-up collected, kept so
// the app can show it back. When Supabase arrives the avatar goes to storage
// and the name to the profile row, and this becomes a cache of both.

// The public handle is the name, lowercased, letters and digits only — the
// shape the fixture's people already use ("Mark Tao" → marktao). Derived, not
// stored: a handle you can edit apart from your name is a second identity to
// keep in step. Empty until there is a name.
import hub from '../data/hub.example.json';
const DEFAULT_NAME = hub.settings.account.find((a) => a.label === 'Name')?.value ?? '';

export const handleFor = (name = '') => String(name).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const [profile, setProfileState] = useState({ name: '', avatarUrl: null, campus: '', email: '' });
  // The one object URL alive at a time, so replacing a photo does not leak the
  // last one and unmounting the app frees it.
  const urlRef = useRef(null);

  const setProfile = useCallback(({ name, avatarFile, avatarUrl: remoteUrl, campus, email }) => {
    let avatarUrl = null;
    if (avatarFile) {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      // jsdom has no createObjectURL; a missing preview is not an error there.
      avatarUrl = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(avatarFile) : null;
      urlRef.current = avatarUrl;
    }
    setProfileState((p) => ({
      name: name?.trim() || p.name,
      avatarUrl: avatarFile ? avatarUrl : (remoteUrl !== undefined ? remoteUrl : p.avatarUrl),
      campus: campus !== undefined ? (campus || '') : (p.campus || ''),
      email: email !== undefined ? (email || '') : (p.email || ''),
    }));
  }, []);

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  // displayName is what a disc draws its initial from: the name once there is
  // one, else the account fixture's placeholder — the same "Your name" the Me
  // hub prints — so the default avatar is an initial, not an icon (owner,
  // 2026-09-09). `name` itself stays empty until sign-up, so Share stays
  // disabled and the handle empty: a placeholder is not an identity.
  // publicHandle is what Share hands out and /u/ resolves for "me": the real
  // name's handle once there is one, else the placeholder's — so the share
  // works from the first screen (owner, 2026-09-09) and the page it opens is
  // this session's own card. `handle` stays empty until sign-up for anything
  // that must not treat the placeholder as an identity.
  const value = useMemo(() => {
    const displayName = profile.name || DEFAULT_NAME;
    return { ...profile, displayName, handle: handleFor(profile.name), publicHandle: handleFor(displayName), setProfile };
  }, [profile, setProfile]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile() needs a <ProfileProvider> above it — see App.jsx');
  return ctx;
}
