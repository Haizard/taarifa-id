const partners = [
  { name: "Sunriver Systems", url: "#", initials: "SS" },
  { name: "Tanzania Health Ministry", url: "#", initials: "MoH" },
  { name: "NIDA Tanzania", url: "#", initials: "NIDA" },
  { name: "Beem Africa", url: "#", initials: "BA" },
];

export default function PartnersSection() {
  return (
    <section id="partners" className="py-14 bg-white dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Our Partners</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-10">
          Working together to build a safer Tanzania
        </p>

        <div className="flex flex-wrap justify-center gap-6 md:gap-10">
          {partners.map((p) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:border-blue-300 transition-colors">
                <span className="text-gray-600 dark:text-gray-300 font-bold text-sm">{p.initials}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-[80px] leading-tight">
                {p.name}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
