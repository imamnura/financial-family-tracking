import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface JWTPayload {
  userId: string;
  email: string;
}

// GET /api/goals/notifications - Get goal-related notifications
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verify(token, JWT_SECRET) as JWTPayload;

    // Get user with family
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { family: true },
    });

    if (!user || !user.familyId) {
      return NextResponse.json(
        { error: "User tidak tergabung dalam keluarga" },
        { status: 400 }
      );
    }

    // Get all active goals for the family
    const goals = await prisma.goal.findMany({
      where: {
        familyId: user.familyId,
        status: "ACTIVE",
      },
      include: {
        contributions: {
          orderBy: {
            date: "desc",
          },
          take: 1,
        },
      },
    });

    const notifications: any[] = [];
    const today = new Date();

    for (const goal of goals) {
      const progress = (goal.currentAmount / goal.targetAmount) * 100;
      const daysLeft = goal.deadline
        ? Math.ceil(
            (new Date(goal.deadline).getTime() - today.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null;

      // Notification: Goal almost completed (90%+)
      if (progress >= 90 && progress < 100) {
        notifications.push({
          id: `goal-almost-${goal.id}`,
          type: "GOAL_ALMOST_COMPLETE",
          priority: "medium",
          title: "🎯 Goal Hampir Tercapai!",
          message: `${goal.name} sudah mencapai ${progress.toFixed(
            1
          )}%. Tinggal sedikit lagi!`,
          goalId: goal.id,
          goalName: goal.name,
          progress,
          createdAt: new Date().toISOString(),
        });
      }

      // Notification: Goal completed (100%+)
      if (progress >= 100) {
        notifications.push({
          id: `goal-complete-${goal.id}`,
          type: "GOAL_COMPLETED",
          priority: "high",
          title: "🎉 Goal Tercapai!",
          message: `Selamat! ${
            goal.name
          } telah tercapai dengan ${progress.toFixed(1)}%.`,
          goalId: goal.id,
          goalName: goal.name,
          progress,
          createdAt: new Date().toISOString(),
        });
      }

      // Notification: Deadline approaching (7 days or less)
      if (
        daysLeft !== null &&
        daysLeft > 0 &&
        daysLeft <= 7 &&
        progress < 100
      ) {
        notifications.push({
          id: `goal-deadline-${goal.id}`,
          type: "GOAL_DEADLINE_NEAR",
          priority: daysLeft <= 3 ? "high" : "medium",
          title: "⏰ Deadline Mendekat",
          message: `${
            goal.name
          } akan berakhir dalam ${daysLeft} hari (${progress.toFixed(
            1
          )}% tercapai).`,
          goalId: goal.id,
          goalName: goal.name,
          progress,
          daysLeft,
          createdAt: new Date().toISOString(),
        });
      }

      // Notification: Deadline passed but not completed
      if (daysLeft !== null && daysLeft < 0 && progress < 100) {
        notifications.push({
          id: `goal-overdue-${goal.id}`,
          type: "GOAL_OVERDUE",
          priority: "high",
          title: "⚠️ Goal Melewati Deadline",
          message: `${goal.name} telah melewati deadline ${Math.abs(
            daysLeft
          )} hari yang lalu (${progress.toFixed(1)}% tercapai).`,
          goalId: goal.id,
          goalName: goal.name,
          progress,
          daysOverdue: Math.abs(daysLeft),
          createdAt: new Date().toISOString(),
        });
      }

      // Notification: No progress in 30 days
      if (goal.contributions.length > 0) {
        const lastContribution = goal.contributions[0];
        const daysSinceLastContribution = Math.floor(
          (today.getTime() - new Date(lastContribution.date).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastContribution >= 30 && progress < 100) {
          notifications.push({
            id: `goal-inactive-${goal.id}`,
            type: "GOAL_INACTIVE",
            priority: "low",
            title: "💤 Goal Tidak Aktif",
            message: `${goal.name} tidak ada kontribusi dalam ${daysSinceLastContribution} hari terakhir.`,
            goalId: goal.id,
            goalName: goal.name,
            daysSinceLastContribution,
            createdAt: new Date().toISOString(),
          });
        }
      }

      // Notification: Milestone reached (25%, 50%, 75%)
      const milestones = [25, 50, 75];
      for (const milestone of milestones) {
        if (progress >= milestone && progress < milestone + 5) {
          notifications.push({
            id: `goal-milestone-${goal.id}-${milestone}`,
            type: "GOAL_MILESTONE",
            priority: "low",
            title: `🎊 Milestone ${milestone}%`,
            message: `${goal.name} telah mencapai ${milestone}%!`,
            goalId: goal.id,
            goalName: goal.name,
            milestone,
            progress,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    // Sort by priority (high > medium > low) and then by created date
    const priorityOrder: Record<string, number> = {
      high: 1,
      medium: 2,
      low: 3,
    };
    notifications.sort((a, b) => {
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      notifications,
      total: notifications.length,
      stats: {
        high: notifications.filter((n) => n.priority === "high").length,
        medium: notifications.filter((n) => n.priority === "medium").length,
        low: notifications.filter((n) => n.priority === "low").length,
      },
    });
  } catch (error) {
    console.error("GET /api/goals/notifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
