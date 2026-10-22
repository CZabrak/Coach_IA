import { NextResponse } from "next/server";
import { findBestMatch, MEDIA_BASE, type MediaEntry } from "@/lib/exerciseMedia";

const DB_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

let dbPromise: Promise<MediaEntry[]> | null = null;

function loadDb() {
  dbPromise ??= fetch(DB_URL, { next: { revalidate: 86400 } })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<MediaEntry[]>;
    })
    .catch((error) => {
      dbPromise = null;
      throw error;
    });
  return dbPromise;
}

export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name")?.trim().slice(0, 120);
  if (!name) return NextResponse.json({ error: "Paramètre name requis." }, { status: 400 });

  try {
    const match = findBestMatch(name, await loadDb());
    const body = match
      ? {
          found: true,
          title: match.name,
          images: match.images.map((path) => `${MEDIA_BASE}${path}`),
          instructions: match.instructions,
        }
      : { found: false };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch {
    return NextResponse.json({ error: "Bibliothèque d'images indisponible." }, { status: 502 });
  }
}
