"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ACCOUNT_TYPES } from "@/lib/utils";
import { Eye, EyeOff, Phone, Mail, User, CheckCircle, ChevronRight } from "lucide-react";

const schema = z
  .object({
    firstName: z.string().min(2, "First name required"),
    middleName: z.string().optional(),
    lastName: z.string().min(2, "Last name required"),
    birthdate: z.string().min(1, "Birthdate required"),
    gender: z.enum(["Male", "Female"], { required_error: "Select gender" }),
    mobile: z.string().regex(/^(255|0)\d{9}$/, "Enter a valid Tanzanian number (e.g. 0712345678)"),
    email: z.string().email("Enter a valid email"),
    username: z.string().min(3, "Min 3 characters").regex(/^[a-z0-9_]+$/, "Lowercase, numbers, underscores only"),
    password: z.string().min(8, "Min 8 characters"),
    confirmPassword: z.string(),
    accountType: z.enum(["Individual", "Family", "School", "Business", "Institution"], { required_error: "Select account type" }),
    nationality: z.enum(["Tanzanian", "Foreigner"], { required_error: "Select nationality" }),
    nidaNumber: z.string().optional(),
    passportNumber: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((d) => d.nationality === "Tanzanian" ? !!d.nidaNumber?.trim() : true, {
    message: "NIDA number required for Tanzanians",
    path: ["nidaNumber"],
  })
  .refine((d) => d.nationality === "Foreigner" ? !!d.passportNumber?.trim() : true, {
    message: "Passport number required for foreigners",
    path: ["passportNumber"],
  });

type FormData = z.infer<typeof schema>;

const steps = ["Personal Info", "Contact & Account", "Create Password"];

export default function RegisterForm() {
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const { register, handleSubmit, watch, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nationality: "Tanzanian", gender: "Male", accountType: "Individual" },
  });

  const nationality = watch("nationality");

  async function goNext() {
    const fields: (keyof FormData)[][] = [
      ["firstName", "lastName", "birthdate", "gender", "accountType", "nationality", "nidaNumber", "passportNumber"],
      ["mobile", "email", "username"],
      ["password", "confirmPassword"],
    ];
    const valid = await trigger(fields[step - 1]);
    if (valid) setStep((s) => (s + 1) as 1 | 2 | 3);
  }

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message || "Registration failed");
        return;
      }
      const isDev = process.env.NODE_ENV === "development";
      if (isDev) {
        toast.success("Account created! Sign in with your password.");
        router.push("/login");
      } else {
        toast.success("Account created! Check your phone for a verification code.");
        router.push(`/login?firstLogin=1&mobile=${encodeURIComponent(data.mobile)}`);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Step indicator */}
      <div className="px-7 pt-6 pb-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          {steps.map((label, i) => {
            const n = i + 1;
            const done = step > n;
            const active = step === n;
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-2 ${active || done ? "" : "opacity-40"}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                    done ? "bg-emerald-500 text-white" : active ? "bg-blue-700 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                  }`}>
                    {done ? <CheckCircle size={14} /> : n}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block whitespace-nowrap ${active ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>
                    {label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-px mx-2 ${step > n ? "bg-emerald-300" : "bg-gray-200 dark:bg-gray-700"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-7 space-y-4">
        {/* Step 1 */}
        {step === 1 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" error={errors.firstName?.message} {...register("firstName")} />
              <Input label="Last Name" error={errors.lastName?.message} {...register("lastName")} />
            </div>
            <Input label="Middle Name (optional)" {...register("middleName")} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Birthdate" type="date" error={errors.birthdate?.message} {...register("birthdate")} />
              <Select
                label="Gender"
                error={errors.gender?.message}
                options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }]}
                {...register("gender")}
              />
            </div>
            <Select
              label="Account Type"
              error={errors.accountType?.message}
              options={ACCOUNT_TYPES.map((t) => ({ value: t, label: t }))}
              {...register("accountType")}
            />
            <Select
              label="Nationality"
              error={errors.nationality?.message}
              options={[{ value: "Tanzanian", label: "Tanzanian" }, { value: "Foreigner", label: "Foreigner" }]}
              {...register("nationality")}
            />
            {nationality === "Tanzanian" ? (
              <Input label="NIDA Number" placeholder="XXXXXXXXXXXXXXXXXX" error={errors.nidaNumber?.message} {...register("nidaNumber")} />
            ) : (
              <Input label="Passport Number" error={errors.passportNumber?.message} {...register("passportNumber")} />
            )}
          </>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <>
            <Input
              label="Mobile Number"
              type="tel"
              placeholder="e.g. 0712345678"
              error={errors.mobile?.message}
              leftIcon={<Phone size={16} />}
              {...register("mobile")}
            />
            <Input
              label="Email Address"
              type="email"
              error={errors.email?.message}
              leftIcon={<Mail size={16} />}
              {...register("email")}
            />
            <Input
              label="Username"
              placeholder="e.g. john_doe"
              error={errors.username?.message}
              leftIcon={<User size={16} />}
              hint="Lowercase letters, numbers and underscores only"
              {...register("username")}
            />
          </>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <>
            <Input
              label="Password"
              type={showPwd ? "text" : "password"}
              error={errors.password?.message}
              hint="Minimum 8 characters"
              rightIcon={
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              {...register("password")}
            />
            <Input
              label="Confirm Password"
              type={showPwd ? "text" : "password"}
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800 rounded-xl">
              <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <Phone size={10} className="text-white" />
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                A 6-digit verification code will be sent to your mobile number. You&apos;ll need it to complete your first login.
              </p>
            </div>
          </>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
            >
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button type="button" fullWidth={step === 1} className="flex-1" onClick={goNext}>
              Continue <ChevronRight size={16} />
            </Button>
          ) : (
            <Button type="submit" fullWidth loading={loading} className="flex-1" size="lg">
              Create Account
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
