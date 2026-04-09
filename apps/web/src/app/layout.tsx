import type { Metadata } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import { AppToaster } from "@/components/AppToaster";
import "./globals.css";

const dm = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "LB Team — Treino feminino com constância",
  description: "Plataforma de treino e nutrição focada em consistência, não punição.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${dm.variable} ${outfit.variable}`}>
      <body className="font-sans min-h-screen">
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
