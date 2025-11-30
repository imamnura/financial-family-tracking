/**
 * Performance Monitoring & Analytics
 * Track page views, user actions, and performance metrics
 */

interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  url: string;
  userAgent: string;
}

interface ErrorLog {
  message: string;
  stack?: string;
  url: string;
  timestamp: Date;
  userId?: string;
  severity: "low" | "medium" | "high" | "critical";
}

/**
 * Analytics Class
 * Handles event tracking and analytics
 */
class Analytics {
  private events: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId?: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeTracking();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeTracking() {
    // Track page visibility changes
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        this.trackEvent({
          category: "Engagement",
          action: document.hidden ? "Page Hidden" : "Page Visible",
        });
      });
    }
  }

  /**
   * Set current user ID for tracking
   */
  setUserId(userId: string) {
    this.userId = userId;
  }

  /**
   * Track custom event
   */
  trackEvent(
    event: Omit<AnalyticsEvent, "timestamp" | "sessionId" | "userId">
  ) {
    const analyticsEvent: AnalyticsEvent = {
      ...event,
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.events.push(analyticsEvent);

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log("📊 Analytics Event:", analyticsEvent);
    }

    // Send to analytics service (Google Analytics, Mixpanel, etc.)
    this.sendToAnalyticsService(analyticsEvent);
  }

  /**
   * Track page view
   */
  trackPageView(path: string, title?: string) {
    this.trackEvent({
      category: "Navigation",
      action: "Page View",
      label: title || path,
    });
  }

  /**
   * Track button click
   */
  trackButtonClick(buttonName: string, location?: string) {
    this.trackEvent({
      category: "User Interaction",
      action: "Button Click",
      label: `${buttonName}${location ? ` - ${location}` : ""}`,
    });
  }

  /**
   * Track form submission
   */
  trackFormSubmit(formName: string, success: boolean) {
    this.trackEvent({
      category: "Form",
      action: success ? "Submit Success" : "Submit Failed",
      label: formName,
    });
  }

  /**
   * Track search
   */
  trackSearch(query: string, results: number) {
    this.trackEvent({
      category: "Search",
      action: "Search Performed",
      label: query,
      value: results,
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(featureName: string, action: string) {
    this.trackEvent({
      category: "Feature Usage",
      action,
      label: featureName,
    });
  }

  /**
   * Get all tracked events
   */
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Clear all events
   */
  clearEvents() {
    this.events = [];
  }

  /**
   * Send event to analytics service
   */
  private sendToAnalyticsService(event: AnalyticsEvent) {
    // TODO: Implement integration with analytics service
    // Example: Google Analytics 4
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
      });
    }

    // Example: Mixpanel
    if (typeof window !== "undefined" && (window as any).mixpanel) {
      (window as any).mixpanel.track(event.action, {
        category: event.category,
        label: event.label,
        value: event.value,
      });
    }
  }
}

/**
 * Performance Monitoring Class
 * Track performance metrics and vitals
 */
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];

  /**
   * Track Web Vitals (LCP, FID, CLS)
   */
  trackWebVitals() {
    if (typeof window === "undefined") return;

    // Largest Contentful Paint (LCP)
    this.trackLCP();

    // First Input Delay (FID)
    this.trackFID();

    // Cumulative Layout Shift (CLS)
    this.trackCLS();

    // Time to First Byte (TTFB)
    this.trackTTFB();
  }

  private trackLCP() {
    if ("PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.logMetric(
            "LCP",
            (lastEntry as any).renderTime || (lastEntry as any).loadTime
          );
        });
        observer.observe({ entryTypes: ["largest-contentful-paint"] });
      } catch (error) {
        console.error("Error tracking LCP:", error);
      }
    }
  }

  private trackFID() {
    if ("PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            this.logMetric(
              "FID",
              (entry as any).processingStart - entry.startTime
            );
          });
        });
        observer.observe({ entryTypes: ["first-input"] });
      } catch (error) {
        console.error("Error tracking FID:", error);
      }
    }
  }

  private trackCLS() {
    if ("PerformanceObserver" in window) {
      try {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
              this.logMetric("CLS", clsValue);
            }
          });
        });
        observer.observe({ entryTypes: ["layout-shift"] });
      } catch (error) {
        console.error("Error tracking CLS:", error);
      }
    }
  }

  private trackTTFB() {
    if ("performance" in window && "timing" in window.performance) {
      const timing = window.performance.timing;
      const ttfb = timing.responseStart - timing.requestStart;
      this.logMetric("TTFB", ttfb);
    }
  }

  /**
   * Track custom performance metric
   */
  trackCustomMetric(name: string, value: number) {
    this.logMetric(name, value);
  }

  /**
   * Track page load time
   */
  trackPageLoad() {
    if (typeof window === "undefined") return;

    window.addEventListener("load", () => {
      setTimeout(() => {
        const timing = window.performance.timing;
        const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
        this.logMetric("Page Load Time", pageLoadTime);
      }, 0);
    });
  }

  /**
   * Track API request duration
   */
  trackApiRequest(endpoint: string, duration: number, status: number) {
    this.logMetric(`API: ${endpoint}`, duration);

    if (process.env.NODE_ENV === "development") {
      console.log(`⚡ API Request: ${endpoint} - ${duration}ms (${status})`);
    }
  }

  /**
   * Log metric
   */
  private logMetric(name: string, value: number) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: new Date(),
      url: typeof window !== "undefined" ? window.location.href : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    };

    this.metrics.push(metric);

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log(`⚡ Performance Metric: ${name} = ${value.toFixed(2)}ms`);
    }

    // Send to monitoring service
    this.sendToMonitoringService(metric);
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Send metric to monitoring service
   */
  private sendToMonitoringService(metric: PerformanceMetric) {
    // TODO: Implement integration with monitoring service
    // Example: Send to backend API for aggregation
    // fetch('/api/metrics', { method: 'POST', body: JSON.stringify(metric) });
  }
}

/**
 * Error Logging Class
 * Track and log errors
 */
class ErrorLogger {
  private errors: ErrorLog[] = [];

  /**
   * Log error
   */
  logError(
    error: Error | string,
    severity: ErrorLog["severity"] = "medium",
    userId?: string
  ) {
    const errorLog: ErrorLog = {
      message: typeof error === "string" ? error : error.message,
      stack: typeof error === "string" ? undefined : error.stack,
      url: typeof window !== "undefined" ? window.location.href : "",
      timestamp: new Date(),
      userId,
      severity,
    };

    this.errors.push(errorLog);

    // Log to console
    console.error("🚨 Error:", errorLog);

    // Send to error tracking service
    this.sendToErrorService(errorLog);
  }

  /**
   * Get all errors
   */
  getErrors(): ErrorLog[] {
    return [...this.errors];
  }

  /**
   * Send error to tracking service
   */
  private sendToErrorService(error: ErrorLog) {
    // TODO: Implement integration with error tracking service
    // Example: Sentry
    // if (typeof window !== 'undefined' && (window as any).Sentry) {
    //   (window as any).Sentry.captureException(new Error(error.message));
    // }
  }
}

// Singleton instances
export const analytics = new Analytics();
export const performanceMonitor = new PerformanceMonitor();
export const errorLogger = new ErrorLogger();

/**
 * Initialize monitoring
 */
export function initializeMonitoring() {
  if (typeof window === "undefined") return;

  // Track web vitals
  performanceMonitor.trackWebVitals();

  // Track page load
  performanceMonitor.trackPageLoad();

  // Track unhandled errors
  window.addEventListener("error", (event) => {
    errorLogger.logError(event.error || event.message, "high");
  });

  // Track unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    errorLogger.logError(event.reason || "Unhandled Promise Rejection", "high");
  });

  console.log("✅ Monitoring initialized");
}

/**
 * React Hook for tracking page views
 */
export function usePageTracking(pageName: string) {
  if (typeof window !== "undefined") {
    analytics.trackPageView(window.location.pathname, pageName);
  }
}

/**
 * Utility to measure function execution time
 */
export function measureExecutionTime<T>(fn: () => T, label: string): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  const duration = end - start;

  performanceMonitor.trackCustomMetric(label, duration);

  return result;
}

/**
 * Utility to measure async function execution time
 */
export async function measureAsyncExecutionTime<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const duration = end - start;

  performanceMonitor.trackCustomMetric(label, duration);

  return result;
}
