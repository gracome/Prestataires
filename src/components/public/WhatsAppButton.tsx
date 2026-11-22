"use client";

import { usePathname } from "next/navigation";

/**
 * WhatsApp, floating in the corner of every page of her site.
 *
 * It used to sit in the hero beside the booking button, two buttons of equal
 * weight for what is one main action. Now the hero has the one, and the
 * question a visitor wants to ask is still one tap away wherever she is.
 *
 * Left out of the quote page, whose running estimate is pinned to the bottom
 * of the screen and would end up under it.
 */
export function WhatsAppButton({ href }: { href: string }) {
  const pathname = usePathname() ?? "";
  if (/\/devis\/?$/.test(pathname)) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="site-whatsapp"
      aria-label="Écrire sur WhatsApp"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.62.71.23 1.36.2 1.87.12.57-.08 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Z" />
        <path d="M12.04 2C6.5 2 2 6.48 2 12c0 1.77.47 3.5 1.36 5.02L2 22l5.1-1.33A10.03 10.03 0 0 0 12.04 22C17.57 22 22 17.52 22 12S17.57 2 12.04 2Zm0 18.3a8.3 8.3 0 0 1-4.23-1.16l-.3-.18-3.03.79.8-2.95-.2-.31A8.26 8.26 0 0 1 3.75 12c0-4.57 3.72-8.29 8.3-8.29 4.57 0 8.24 3.72 8.24 8.29 0 4.57-3.67 8.3-8.25 8.3Z" />
      </svg>
    </a>
  );
}
