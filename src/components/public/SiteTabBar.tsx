"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type TabItem = {
  href: string;
  label: string;
  icon: "home" | "services" | "booking" | "gallery" | "contact";
};

/**
 * Bottom tab bar, phones only.
 *
 * The way a visitor's thumb already moves through an app: the four or five
 * places worth reaching sit under it, and booking — what most of them came
 * for — is the raised one in the middle. The burger stays at the top for the
 * rest (à propos, horaires, FAQ).
 */
export function SiteTabBar({ items, homeHref }: { items: TabItem[]; homeHref: string }) {
  const pathname = usePathname() ?? "";

  // On her own domain the browser path has no slug in it, while the links do.
  // Comparing without the slug works for both.
  const strip = (path: string) => {
    const rest = path.startsWith(homeHref) ? path.slice(homeHref.length) : path;
    return rest.replace(/\/$/, "") || "/";
  };
  const current = strip(pathname);

  const isActive = (item: TabItem) => {
    if (item.href.includes("#")) return false;
    const target = strip(item.href);
    return target === "/" ? current === "/" : current === target || current.startsWith(`${target}/`);
  };

  return (
    <nav aria-label="Navigation rapide" className="site-tabbar">
      {items.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="site-tab"
            data-primary={item.icon === "booking" ? "" : undefined}
            aria-current={active ? "page" : undefined}
          >
            <span className="site-tab-icon" aria-hidden="true">
              <TabIcon name={item.icon} />
            </span>
            <span className="site-tab-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function TabIcon({ name }: { name: TabItem["icon"] }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9v11h14V9" />
          <path d="M10 20v-6h4v6" />
        </svg>
      );
    case "services":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "booking":
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
          <path d="m9.5 15 2 2 3.5-3.5" />
        </svg>
      );
    case "gallery":
      return (
        <svg {...common}>
          <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
          <circle cx="9" cy="10" r="1.8" />
          <path d="m20.5 16-5-5-8.5 8.5" />
        </svg>
      );
    case "contact":
      return (
        <svg {...common}>
          <path d="M20.5 12a8.5 8.5 0 0 1-12.4 7.55L3.5 20.5l1-4.4A8.5 8.5 0 1 1 20.5 12Z" />
        </svg>
      );
  }
}
