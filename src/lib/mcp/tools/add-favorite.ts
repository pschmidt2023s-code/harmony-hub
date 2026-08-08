import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "add_favorite",
  title: "Add favorite",
  description: "Add a song to the signed-in fan's favorites by song id.",
  inputSchema: {
    song_id: z.string().trim().min(1).describe("The song id, as returned by list_songs."),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ song_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: song, error: songError } = await supabase
      .from("songs")
      .select("id, title")
      .eq("id", song_id)
      .maybeSingle();
    if (songError) return { content: [{ type: "text", text: songError.message }], isError: true };
    if (!song) return { content: [{ type: "text", text: `No song with id "${song_id}"` }], isError: true };

    const { error } = await supabase
      .from("favorites")
      .insert({ user_id: ctx.getUserId(), song_id });
    if (error && !error.message.includes("duplicate")) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: `Added "${song.title as string}" to favorites.` }],
      structuredContent: { song_id },
    };
  },
});