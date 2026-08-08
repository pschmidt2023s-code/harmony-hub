import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "../supabase";

export default defineTool({
  name: "list_songs",
  title: "List songs",
  description: "List TAYO's public song catalog, optionally filtered by a title or album search term.",
  inputSchema: {
    search: z.string().trim().optional().describe("Optional text to match against song title or album."),
    limit: z.number().int().min(1).max(100).optional().describe("Maximum number of songs to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }) => {
    const supabase = supabaseAnon();
    let query = supabase
      .from("songs")
      .select("id, title, album, type, duration, genre, bpm, song_key, mood, producer, explicit")
      .order("sort_order", { ascending: true })
      .limit(limit ?? 25);
    if (search) query = query.or(`title.ilike.%${search}%,album.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { songs: data ?? [] },
    };
  },
});