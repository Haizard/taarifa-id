const partners = [
  { name: "Sunriver Systems", initials: "SS", color: "from-blue-600 to-blue-800" },
  { name: "Tanzania Health Ministry", initials: "MoH", color: "from-emerald-600 to-emerald-800" },
  { name: "NIDA Tanzania", initials: "NIDA", color: "from-red-600 to-red-800" },
  { name: "Beem Africa", initials: "BA", color: "from-violet-600 to-violet-800" },
];

export default function PartnersSection() {
  return (
    <section id="partners" className="py-20 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
        <span className="inline-block px-3.5 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-semibold mb-4">
          Trusted partners
        </span>
        <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
          Our Partners
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-base mb-14 max-w-md mx-auto">
          Working together to build a safer Tanzania
        </p>

        <div className="flex flex-wrap justify-center gap-8 md:gap-12">
          {partners.map((p) => (
            <div key={p.name} className="flex flex-col items-center gap-3 group">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.15)] group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.20)] group-hover:-translate-y-1 transition-all duration-300`}>
                <span className="text-white font-bold text-sm tracking-wide">{p.initials}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium text-center max-w-[80px] leading-snug">
                {p.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
