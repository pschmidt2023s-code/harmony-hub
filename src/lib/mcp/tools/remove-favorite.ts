import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "remove_favorite",
  title: "Remove favorite",
  description: "Remove a song from the signed-in fan's favorites by song id.",
  inputSchema: {
    song_id: z.string().trim().min(1).describe("The song id to remove from favorites."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ song_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", ctx.getUserId())
      .eq("song_id", song_id);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Removed "${song_id}" from favorites.` }],
      structuredContent: { song_id },
    };
  },
});