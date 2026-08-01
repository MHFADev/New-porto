import type { Metadata } from "next";
import { JetBrains_Mono, Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jet",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://hilmi.my.id"),
  title: "M. Hilmi F.A. | IT Support & Developer",
  description: "Portfolio — IT Support specialist & full-stack developer based in Kendari, Indonesia.",
  openGraph: {
    title: "M. Hilmi F.A. | IT Support & Developer",
    description: "Portfolio — IT Support specialist & full-stack developer based in Kendari, Indonesia.",
    type: "website",
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "M. Hilmi Firjatullah Adi — IT Support & Full-Stack Developer" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "M. Hilmi F.A. | IT Support & Developer",
    description: "Portfolio — IT Support specialist & full-stack developer based in Kendari, Indonesia.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${manrope.variable} ${jetbrainsMono.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
