"use client";

import { useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { initializeMonitoring, analytics } from "@/lib/monitoring";

interface Props {
  children: ReactNode;
}

/**
 * Monitoring Provider
 * Initializes performance monitoring and analytics tracking
 */
export default function MonitoringProvider({ children }: Props) {
  const pathname = usePathname();

  useEffect(() => {
    // Initialize monitoring on mount
    initializeMonitoring();
  }, []);

  useEffect(() => {
    // Track page views on route change
    if (pathname) {
      analytics.trackPageView(pathname);
    }
  }, [pathname]);

  return <>{children}</>;
}
