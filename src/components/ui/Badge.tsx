import React from "react";
import { clsx } from "clsx";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "income"
    | "expense";
  size?: "sm" | "md" | "lg";
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      variant = "default",
      size = "md",
      dot = false,
      className,
      ...props
    },
    ref
  ) => {
    const variants = {
      default:
        "bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-300",
      primary:
        "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300",
      success:
        "bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300",
      warning:
        "bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300",
      danger:
        "bg-danger-100 text-danger-700 dark:bg-danger-900 dark:text-danger-300",
      info: "bg-info-100 text-info-700 dark:bg-info-900 dark:text-info-300",
      income:
        "bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300",
      expense:
        "bg-danger-100 text-danger-700 dark:bg-danger-900 dark:text-danger-300",
    };

    const sizes = {
      sm: "px-2 py-0.5 text-xs",
      md: "px-2.5 py-1 text-sm",
      lg: "px-3 py-1.5 text-base",
    };

    const dotColors = {
      default: "bg-secondary-500",
      primary: "bg-primary-500",
      success: "bg-success-500",
      warning: "bg-warning-500",
      danger: "bg-danger-500",
      info: "bg-info-500",
      income: "bg-success-500",
      expense: "bg-danger-500",
    };

    return (
      <span
        ref={ref}
        className={clsx(
          "inline-flex items-center gap-1.5 font-medium rounded-full",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={clsx("w-1.5 h-1.5 rounded-full", dotColors[variant])}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export default Badge;
