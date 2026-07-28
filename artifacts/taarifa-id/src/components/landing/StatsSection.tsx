async function getStats() {
  return {
    individuals: 1240,
    families: 320,
    schools: 85,
    businesses: 210,
    institutions: 42,
  };
}

export default async function StatsSection() {
  const stats = await getStats();
  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  const items = [
    { label: "Individuals", value: stats.individuals, color: "from-blue-500 to-blue-600" },
    { label: "Families", value: stats.families, color: "from-violet-500 to-violet-600" },
    { label: "Schools", value: stats.schools, color: "from-emerald-500 to-emerald-600" },
    { label: "Businesses", value: stats.businesses, color: "from-amber-500 to-amber-600" },
    { label: "Institutions", value: stats.institutions, color: "from-rose-500 to-rose-600" },
  ];

  return (
    <section id="stats" className="py-24 bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: "radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 80% 20%, #f59e0b 0%, transparent 40%)"
      }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/70 text-xs font-semibold mb-4">
            Growing every day
          </span>
          <h2 className="text-5xl sm:text-6xl font-black text-white tracking-tight">
            {total.toLocaleString()}
            <span className="text-amber-400">+</span>
          </h2>
          <p className="text-blue-200/70 text-xl mt-2 font-medium">profiles registered across Tanzania</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {items.map((item, i) => (
            <div
              key={i}
              className="glass-card rounded-2xl p-6 text-center hover:bg-white/12 transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`text-4xl font-black text-white mb-2`}>
                {item.value.toLocaleString()}
              </div>
              <div className={`h-0.5 w-10 mx-auto rounded-full bg-gradient-to-r ${item.color} mb-3`} />
              <p className="text-blue-100/60 text-xs font-medium uppercase tracking-wider">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
