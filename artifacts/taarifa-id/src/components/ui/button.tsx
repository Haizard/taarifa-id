"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-blue-700 to-blue-800 text-white shadow-[0_2px_8px_rgba(30,58,138,0.4)] hover:shadow-[0_4px_16px_rgba(30,58,138,0.5)] hover:from-blue-600 hover:to-blue-700 focus-visible:ring-blue-700",
        amber:
          "bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-[0_2px_8px_rgba(245,158,11,0.35)] hover:shadow-[0_4px_16px_rgba(245,158,11,0.45)] hover:from-amber-400 hover:to-amber-500 focus-visible:ring-amber-500",
        destructive:
          "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-[0_2px_8px_rgba(239,68,68,0.3)] hover:shadow-[0_4px_12px_rgba(239,68,68,0.4)] focus-visible:ring-red-500",
        outline:
          "border-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 focus-visible:ring-gray-400",
        "outline-primary":
          "border-2 border-blue-700 text-blue-700 bg-transparent hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 focus-visible:ring-blue-700",
        secondary:
          "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 focus-visible:ring-gray-400",
        ghost:
          "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
        link:
          "text-blue-700 underline-offset-4 hover:underline dark:text-blue-400 p-0 h-auto",
        success:
          "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)] focus-visible:ring-emerald-500",
        warning:
          "bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-[0_2px_8px_rgba(245,158,11,0.3)] focus-visible:ring-amber-500",
        white:
          "bg-white text-blue-900 shadow-[0_2px_8px_rgba(0,0,0,0.15)] hover:bg-gray-50 focus-visible:ring-white",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm:      "h-9 px-3.5 text-xs rounded-lg",
        lg:      "h-12 px-7 text-base",
        xl:      "h-14 px-9 text-base rounded-2xl",
        icon:    "h-10 w-10 rounded-xl",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
