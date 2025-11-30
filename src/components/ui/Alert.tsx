"use client";

import React from "react";
import { clsx } from "clsx";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

export interface AlertProps {
  variant?: "success" | "warning" | "danger" | "info";
  title?: string;
  message: string;
  onClose?: () => void;
  dismissible?: boolean;
}

const Alert: React.FC<AlertProps> = ({
  variant = "info",
  title,
  message,
  onClose,
  dismissible = false,
}) => {
  const variants = {
    success: {
      bg: "bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800",
      icon: CheckCircle,
      iconColor: "text-success-600 dark:text-success-400",
      textColor: "text-success-800 dark:text-success-200",
    },
    warning: {
      bg: "bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800",
      icon: AlertTriangle,
      iconColor: "text-warning-600 dark:text-warning-400",
      textColor: "text-warning-800 dark:text-warning-200",
    },
    danger: {
      bg: "bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-800",
      icon: AlertCircle,
      iconColor: "text-danger-600 dark:text-danger-400",
      textColor: "text-danger-800 dark:text-danger-200",
    },
    info: {
      bg: "bg-info-50 dark:bg-info-900/20 border-info-200 dark:border-info-800",
      icon: Info,
      iconColor: "text-info-600 dark:text-info-400",
      textColor: "text-info-800 dark:text-info-200",
    },
  };

  const { bg, icon: Icon, iconColor, textColor } = variants[variant];

  return (
    <div className={clsx("rounded-lg border p-4", bg)}>
      <div className="flex items-start gap-3">
        <Icon className={clsx("w-5 h-5 flex-shrink-0 mt-0.5", iconColor)} />

        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={clsx("font-semibold mb-1", textColor)}>{title}</h4>
          )}
          <p className={clsx("text-sm", textColor)}>{message}</p>
        </div>

        {dismissible && onClose && (
          <button
            onClick={onClose}
            className={clsx(
              "flex-shrink-0 hover:opacity-70 transition-opacity",
              iconColor
            )}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;
