import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "../supabase";

export default defineTool({
  name: "list_releases",
  title: "List releases",
  description: "List TAYO's public release pipeline (singles, EPs, albums) with dates and status.",
  inputSchema: {
    status: z.string().trim().optional().describe("Optional exact release status filter, e.g. 'Geplant'."),
    limit: z.number().int().min(1).max(100).optional().describe("Maximum number of releases (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }) => {
    const supabase = supabaseAnon();
    let query = supabase
      .from("releases")
      .select("id, title, type, release_date, status, description, tracks")
      .order("release_date", { ascending: true })
      .limit(limit ?? 25);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { releases: data ?? [] },
    };
  },
});