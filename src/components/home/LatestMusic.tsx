import { Link } from "@tanstack/react-router";
import { Section } from "@/components/Section";
import { SongRow } from "@/components/SongRow";
import type { Song } from "@/lib/data";

/** Aktuelle Tracks – nutzt den globalen Player über SongRow. */
export function LatestMusic({ songs }: { songs: Song[] }) {
  if (!songs.length) {
    return (
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="glass rounded-2xl px-6 py-10 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-primary">Bibliothek</p>
            <p className="mt-3 text-sm text-muted-foreground">Noch keine Tracks veröffentlicht.</p>
          </div>
        </div>
      </section>
    );
  }

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
