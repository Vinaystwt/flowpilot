import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowPilot — Your money. On autopilot.",
  description: "Set a financial goal in plain English. FlowPilot builds and manages your DeFi strategy automatically on Flow blockchain.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "FlowPilot — Your money. On autopilot.",
    description: "Natural language DeFi autopilot on Flow blockchain.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
