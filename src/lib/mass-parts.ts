export const massParts = [
  { id: "processional", number: "1", label: "Processional Song" },
  {
    id: "penitential-rite",
    number: "2",
    label: "Penitential Rite · Panginoon, Kaawaan Mo Kami",
  },
  { id: "gloria", number: "3", label: "Gloria · Papuri sa Diyos" },
  { id: "gospel-acclamation", number: "4", label: "Gospel Acclamation" },
  { id: "offertory", number: "5", label: "Offertory Song" },
  { id: "sanctus", number: "6", label: "Sanctus · Santo" },
  { id: "memorial-acclamation", number: "7", label: "Memorial Acclamation" },
  { id: "great-amen", number: "8", label: "Great Amen" },
  { id: "pater-noster", number: "9a", label: "Pater Noster · Ama Namin" },
  { id: "doxology", number: "9b", label: "Doxology · Sapagkat" },
  { id: "agnus-dei", number: "10", label: "Agnus Dei · Kordero ng Diyos" },
  { id: "communion", number: "11", label: "Communion Song" },
  { id: "recessional", number: "12", label: "Recessional Song" },
] as const;

export type MassPartId = (typeof massParts)[number]["id"];
export const massPartLabel = (id: string) =>
  massParts.find((part) => part.id === id)?.label ?? id;
