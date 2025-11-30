import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { GoalStatus } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface JWTPayload {
  userId: string;
  email: string;
}

// GET /api/goals - Get all goals for user's family
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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as GoalStatus | null;
    const search = searchParams.get("search");

    // Build where clause
    const where: any = {
      familyId: user.familyId,
    };

    if (status && ["ACTIVE", "COMPLETED", "CANCELLED"].includes(status)) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Fetch goals with contributions count
    const goals = await prisma.goal.findMany({
      where,
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
      orderBy: [
        { status: "asc" }, // ACTIVE first
        { deadline: "asc" }, // Nearest deadline first
        { createdAt: "desc" },
      ],
    });

    // Calculate progress for each goal
    const goalsWithProgress = goals.map((goal) => {
      const progress =
        goal.targetAmount > 0
          ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
          : 0;

      const daysLeft = goal.deadline
        ? Math.ceil(
            (new Date(goal.deadline).getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null;

      return {
        ...goal,
        progress: Math.round(progress * 100) / 100,
        daysLeft,
      };
    });

    return NextResponse.json({
      goals: goalsWithProgress,
      total: goalsWithProgress.length,
    });
  } catch (error) {
    console.error("GET /api/goals error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/goals - Create new goal
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name, description, targetAmount, deadline } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nama goal wajib diisi" },
        { status: 400 }
      );
    }

    if (!targetAmount || targetAmount <= 0) {
      return NextResponse.json(
        { error: "Target amount harus lebih dari 0" },
        { status: 400 }
      );
    }

    if (deadline && new Date(deadline) <= new Date()) {
      return NextResponse.json(
        { error: "Deadline harus di masa depan" },
        { status: 400 }
      );
    }

    // Create goal
    const goal = await prisma.goal.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        targetAmount: parseFloat(targetAmount),
        deadline: deadline ? new Date(deadline) : null,
        familyId: user.familyId,
        status: "ACTIVE",
        currentAmount: 0,
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
        },
        _count: {
          select: {
            contributions: true,
            distributions: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "CREATE_GOAL",
        entityType: "Goal",
        entityId: goal.id,
        details: `Membuat goal: ${goal.name}`,
        userId: user.id,
        familyId: user.familyId,
      },
    });

    return NextResponse.json(
      {
        goal,
        message: "Goal berhasil dibuat",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/goals error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
