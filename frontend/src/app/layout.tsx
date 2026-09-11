import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat, Bebas_Neue } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["italic"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Project Echo | PRIME Philippines",
  description: "PRIME Philippines meeting intelligence and advisory workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="en" 
      className={`${cormorant.variable} ${montserrat.variable} ${bebas.variable} h-full w-full`}
    >
      <body className="h-full w-full bg-bg-primary font-sans antialiased text-[#181D1E] overflow-hidden">
        {children}
      </body>
    </html>
  );
}
