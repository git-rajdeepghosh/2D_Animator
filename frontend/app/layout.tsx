import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted rather than next/font/google: the build machine sits behind a
// TLS-intercepting proxy that Node won't trust, and shipping the woff2 keeps
// the site free of any third-party font request at runtime.
const sans = localFont({
  src: "./fonts/Inter-var.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-sans",
});

const display = localFont({
  src: [
    { path: "./fonts/InstrumentSerif-400.woff2", style: "normal" },
    { path: "./fonts/InstrumentSerif-400-italic.woff2", style: "italic" },
  ],
  weight: "400",
  display: "swap",
  variable: "--font-display",
});

const mono = localFont({
  src: "./fonts/JetBrainsMono-var.woff2",
  weight: "100 800",
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "2DAnimator — explainer videos from plain language",
  description:
    "Describe an educational concept in plain language and get a short animated explainer video back, voiceover included.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${mono.variable}`}
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
