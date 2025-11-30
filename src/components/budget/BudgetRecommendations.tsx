"use client";

import React, { useState, useEffect } from "react";
import { Card, Badge, Button, Loading } from "@/components/ui";
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Recommendation {
  category: string;
  currentBudget: number;
  recommendedBudget: number;
  reason: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

interface BudgetRecommendationsProps {
  month: number;
}

export default function BudgetRecommendations({
  month,
}: BudgetRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/budget/recommendations?month=${month}`
      );
      if (!response.ok) throw new Error("Failed to fetch recommendations");

      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "danger";
      case "MEDIUM":
        return "warning";
      case "LOW":
        return "info";
      default:
        return "default";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return <AlertTriangle className="w-5 h-5" />;
      case "MEDIUM":
        return <Target className="w-5 h-5" />;
      case "LOW":
        return <Lightbulb className="w-5 h-5" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card variant="elevated" padding="lg">
        <div className="flex items-center justify-center py-8">
          <Loading size="lg" text="Generating recommendations..." />
        </div>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  const visibleRecommendations = isExpanded
    ? recommendations
    : recommendations.slice(0, 3);

  return (
    <Card variant="elevated" padding="lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
              Budget Recommendations
            </h3>
            <p className="text-sm text-secondary-500 dark:text-secondary-400">
              AI-powered suggestions based on your spending patterns
            </p>
          </div>
        </div>
        <Badge variant="primary" size="sm">
          {recommendations.length} Tips
        </Badge>
      </div>

      <div className="space-y-4">
        {visibleRecommendations.map((rec, index) => (
          <div
            key={index}
            className="p-4 bg-secondary-50 dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700"
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  rec.priority === "HIGH"
                    ? "bg-danger-100 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400"
                    : rec.priority === "MEDIUM"
                    ? "bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400"
                    : "bg-info-100 dark:bg-info-900/30 text-info-600 dark:text-info-400"
                }`}
              >
                {getPriorityIcon(rec.priority)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-secondary-900 dark:text-secondary-100">
                    {rec.category}
                  </h4>
                  <Badge
                    variant={getPriorityColor(rec.priority) as any}
                    size="sm"
                  >
                    {rec.priority}
                  </Badge>
                </div>

                <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-3">
                  {rec.reason}
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-1">
                      Current Budget
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-secondary-900 dark:text-secondary-100">
                        {formatCurrency(rec.currentBudget)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-1">
                      Recommended
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                        {formatCurrency(rec.recommendedBudget)}
                      </p>
                      {rec.recommendedBudget > rec.currentBudget ? (
                        <TrendingUp className="w-4 h-4 text-success-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-danger-600" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {recommendations.length > 3 && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded
              ? "Show Less"
              : `Show ${recommendations.length - 3} More`}
          </Button>
        </div>
      )}
    </Card>
  );
}
