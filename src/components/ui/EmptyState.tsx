import React from "react";
import { LucideIcon } from "lucide-react";
import Button from "./Button";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  illustration?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  illustration,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {illustration ? (
        <div className="mb-4">{illustration}</div>
      ) : Icon ? (
        <div className="w-16 h-16 mb-4 rounded-full bg-secondary-100 dark:bg-secondary-800 flex items-center justify-center">
          <Icon className="w-8 h-8 text-secondary-400 dark:text-secondary-500" />
        </div>
      ) : null}

      <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-2">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-secondary-500 dark:text-secondary-400 max-w-md mb-6">
          {description}
        </p>
      )}

      {action && (
        <Button
          onClick={action.onClick}
          variant="primary"
          leftIcon={action.icon}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
