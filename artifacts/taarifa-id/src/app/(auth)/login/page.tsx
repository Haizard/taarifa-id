import LoginForm from "@/components/forms/LoginForm";
import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ firstLogin?: string; mobile?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="min-h-dvh bg-gradient-to-br from-blue-50 to-white dark:from-gray-950 dark:to-gray-900 flex flex-col">
      <header className="px-4 py-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">TID</span>
          </div>
          <span className="font-bold text-gray-900 dark:text-gray-100">
            TAARIFA<span className="text-blue-700">_ID</span>
          </span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome back</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              Sign in to your TAARIFA_ID account
            </p>
          </div>
          <LoginForm
            isFirstLogin={params.firstLogin === "1"}
            prefillMobile={params.mobile}
          />
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-blue-700 font-medium hover:underline">
              Register free
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
