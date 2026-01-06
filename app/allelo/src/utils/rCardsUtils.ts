import {rCardsOverlay} from "@/constants/overlays.ts";
import {NextGraphSession} from "@/types/nextgraph.ts";

export function getRCardsGraph(nuri: string, session: NextGraphSession): string {
  return nuri.substring(0, 53) + rCardsOverlay(session);
}