import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
        secondary: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
        destructive: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
        success: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
        warning: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
        outline: "border border-current",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
