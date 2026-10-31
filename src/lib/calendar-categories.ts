import {
  LuInfo,
  LuChurch,
  LuFlower2,
  LuWheat,
  LuFlame,
  LuStar,
  LuCross,
  LuTreePalm,
  LuSun,
  LuCrown,
  LuBookOpen,
} from "react-icons/lu";

export const calendarCategories = [
  { id: "general", label: "General", icon: LuInfo },
  { id: "mass", label: "Mass", icon: LuChurch },
  { id: "novena", label: "Novena", icon: LuFlower2 },
  { id: "feast", label: "Feast day", icon: LuWheat },
  { id: "solemnity", label: "Solemnity", icon: LuCrown },
  { id: "memorial", label: "Memorial", icon: LuBookOpen },
  { id: "advent", label: "Advent", icon: LuFlame },
  { id: "christmas", label: "Christmas", icon: LuStar },
  { id: "lent", label: "Lent", icon: LuCross },
  { id: "holy-week", label: "Holy Week", icon: LuTreePalm },
  { id: "easter", label: "Easter", icon: LuSun },
] as const;
