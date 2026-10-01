import { BeatoberHome } from "@/components/BeatoberHome";
import { BeatoberInitialVisitGate } from "@/components/BeatoberInitialVisitGate";
import { loadBeatoberHomePayload } from "@/lib/beatober-home-payload";

export const dynamic = "force-dynamic";

export default async function Home() {
  const payload = await loadBeatoberHomePayload();

  return (
    <BeatoberInitialVisitGate>
      <BeatoberHome {...payload} />
    </BeatoberInitialVisitGate>
  );
}
