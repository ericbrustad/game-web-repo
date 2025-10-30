import { createClient } from "@supabase/supabase-js";
export const getSupabaseUrl = () => process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const getSupabaseAnonKey = () => process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const getSupabaseServiceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || "";
export const getBrowserClient = () => {
  const url=getSupabaseUrl();
  const anon=getSupabaseAnonKey();
  if(!url||!anon) return null;
  return createClient(url, anon);
};
export const getServerClient = () => {
  const url=getSupabaseUrl();
  const srv=getSupabaseServiceKey();
  if(!url||!srv) return null;
  return createClient(url, srv);
};
