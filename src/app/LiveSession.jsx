import { useEffect } from 'react';
import { createClient, isLiveBackend } from '../lib/supabase.js';
import { useProfile } from './profile.jsx';

// When a Supabase session already exists (reload, magic-link return), pull
// the profile name into the header. Screens keep reading useProfile().
export default function LiveSession() {
  const { setProfile } = useProfile();

  useEffect(() => {
    if (!isLiveBackend()) return undefined;
    const supabase = createClient();
    if (!supabase) return undefined;

    const apply = async (session) => {
      const user = session?.user;
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      const name =
        data?.full_name ||
        user.user_metadata?.full_name ||
        user.email?.split('@')[0] ||
        '';
      setProfile({ name, avatarUrl: data?.avatar_url || null });
    };

    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session);
    });
    return () => subscription.unsubscribe();
  }, [setProfile]);

  return null;
}
