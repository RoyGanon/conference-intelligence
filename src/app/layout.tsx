import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";
export const metadata: Metadata = { title: "Grain Conference Intelligence", description: "A conference workspace for Grain's sales team. Foundation preview." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><AppShell>{children}</AppShell></body></html>;
}

