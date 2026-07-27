import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ACCOUNT_TYPES, TZ_REGIONS } from "@/lib/utils";
import { Eye, EyeOff, Phone, Mail, User } from "lucide-react";

// TZ_REGIONS unused here but kept for future use
void TZ_REGIONS;

const schema = z
  .object({
    firstName: z.string().min(2, "First name required"),
    middleName: z.string().optional(),
    lastName: z.string().min(2, "Last name required"),
    birthdate: z.string().min(1, "Birthdate required"),
    gender: z.enum(["Male", "Female"], { required_error: "Select gender" }),
    mobile: z
      .string()
      .regex(/^(255|0)\d{9}$/, "Enter a valid Tanzanian number (e.g. 0712345678)"),
    email: z.string().email("Enter a valid email"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers and underscores"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    accountType: z.enum(["Individual", "Family", "School", "Business", "Institution"], {
      required_error: "Select account type",
    }),
    nationality: z.enum(["Tanzanian", "Foreigner"], { required_error: "Select nationality" }),
    nidaNumber: z.string().optional(),
    passportNumber: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine(
    (d) => { if (d.nationality === "Tanzanian") return !!d.nidaNumber?.trim(); return true; },
    { message: "NIDA number required for Tanzanians", path: ["nidaNumber"] }
  )
  .refine(
    (d) => { if (d.nationality === "Foreigner") return !!d.passportNumber?.trim(); return true; },
    { message: "Passport number required for foreigners", path: ["passportNumber"] }
  );

type FormData = z.infer<typeof schema>;

export default function RegisterForm() {
  const [, navigate] = useLocation();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });
  const nationality = watch("nationality");

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json() as { message?: string };
      if (!res.ok) { toast.error(json.message || "Registration failed"); return; }
      toast.success("Account created! Check your phone for a verification code.");
      navigate(`/login?firstLogin=1&mobile=${encodeURIComponent(data.mobile)}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
      {step === 1 && (
        <>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Step 1 — Personal Information</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" error={errors.firstName?.message} {...register("firstName")} />
            <Input label="Last Name" error={errors.lastName?.message} {...register("lastName")} />
          </div>
          <Input label="Middle Name (optional)" {...register("middleName")} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Birthdate" type="date" error={errors.birthdate?.message} {...register("birthdate")} />
            <Select label="Gender" error={errors.gender?.message} options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }]} placeholder="Select" {...register("gender")} />
          </div>
          <Select label="Account Type" error={errors.accountType?.message} options={ACCOUNT_TYPES.map((t) => ({ value: t, label: t }))} placeholder="Select account type" {...register("accountType")} />
          <Select label="Nationality" error={errors.nationality?.message} options={[{ value: "Tanzanian", label: "Tanzanian" }, { value: "Foreigner", label: "Foreigner" }]} placeholder="Select nationality" {...register("nationality")} />
          {nationality === "Tanzanian" && <Input label="NIDA Number" placeholder="XXXXXXXXXXXXXXXXXXXX" error={errors.nidaNumber?.message} {...register("nidaNumber")} />}
          {nationality === "Foreigner" && <Input label="Passport Number" error={errors.passportNumber?.message} {...register("passportNumber")} />}
          <Button type="button" fullWidth onClick={() => setStep(2)}>Next: Account Details</Button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="flex items-center gap-2 mb-1">
            <button type="button" onClick={() => setStep(1)} className="text-sm text-blue-700 hover:underline">← Back</button>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Step 2 — Account Credentials</h2>
          </div>
          <Input label="Mobile Number" type="tel" placeholder="0712345678 or 255712345678" error={errors.mobile?.message} leftIcon={<Phone size={16} />} {...register("mobile")} />
          <Input label="Email Address" type="email" error={errors.email?.message} leftIcon={<Mail size={16} />} {...register("email")} />
          <Input label="Username" placeholder="e.g. john_doe" error={errors.username?.message} leftIcon={<User size={16} />} hint="Lowercase letters, numbers, underscores only" {...register("username")} />
          <Input label="Password" type={showPwd ? "text" : "password"} error={errors.password?.message} rightIcon={<button type="button" onClick={() => setShowPwd(!showPwd)}>{showPwd ? <EyeOff size={16} /> : <Eye size={16} />}</button>} {...register("password")} />
          <Input label="Confirm Password" type={showPwd ? "text" : "password"} error={errors.confirmPassword?.message} {...register("confirmPassword")} />
          <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300">
            A 6-digit verification code will be sent to your mobile number.
          </div>
          <Button type="submit" fullWidth loading={loading}>Create Account</Button>
        </>
      )}
    </form>
  );
}
