import React from "react";
import { clsx } from "clsx";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bordered" | "elevated" | "ghost";
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  hoverable?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = "default",
      padding = "md",
      hoverable = false,
      className,
      ...props
    },
    ref
  ) => {
    const variants = {
      default:
        "bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700",
      bordered:
        "bg-white dark:bg-secondary-900 border-2 border-secondary-300 dark:border-secondary-600",
      elevated:
        "bg-white dark:bg-secondary-900 shadow-card hover:shadow-card-hover border border-secondary-100 dark:border-secondary-800",
      ghost: "bg-transparent",
    };

    const paddings = {
      none: "",
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
      xl: "p-8",
    };

    return (
      <div
        ref={ref}
        className={clsx(
          "rounded-lg transition-all duration-200",
          variants[variant],
          paddings[padding],
          hoverable &&
            "hover:shadow-card-hover cursor-pointer hover:border-primary-200 dark:hover:border-primary-800",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export default Card;
