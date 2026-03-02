import type { Metadata } from "next";
import { Newsreader, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title:
    "What Happens When You Actually Analyze 9,064 BetterHelp Reviews | Alex Turvy, PhD",
  description:
    "Seven methods, one dataset. A progressive investigation of BetterHelp's Trustpilot reviews — from descriptive baselines through causal inference, topic modeling, and product decomposition.",
  openGraph: {
    title:
      "What Happens When You Actually Analyze 9,064 BetterHelp Reviews",
    description:
      "Seven methods, one dataset. A progressive investigation using causal inference and NLP to trace BetterHelp's reputation trajectory.",
    type: "article",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "What Happens When You Actually Analyze 9,064 BetterHelp Reviews",
    description:
      "Seven methods, one dataset. A progressive investigation of BetterHelp's Trustpilot reviews.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${newsreader.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
