import { BeatoberHome } from "@/components/BeatoberHome";
import { loadAllPatterns, loadManifest } from "@/lib/content";

export const dynamic = "force-dynamic";

export default function Home() {
  const manifest = loadManifest();
  const patterns = loadAllPatterns(manifest);
  const authorMode = process.env.NEXT_PUBLIC_BEATOBER_AUTHOR === "1";

  return (
    <BeatoberHome
      manifest={manifest}
      patterns={patterns}
      nowIso={new Date().toISOString()}
      authorMode={authorMode}
    />
  );
}
