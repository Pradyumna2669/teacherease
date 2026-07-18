import { createClient } from '@supabase/supabase-js';

// Read config from .env.local (CRA requires the REACT_APP_ prefix).
// The anon/publishable key is PUBLIC by design — it ships in the browser
// bundle. Your data is protected by Row Level Security on the server, not by
// hiding this key. Never put the *service_role* key here.
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// One shared client for the whole app. Import THIS everywhere — never call
// createClient twice.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
