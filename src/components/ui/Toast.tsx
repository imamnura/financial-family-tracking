"use client";

import React, { useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import {
  useNotificationStore,
  Notification,
  NotificationType,
} from "@/store/useNotificationStore";

const iconMap: Record<NotificationType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-green-600" />,
  error: <XCircle className="w-5 h-5 text-red-600" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
  info: <Info className="w-5 h-5 text-blue-600" />,
};

const colorMap: Record<NotificationType, string> = {
  success:
    "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  error: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  warning:
    "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
  info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
};

function ToastItem({ notification }: { notification: Notification }) {
  const removeNotification = useNotificationStore(
    (state) => state.removeNotification
  );

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border ${
        colorMap[notification.type]
      } shadow-lg animate-slide-in-right`}
    >
      <div className="flex-shrink-0">{iconMap[notification.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white">
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {notification.message}
          </p>
        )}
        {notification.action && (
          <button
            onClick={notification.action.onClick}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mt-2"
          >
            {notification.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => removeNotification(notification.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const notifications = useNotificationStore((state) => state.notifications);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <ToastItem notification={notification} />
        </div>
      ))}
    </div>
  );
}
