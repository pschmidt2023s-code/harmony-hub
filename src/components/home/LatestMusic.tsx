import { Link } from "@tanstack/react-router";
import { Section } from "@/components/Section";
import { SongRow } from "@/components/SongRow";
import type { Song } from "@/lib/data";

/** Aktuelle Tracks – nutzt den globalen Player über SongRow. */
export function LatestMusic({ songs }: { songs: Song[] }) {
  // Low Profile: Gibt es keine veröffentlichten Tracks, bleibt die Sektion weg
  // statt eine leere Fläche zu erzeugen.
  if (!songs.length) return null;

  return (
    <Section
      eyebrow="Bibliothek"
      title="Aktuelle Tracks"
      action={
        <Link to="/musik" className="hidden text-sm text-primary hover:underline sm:block">
          Alle ansehen
        </Link>
      }
    >
      <div className="glass rounded-2xl p-2 sm:p-4">
        {songs.slice(0, 6).map((song, i) => (
          <SongRow key={song.id} song={song} list={songs} index={i} />
        ))}
      </div>
      <Link
        to="/musik"
        className="mt-6 block text-center text-sm text-primary hover:underline sm:hidden"
      >
        Alle ansehen
      </Link>
    </Section>
  );
}
