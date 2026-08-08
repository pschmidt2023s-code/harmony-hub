import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSongsTool from "./tools/list-songs";
import listReleasesTool from "./tools/list-releases";
import listVideosTool from "./tools/list-videos";
import listFavoritesTool from "./tools/list-favorites";
import addFavoriteTool from "./tools/add-favorite";
import removeFavoriteTool from "./tools/remove-favorite";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged and Vite inlines it at build time.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "harmony-hub",
  title: "Harmony Hub",
  version: "0.1.0",
  instructions:
    "Tools for the TAYO artist platform. Browse the public catalog with `list_songs`, `list_releases`, and `list_videos`. For the signed-in fan, read and manage saved tracks with `list_favorites`, `add_favorite`, and `remove_favorite`.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listSongsTool,
    listReleasesTool,
    listVideosTool,
    listFavoritesTool,
    addFavoriteTool,
    removeFavoriteTool,
  ],
});