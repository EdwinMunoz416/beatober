import { redirect } from "next/navigation";
import { loadBeatoberHomePayload } from "@/lib/beatober-home-payload";
import { dayPath } from "@/lib/day-routes";

export const dynamic = "force-dynamic";

/** Root always opens today’s playable day (see `defaultSelectedDay` + Beattober TZ). */
export default async function Home() {
  const { initialSelectedDay } = await loadBeatoberHomePayload();
  redirect(dayPath(initialSelectedDay));
}
