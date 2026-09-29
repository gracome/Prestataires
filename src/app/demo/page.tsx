import type { Metadata } from "next";
import Link from "next/link";
import { DemoApp } from "@/components/marketing/DemoApp";
import { TRADES, tradeById } from "@/lib/marketing/trades";
import { addDays, dayLabelFr, toLocalDate } from "@/lib/time";

/**
 * The demo, as a place rather than a picture.
 *
 * The landing page lets a visitor compose her business and read the figures.
 * That answers "what would I get"; it does not answer "what is it like to use".
 * So this page hands her the thing itself: she books an appointment on her own
 * site, then turns the page over and finds it sitting in her diary, waiting to
 * be confirmed and cashed. Nothing explains the product as well as doing one
 * lap of it.
 *
 * Everything lives in React state. No account, no database, nothing written
 * and nothing kept — which is also why she can press every button without
 * being careful.
 *
 * The days are built on the server and passed down, rather than computed in
 * the browser: the server sits in UTC and the visitor does not, and a date
 * that disagrees across that boundary is a hydration mismatch.
 */

export const dynamic = "force-dynamic";

/** The business runs on Benin time, which is where the providers are. */
const TIMEZONE = "Africa/Porto-Novo";

/** How far ahead the booking strip lets her look. A week is plenty to try. */
const HORIZON = 6;

export const metadata: Metadata = {
  title: "Essayer la démo — Prestataires",
  description:
    "Prenez un rendez-vous sur votre site de démonstration, puis retrouvez-le dans votre tableau de bord. Rien n'est enregistré.",
};

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ metier?: string; nom?: string }>;
}) {
  const query = await searchParams;

  // The landing page carries her choices over, so she does not start again
  // from scratch on a page whose whole point is that it is already hers.
  const trade = tradeById(query.metier ?? TRADES[0].id);
  const name = (query.nom ?? "").trim().slice(0, 40) || trade.sampleName;

  const today = toLocalDate(new Date(), TIMEZONE);
  const days = Array.from({ length: HORIZON }, (_, offset) => {
    const date = addDays(today, offset);
    const [year, month, day] = date.split("-").map(Number);
    // Noon UTC is the same calendar day everywhere we operate, so the weekday
    // it yields is the one she would read on her own wall.
    const dow = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
    return {
      date,
      weekday: dayLabelFr(dow),
      dayNumber: day,
      today: offset === 0,
    };
  });

  return (
    <div className="mk">
      <header className="mk-topbar">
        <div className="container">
          <Link href="/" className="mk-back">
            ← Prestataires
          </Link>
          <Link href="/#tarifs" className="mk-topbar-cta">
            Voir les tarifs
          </Link>
        </div>
      </header>

      <DemoApp trade={trade} initialName={name} days={days} />
    </div>
  );
}
