export interface GoalType {
  id: string;
  name: string;
  description?: string | null;
  targetAmount: number;
  currentAmount: number;
  deadline?: string | null;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  progress: number;
  daysLeft?: number | null;
  contributions?: any[];
  _count?: {
    contributions: number;
    distributions?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}
