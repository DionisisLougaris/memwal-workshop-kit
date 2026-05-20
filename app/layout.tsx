import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "MemWal Reading Tracker — permissions",
  description:
    "Reading tracker + a permissions dashboard that reads the MemWalAccount straight from Sui.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <Link href="/" className="nav-link">
            reading tracker
          </Link>
          <Link href="/permissions" className="nav-link">
            permissions
          </Link>
          <span className="nav-spacer" />
          <span className="nav-meta">your account · your keys</span>
        </nav>
        {children}
      </body>
    </html>
  );
}
