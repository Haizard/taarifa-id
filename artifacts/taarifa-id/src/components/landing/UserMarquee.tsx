// Marquee of registered users/orgs — in production, fetched from API
const mockUsers = [
  { name: "J. Mbwana", type: "Individual", initial: "JM" },
  { name: "Karibu Primary School", type: "School", initial: "KP" },
  { name: "Mwamba Family", type: "Family", initial: "MF" },
  { name: "TZ Logistics Ltd", type: "Business", initial: "TL" },
  { name: "Amara Hospital", type: "Institution", initial: "AH" },
  { name: "F. Nyerere", type: "Individual", initial: "FN" },
  { name: "Sunrise Academy", type: "School", initial: "SA" },
  { name: "Kimoto Family", type: "Family", initial: "KF" },
  { name: "Coastal Traders", type: "Business", initial: "CT" },
  { name: "Dodoma University", type: "Institution", initial: "DU" },
  { name: "B. Hassan", type: "Individual", initial: "BH" },
  { name: "Bahari Tech", type: "Business", initial: "BT" },
];

const typeColors: Record<string, string> = {
  Individual: "bg-blue-100 text-blue-700",
  School: "bg-green-100 text-green-700",
  Family: "bg-purple-100 text-purple-700",
  Business: "bg-amber-100 text-amber-700",
  Institution: "bg-rose-100 text-rose-700",
};

export default function UserMarquee() {
  const doubled = [...mockUsers, ...mockUsers]; // duplicate for seamless loop

  return (
    <section className="py-12 bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Join thousands already registered
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Individuals, families, schools, businesses and institutions across Tanzania
        </p>
      </div>

      <div className="flex overflow-hidden">
        <div className="flex gap-4 marquee-inner whitespace-nowrap">
          {doubled.map((user, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 flex-shrink-0"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${typeColors[user.type]}`}
              >
                {user.initial}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-none">
                  {user.name}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{user.type}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
