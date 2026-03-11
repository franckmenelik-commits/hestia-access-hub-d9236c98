import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jkeuwpuazzogzpbheozs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprZXV3cHVhenpvZ3pwYmhlb3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDQ2MDcsImV4cCI6MjA4ODgyMDYwN30.Hxf_dtj28vhwV-82EiUtneSWD3NsWtJnHOEuHIPqwV0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
