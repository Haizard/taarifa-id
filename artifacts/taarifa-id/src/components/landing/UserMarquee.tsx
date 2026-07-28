const names = [
  "Amina Hassan", "John Mwenda", "Fatuma Ali", "David Omondi",
  "Grace Nyamweya", "Ibrahim Salim", "Mary Kimani", "Peter Mwangi",
  "Zulfa Rashid", "Emmanuel Njau", "Halima Omar", "Francis Banda",
  "Aisha Yusufu", "Bernard Oloo", "Nasra Ahmed", "Godfrey Mussa",
];

export default function UserMarquee() {
  const doubled = [...names, ...names];

  return (
    <section className="py-10 bg-gray-50 dark:bg-gray-900 overflow-hidden border-y border-gray-100 dark:border-gray-800">
      <p className="text-center text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6">
        Trusted by people across Tanzania
      </p>
      <div className="relative">
        <div className="marquee-inner flex gap-6 w-max">
          {doubled.map((name, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-gray-800 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm whitespace-nowrap"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-xs font-bold">
                {name[0]}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{name}</span>
            </div>
          ))}
        </div>
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-gray-50 dark:from-gray-900 to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-gray-50 dark:from-gray-900 to-transparent pointer-events-none" />
      </div>
    </section>
  );
}
