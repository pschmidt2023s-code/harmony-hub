import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "../supabase";

export default defineTool({
  name: "list_videos",
  title: "List videos",
  description: "List TAYO's public video library (music videos, visualizers, live clips).",
  inputSchema: {
    category: z.string().trim().optional().describe("Optional exact category filter, e.g. 'Musikvideo'."),
    limit: z.number().int().min(1).max(100).optional().describe("Maximum number of videos (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, limit }) => {
    const supabase = supabaseAnon();
    let query = supabase
      .from("videos")
      .select("id, title, category, video_date, views, song")
      .order("sort_order", { ascending: true })
      .limit(limit ?? 25);
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { videos: data ?? [] },
    };
  },
});