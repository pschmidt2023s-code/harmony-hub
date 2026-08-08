import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_favorites",
  title: "List my favorites",
  description: "List the signed-in fan's favorited songs, including song details.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: favorites, error } = await supabase
      .from("favorites")
      .select("song_id, created_at")
      .order("created_at", { ascending: false });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const ids = (favorites ?? []).map((f) => f.song_id as string);
    let songs: unknown[] = [];
    if (ids.length > 0) {
      const { data, error: songsError } = await supabase
        .from("songs")
        .select("id, title, album, type, duration")
        .in("id", ids);
      if (songsError) return { content: [{ type: "text", text: songsError.message }], isError: true };
      songs = data ?? [];
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ favorites, songs }) }],
      structuredContent: { favorites: favorites ?? [], songs },
    };
  },
});