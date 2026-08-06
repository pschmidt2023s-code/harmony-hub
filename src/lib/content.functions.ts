import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const getContent = createServerFn({ method: "GET" }).handler(async () => {
  const supabasePublic = createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );

  const [songs, releases, videos] = await Promise.all([
    supabasePublic.from("songs").select("*").order("sort_order", { ascending: true }),
    supabasePublic.from("releases").select("*").order("release_date", { ascending: true }),
    supabasePublic.from("videos").select("*").order("sort_order", { ascending: true }),
  ]);

  if (songs.error) throw songs.error;
  if (releases.error) throw releases.error;
  if (videos.error) throw videos.error;

  return { songs: songs.data, releases: releases.data, videos: videos.data };
});
