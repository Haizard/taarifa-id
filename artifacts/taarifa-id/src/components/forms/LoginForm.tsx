import { useState } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { useSession } from "@/contexts/AuthContext";

interface LoginFormProps {
  isFirstLogin?: boolean;
  prefillMobile?: string;
}

export default function LoginForm({ isFirstLogin, prefillMobile }: LoginFormProps) {
  const { login } = useSession();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [username, setUsername] = useState(prefillMobile || "");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [firstLogin] = useState(isFirstLogin || false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(username, firstLogin ? "firstlogin" : password, firstLogin ? otpCode : undefined);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Signed in successfully!");

      // Read role from stored user
      const stored = localStorage.getItem("tid_user");
      const user = stored ? JSON.parse(stored) : null;

      if (user?.role === "system_admin") {
        navigate("/system-admin");
      } else {
        navigate("/dashboard");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-4"
    >
      <Input
        label="Username, Mobile or Email"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        leftIcon={<User size={16} />}
        placeholder="e.g. john_doe or 0712345678"
        required
      />

      {firstLogin ? (
        <>
          <div className="bg-amber-50 dark:bg-amber-950 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-200">
            This is your first login. Enter the verification code sent to your phone.
          </div>
          <Input
            label="Verification Code (OTP)"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            placeholder="6-digit code"
            maxLength={6}
            leftIcon={<Lock size={16} />}
            required
          />
        </>
      ) : (
        <Input
          label="Password"
          type={showPwd ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock size={16} />}
          rightIcon={
            <button type="button" onClick={() => setShowPwd(!showPwd)}>
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          required
        />
      )}

      {!firstLogin && (
        <div className="text-right">
          <Link href="/forgot-password" className="text-xs text-blue-700 hover:underline">
            Forgot password?
          </Link>
        </div>
      )}

      <Button type="submit" fullWidth loading={loading}>
        {firstLogin ? "Verify & Sign In" : "Sign In"}
      </Button>
    </form>
  );
}
