async function getStats() {
  // In production, fetch from DB
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

  const items = [
    { label: "Individuals", value: stats.individuals, color: "text-blue-700", bg: "bg-blue-50" },
    { label: "Families", value: stats.families, color: "text-purple-700", bg: "bg-purple-50" },
    { label: "Schools", value: stats.schools, color: "text-green-700", bg: "bg-green-50" },
    { label: "Businesses", value: stats.businesses, color: "text-amber-700", bg: "bg-amber-50" },
    { label: "Institutions", value: stats.institutions, color: "text-rose-700", bg: "bg-rose-50" },
  ];

  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <section id="stats" className="py-16 bg-white dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {total.toLocaleString()}+ profiles registered
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2 mb-10 text-sm">
          Growing every day across Tanzania
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {items.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-gray-100 dark:border-gray-800 p-5 flex flex-col items-center gap-1"
            >
              <span className={`text-3xl font-bold ${item.color}`}>
                {item.value.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
