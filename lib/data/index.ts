import "server-only";
import { isSupabaseConfigured } from "@/lib/env";
import { demoRepository } from "./demo-repo";
import type { Repository } from "./repository";
import { supabaseRepository } from "./supabase-repo";

/** The single entry point to data. Supabase when configured, in-memory demo otherwise. */
export function getRepository(): Repository {
  return isSupabaseConfigured ? supabaseRepository : demoRepository;
}

export type * from "./repository";
