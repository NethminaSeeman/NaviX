import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NaviX",
  description: "Voice-guided exploration of Sri Lanka",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <header className="border-b border-navix-green/20 bg-white/80 px-4 py-3 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between">
            <span className="text-xl font-semibold text-navix-green">NaviX</span>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-navix-green/10 px-4 py-4 text-center text-sm text-gray-600">
          © {new Date().getFullYear()} NaviX
        </footer>
      </body>
    </html>
  );
}
