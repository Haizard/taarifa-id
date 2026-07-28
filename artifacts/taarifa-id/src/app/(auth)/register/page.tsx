import RegisterForm from "@/components/forms/RegisterForm";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-950 flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between max-w-3xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-700 to-blue-900 rounded-xl flex items-center justify-center shadow-[0_2px_8px_rgba(30,58,138,0.35)]">
            <span className="text-white text-xs font-black">TID</span>
          </div>
          <span className="font-bold text-lg text-gray-900 dark:text-white tracking-tight">
            TAARIFA<span className="text-blue-700 dark:text-blue-400">_ID</span>
          </span>
        </Link>
        <Link
          href="/login"
          className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Already have an account? <span className="text-blue-700 dark:text-blue-400 font-semibold">Sign in</span>
        </Link>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">Create your account</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
              Get your digital identity profile and QR code
            </p>
          </div>
          <RegisterForm />
        </div>
      </main>
    </div>
  );
}
