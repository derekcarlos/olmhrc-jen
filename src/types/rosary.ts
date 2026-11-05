export interface RosaryArt {
  image?: string;
  alt?: string;
  title?: string;
  artist?: string;
  source_url?: string;
  license?: string;
  license_url?: string;
}
export interface RosaryMystery {
  id: string;
  title: string;
  meditation?: string;
  fruit?: string;
  art?: RosaryArt;
}
export interface RosaryMysterySet {
  id: string;
  title: string;
  days: string;
  items: RosaryMystery[];
}
export interface RosaryPrayer {
  id: string;
  title: string;
  text: string;
  rubric?: string;
  instruction?: string;
}
export interface RosaryCatalog {
  mysteries: RosaryMysterySet[];
  prayers: RosaryPrayer[];
}
