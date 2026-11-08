import type { RosaryPrayer } from "./rosary";

export interface CrossStation {
  id: string;
  title: string;
  reference: string;
  scripture_text: string;
  meditation: string;
  rubric?: string;
  reading_response?: string;
}

export interface StationsDevotion {
  edition: string;
  source_url: string;
  content_note: string;
  prayers: RosaryPrayer[];
  stations: CrossStation[];
}
