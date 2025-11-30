import React from "react";
import { clsx } from "clsx";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={clsx("flex flex-col gap-1.5", fullWidth && "w-full")}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-secondary-700 dark:text-secondary-300"
          >
            {label}
            {props.required && <span className="text-danger-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={clsx(
              "block w-full rounded-lg border transition-all duration-200",
              "px-4 py-2.5 text-sm",
              "placeholder:text-secondary-400",
              "focus:outline-none focus:ring-2 focus:ring-offset-0",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error
                ? "border-danger-300 focus:border-danger-500 focus:ring-danger-500 dark:border-danger-700"
                : "border-secondary-300 focus:border-primary-500 focus:ring-primary-500 dark:border-secondary-700",
              "bg-white dark:bg-secondary-900",
              "text-secondary-900 dark:text-secondary-100",
              "disabled:bg-secondary-100 disabled:cursor-not-allowed dark:disabled:bg-secondary-800",
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-secondary-400">
              {rightIcon}
            </div>
          )}
        </div>

        {hint && !error && (
          <p className="text-xs text-secondary-500 dark:text-secondary-400">
            {hint}
          </p>
        )}

        {error && (
          <p className="text-xs text-danger-600 dark:text-danger-400 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
