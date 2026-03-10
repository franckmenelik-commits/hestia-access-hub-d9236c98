import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://frquoindntspssayvqhy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xK0roX_XoIfR9FgfiBUKnA_KGGi_Pz4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
