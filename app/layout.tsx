import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Walrus Memory Reading Tracker",
  description: "Log what you read. Recall what you read.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
