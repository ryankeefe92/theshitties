import type { Metadata } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ArrowUpRight } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://theshitties.com"),
  title: {
    default: "The Shitties — Annual enshittification awards",
    template: "%s | The Shitties",
  },
  description:
    "An annual public ballot for products, services, and systems that got worse.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header className="header shell">
          <Link className="wordmark" href="/">
            the shitties
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/#nominees">Nominees</Link>
            <Link href="/repeat-offenders">Repeat offenders</Link>
            <Link href="/backlash-worked">Backlash worked</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/results">Results</Link>
          </nav>
          <Link className="button nav-submit" href="/submit">
            Submit a nomination <ArrowUpRight size={16} />
          </Link>
        </header>
        <main id="main">{children}</main>
        <footer className="shell footer">
          <Link className="wordmark" href="/">
            the shitties
          </Link>
          <div className="footer-links">
            <Link href="/how-it-works">How it works</Link>
            <Link href="/repeat-offenders">Repeat offenders</Link>
            <Link href="/backlash-worked">Backlash worked</Link>
            <Link href="/rules">Submission rules</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/admin">Admin</Link>
          </div>
        </footer>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
