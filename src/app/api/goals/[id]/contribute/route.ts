import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface JWTPayload {
  userId: string;
  email: string;
}

// POST /api/goals/[id]/contribute - Add contribution to goal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verify(token, JWT_SECRET) as JWTPayload;
    const { id: goalId } = await params;

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

    // Check if goal exists and belongs to family
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        familyId: user.familyId,
      },
    });

    if (!goal) {
      return NextResponse.json(
        { error: "Goal tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check if goal is active
    if (goal.status !== "ACTIVE") {
      return NextResponse.json({ error: "Goal tidak aktif" }, { status: 400 });
    }

    const body = await request.json();
    const { amount, description, date } = body;

    // Validation
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Jumlah kontribusi harus lebih dari 0" },
        { status: 400 }
      );
    }

    // Use transaction to ensure atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Create contribution
      const contribution = await tx.goalContribution.create({
        data: {
          amount: parseFloat(amount),
          description: description?.trim() || null,
          date: date ? new Date(date) : new Date(),
          goalId,
          userId: user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          goal: true,
        },
      });

      // Update goal's current amount
      const updatedGoal = await tx.goal.update({
        where: { id: goalId },
        data: {
          currentAmount: {
            increment: parseFloat(amount),
          },
        },
        include: {
          contributions: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
            orderBy: {
              date: "desc",
            },
          },
          _count: {
            select: {
              contributions: true,
              distributions: true,
            },
          },
        },
      });

      // Check if goal is completed
      if (
        updatedGoal.currentAmount >= updatedGoal.targetAmount &&
        updatedGoal.status === "ACTIVE"
      ) {
        await tx.goal.update({
          where: { id: goalId },
          data: { status: "COMPLETED" },
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: "CREATE_CONTRIBUTION",
          entityType: "GoalContribution",
          entityId: contribution.id,
          details: `Menambahkan kontribusi Rp ${amount.toLocaleString(
            "id-ID"
          )} ke goal: ${goal.name}`,
          userId: user.id,
          familyId: user.familyId,
        },
      });

      return { contribution, goal: updatedGoal };
    });

    return NextResponse.json(
      {
        contribution: result.contribution,
        goal: result.goal,
        message: "Kontribusi berhasil ditambahkan",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/goals/[id]/contribute error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/goals/[id]/contribute - Get all contributions for a goal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verify(token, JWT_SECRET) as JWTPayload;
    const { id: goalId } = await params;

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

    // Check if goal exists and belongs to family
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        familyId: user.familyId,
      },
    });

    if (!goal) {
      return NextResponse.json(
        { error: "Goal tidak ditemukan" },
        { status: 404 }
      );
    }

    // Get contributions with pagination
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const [contributions, total] = await Promise.all([
      prisma.goalContribution.findMany({
        where: { goalId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          date: "desc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.goalContribution.count({
        where: { goalId },
      }),
    ]);

    // Calculate statistics
    const stats = await prisma.goalContribution.aggregate({
      where: { goalId },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
      _avg: {
        amount: true,
      },
    });

    return NextResponse.json({
      contributions,
      total,
      stats: {
        totalAmount: stats._sum.amount || 0,
        totalCount: stats._count.id || 0,
        averageAmount: stats._avg.amount || 0,
      },
    });
  } catch (error) {
    console.error("GET /api/goals/[id]/contribute error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
