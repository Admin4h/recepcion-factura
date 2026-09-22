import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vuhjqjdpqievjdbacoge.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_uON1ciEGIhZrNRdSoHrWjA_oK0YDTxM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: window.localStorage,
    storageKey: 'sb-recepcion-factura-auth',
  },
});
