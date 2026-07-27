import { Link } from "wouter";
import ResetPasswordForm from "@/components/forms/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-dvh bg-gradient-to-br from-blue-50 to-white dark:from-gray-950 dark:to-gray-900 flex flex-col">
      <header className="px-4 py-4">
        <Link href="/login" className="flex items-center gap-2 w-fit text-sm text-blue-700 hover:underline">
          ← Back to Login
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reset Password</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              Enter the reset code sent to your mobile
            </p>
          </div>
          <ResetPasswordForm />
        </div>
      </main>
    </div>
  );
}
