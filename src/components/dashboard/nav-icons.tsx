import type { ReactNode, SVGProps } from "react";

/**
 * The menu icons.
 *
 * Drawn inline rather than pulled from an icon package: a dozen short paths
 * weigh less than a dependency, and they inherit the provider's palette
 * through currentColor, so a folded menu still matches her theme.
 *
 * They matter most when the menu is folded to a rail, where the icon is the
 * only thing left to recognise an entry by.
 */

export type IconName =
  | "grid"
  | "bookings"
  | "calendar"
  | "chart"
  | "tag"
  | "clock"
  | "image"
  | "palette"
  | "card"
  | "quote"
  | "bell"
  | "sliders"
  | "logout"
  | "chevron-left"
  | "chevron-right";

const PATHS: Record<IconName, ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
    </>
  ),
  bookings: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="m9 15 2 2 4-4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  chart: (
    <>
      <path d="M3.5 20.5h17" />
      <path d="M7 17.5v-5M12 17.5V6.5M17 17.5v-8" />
    </>
  ),
  tag: (
    <>
      <path d="M3 11.6V4.6A1.6 1.6 0 0 1 4.6 3h7a1.6 1.6 0 0 1 1.13.47l7.8 7.8a1.6 1.6 0 0 1 0 2.26l-7 7a1.6 1.6 0 0 1-2.26 0l-7.8-7.8A1.6 1.6 0 0 1 3 11.6Z" />
      <circle cx="7.6" cy="7.6" r="1.4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.2 1.9" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <circle cx="8.6" cy="9.6" r="1.5" />
      <path d="m4 17.5 4.6-4.4 3 2.8 3.4-3.2 5 4.8" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18 1.9 1.9 0 0 0 1.9-1.9 1.9 1.9 0 0 0-.5-1.3 1.9 1.9 0 0 1 1.4-3.2h1.7A4.5 4.5 0 0 0 21 10.1 9 9 0 0 0 12 3Z" />
      <circle cx="7.6" cy="12.4" r="1.15" />
      <circle cx="9.6" cy="8.2" r="1.15" />
      <circle cx="14.4" cy="7.8" r="1.15" />
    </>
  ),
  card: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19" />
      <path d="M6.5 14.8h3.2" />
    </>
  ),
  quote: (
    <>
      <path d="M14 3H7.5A2.5 2.5 0 0 0 5 5.5v13A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V8Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13.5h6M9 17h4" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8.5a6 6 0 1 0-12 0c0 5.5-2 7-2 7h16s-2-1.5-2-7" />
      <path d="M10.3 19.5a2.2 2.2 0 0 0 3.4 0" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7.5h9M18.5 7.5H20M4 16.5h3.5M13 16.5h7" />
      <circle cx="15.5" cy="7.5" r="2.3" />
      <circle cx="10" cy="16.5" r="2.3" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H10" />
      <path d="m16 8 4 4-4 4" />
      <path d="M20 12H9.5" />
    </>
  ),
  "chevron-left": <path d="m14.5 6-6 6 6 6" />,
  "chevron-right": <path d="m9.5 6 6 6-6 6" />,
};

export function NavIcon({
  name,
  size = 20,
  ...props
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
