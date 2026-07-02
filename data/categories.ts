import type { PhraseCategory } from "@/types/phrase";
import {
  Siren,
  Stethoscope,
  Landmark,
  Bus,
  GraduationCap,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

export type Category = {
  id: PhraseCategory;
  label: string;
  labelFil: string;
  /** Lucide icon used as a consistent, network-free vector icon. */
  icon: LucideIcon;
  description: string;
  descriptionFil: string;
};

export const categories: Category[] = [
  {
    id: "emergency",
    label: "Emergency",
    labelFil: "Help",
    icon: Siren,
    description: "Urgent help and safety",
    descriptionFil: "Agarang tulong at kaligtasan",
  },
  {
    id: "health",
    label: "Health",
    labelFil: "Kalusugan",
    icon: Stethoscope,
    description: "Clinic, pain, medical needs",
    descriptionFil: "Klinika, sakit, pangangailangang medikal",
  },
  {
    id: "barangay",
    label: "Barangay",
    labelFil: "Barangay",
    icon: Landmark,
    description: "Documents and local office",
    descriptionFil: "Mga dokumento at lokal na opisina",
  },
  {
    id: "transportation",
    label: "Transportation",
    labelFil: "Transportasyon",
    icon: Bus,
    description: "Fare, stops, directions",
    descriptionFil: "Pamasahe, hintuan, direksiyon",
  },
  {
    id: "school",
    label: "School",
    labelFil: "Paaralan",
    icon: GraduationCap,
    description: "Class and campus help",
    descriptionFil: "Tulong sa klase at kampus",
  },
  {
    id: "basic",
    label: "Basic Needs",
    labelFil: "Pangunahing Pangangailangan",
    icon: MessageCircle,
    description: "Everyday communication",
    descriptionFil: "Pang-araw-araw na komunikasyon",
  },
];

export function getCategory(id: PhraseCategory): Category | undefined {
  return categories.find((category) => category.id === id);
}
