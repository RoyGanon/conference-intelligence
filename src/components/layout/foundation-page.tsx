export function FoundationPage({ title, description }: { title: string; description: string }) {
  return <section>
    <p className="text-xs font-semibold tracking-widest text-[#6a824f] uppercase">Grain Conference Intelligence</p>
    <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
    <p className="mt-3 max-w-2xl text-base leading-7 text-[#65756b]">{description}</p>
    <div className="mt-10 rounded-2xl border border-[#dfe5dc] bg-white p-8">
      <span className="rounded-full bg-[#edf3e7] px-3 py-1 text-xs font-semibold text-[#526c38]">Foundation ready</span>
      <h2 className="mt-5 text-xl font-semibold">A place for the next step</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#65756b]">Navigation and data contracts are established. This screen is intentionally a placeholder until feature implementation is approved.</p>
    </div>
  </section>;
}

