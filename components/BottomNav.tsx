"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  Siren,
  MessageSquare,
  Camera,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";

const items: Array<{
  labelKey: string;
  href: string;
  icon: LucideIcon;
  emphasized?: boolean;
}> = [
  { labelKey: "nav.home", href: "/", icon: Home },
  { labelKey: "nav.library", href: "/library", icon: BookOpen },
  { labelKey: "nav.emergency", href: "/emergency", icon: Siren, emphasized: true },
  { labelKey: "nav.hearing", href: "/hearing", icon: MessageSquare },
  { labelKey: "nav.camera", href: "/camera", icon: Camera },
];

/**
 * Thumb-reachable persistent navigation.
 * Active item: yellow fill. Emergency: always danger-red text + pulsing dot
 * badge when inactive, so it is findable instantly in a crisis.
 */
export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bee-black"
    >
      <ul className="mx-auto grid max-w-3xl grid-cols-5 gap-0.5 px-1 sm:gap-1 sm:px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          const label = t(item.labelKey);

          // Dynamically scale down font size for very long labels
          // but allow them to gracefully wrap to 2 lines
          const textSizeClass =
            label.length > 14
              ? "text-[4.5px] min-[360px]:text-[5px] sm:text-[0.65rem]"
              : label.length > 10
                ? "text-[6.5px] min-[360px]:text-[7px] sm:text-[0.7rem]"
                : "text-[8px] min-[360px]:text-[9px] sm:text-[0.7rem]";

          return (
            <li key={item.href} className="relative">
              {/* Pulsing dot on Emergency when NOT active — always findable */}
              {item.emphasized && !isActive && (
                <span
                  aria-hidden="true"
                  className="absolute right-2 top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-danger"
                />
              )}

              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex w-full min-h-14 flex-col items-center justify-start pt-2 gap-1 rounded-button px-0.5 text-center leading-[1.1] tracking-tighter font-bold transition-colors ${textSizeClass} ${
                  isActive
                    ? "bg-bee-yellow text-bee-black"
                    : item.emphasized
                      ? "text-danger hover:bg-white/10"
                      : "text-white/70 hover:bg-white/10"
                }`}
              >
                <Icon
                  aria-hidden="true"
                  className={item.emphasized && !isActive ? "h-6 w-6 shrink-0" : "h-5 w-5 shrink-0"}
                />
                <span className="w-full text-balance">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
