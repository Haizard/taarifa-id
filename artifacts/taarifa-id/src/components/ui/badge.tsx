import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
        secondary:   "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
        destructive: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
        success:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        warning:     "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        outline:     "border-2 border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300",
        navy:        "bg-blue-950 text-blue-100 dark:bg-blue-900 dark:text-blue-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
