"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Media =
  | { found: false }
  | { found: true; title: string; images: string[]; instructions: string[] };

const cache = new Map<string, Media | "error">();

export function ExerciseMedia({ name }: { name: string }) {
  const [media, setMedia] = useState<Media | "error" | null>(cache.get(name) ?? null);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (cache.has(name)) return;
    let cancelled = false;
    fetch(`/api/exercise-media?name=${encodeURIComponent(name)}`)
      .then((res) => (res.ok ? (res.json() as Promise<Media>) : Promise.reject()))
      .then((data) => {
        cache.set(name, data);
        if (!cancelled) setMedia(data);
      })
      .catch(() => {
        if (!cancelled) setMedia("error");
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  const images = media && media !== "error" && media.found ? media.images : [];
  useEffect(() => {
    if (images.length < 2) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % images.length), 900);
    return () => clearInterval(id);
  }, [images.length]);

  if (media === null) {
    return (
      <div className="flex h-24 items-center justify-center text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (media === "error") {
    return <p className="py-3 text-center text-xs text-slate-500">Images indisponibles pour le moment.</p>;
  }
  if (!media.found) {
    return <p className="py-3 text-center text-xs text-slate-500">Pas d&apos;illustration pour cet exercice.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="relative mx-auto aspect-[4/3] w-full max-w-xs overflow-hidden rounded-xl bg-slate-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.images[frame % media.images.length]}
          alt={media.title}
          className="h-full w-full object-contain"
        />
      </div>
      <details className="rounded-xl bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
        <summary className="cursor-pointer font-medium text-slate-300">Instructions (EN)</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          {media.instructions.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </details>
    </div>
  );
}
