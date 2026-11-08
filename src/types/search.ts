export type SearchType =
  "songs" | "lineups" | "prayers" | "readings" | "news" | "pages";

export interface SearchDocument {
  url: string;
  title: string;
  type: SearchType;
  description: string;
  keywords: string;
  content: string;
  byline?: string;
}

export interface SearchHit {
  document: SearchDocument;
  score: number;
  fuzzy: boolean;
}
