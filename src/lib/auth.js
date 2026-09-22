import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return { session, loading };
}

export function useProfile(session) {
  const [profile, setProfile] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!session) { setProfile(null); setRoles([]); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      const { data: r } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id);
      if (cancelled) return;
      setProfile(p);
      setRoles((r || []).map(x => x.role));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id]);
  return { profile, roles, loading };
}
