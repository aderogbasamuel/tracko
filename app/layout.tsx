import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  weight: ['400', '500', '600', '700'], // Choose the weights you need
  subsets: ['latin'],                    // Specify subsets
  display: 'swap',   
});

export const metadata: Metadata = {
  title: "Tracko — sales, customers and credit for Nigerian traders",
  description:
    "Track every sale, know who owes you, and get paid into a real Nigerian bank account.",
};

/**
 * Applies the stored theme before first paint. Without this the page renders
 * light, then snaps to dark once React hydrates — a visible flash on every load.
 * Kept deliberately tiny and dependency-free since it blocks rendering.
 */
const NO_FLASH_THEME = `
(function(){try{
  var s = localStorage.getItem('theme');
  var dark = s === 'dark' || (!s && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) document.documentElement.classList.add('dark');
}catch(e){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${poppins.className} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
