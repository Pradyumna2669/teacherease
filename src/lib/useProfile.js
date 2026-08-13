import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// Fetch the current user's profile row (holds the role).
export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (alive) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', user.id)
        .single();
      if (alive) {
        setProfile(data);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { profile, loading };
}
