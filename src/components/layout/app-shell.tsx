"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const navigation = [
  ["/dashboard", "Dashboard"], ["/conferences", "Conferences"],
  ["/planning", "Planning"], ["/leads", "Leads / Quick Capture"],
  ["/relationships", "Relationships"], ["/settings", "Settings / Integrations"],
] as const;
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:bg-white focus:p-3">Skip to content</a>
    <aside className="border-b border-[#dfe5dc] bg-white p-6 lg:min-h-screen lg:border-r lg:border-b-0">
      <Link href="/dashboard" className="text-3xl font-bold tracking-tight">grain<span className="text-[#76a34c]">.</span></Link>
      <p className="mt-2 text-xs font-semibold tracking-widest text-[#65756b] uppercase">Conference intelligence</p>
      <nav aria-label="Main navigation" className="mt-8 flex flex-wrap gap-2 lg:flex-col">
        {navigation.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}
          className={pathname === href ? "rounded-lg bg-[#eaf2df] px-4 py-3 text-sm font-medium text-[#294b25]" : "rounded-lg px-4 py-3 text-sm font-medium text-[#637068] hover:bg-[#f3f5f0]"}>{label}</Link>)}
      </nav>
      <p className="mt-10 text-xs leading-5 text-[#637068]">Demo workspace<br />Synthetic data · Browser-local captures</p>
    </aside>
    <div>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe5dc] bg-white/70 px-6 py-5 md:px-10">
        <span className="text-sm text-[#637068]">Sales workspace</span>
        <span className="rounded-full border border-[#dfe5dc] px-3 py-1 text-xs font-medium">Demo data</span>
      </header>
      <main id="main-content" className="mx-auto max-w-7xl min-w-0 p-4 sm:p-6 md:p-10">{children}</main>
    </div>
  </div>;
}


