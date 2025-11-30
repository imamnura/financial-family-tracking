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

// GET /api/goals/[id] - Get single goal detail
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
    const { id } = await params;

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

    // Fetch goal with all relations
    const goal = await prisma.goal.findFirst({
      where: {
        id,
        familyId: user.familyId, // Ensure goal belongs to user's family
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
        distributions: {
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

    if (!goal) {
      return NextResponse.json(
        { error: "Goal tidak ditemukan" },
        { status: 404 }
      );
    }

    // Calculate progress and other metrics
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

    // Calculate total contributions per user
    const contributionsByUser = goal.contributions.reduce(
      (acc: any, contribution: any) => {
        const userId = contribution.user.id;
        if (!acc[userId]) {
          acc[userId] = {
            user: contribution.user,
            total: 0,
            count: 0,
          };
        }
        acc[userId].total += contribution.amount;
        acc[userId].count += 1;
        return acc;
      },
      {}
    );

    return NextResponse.json({
      goal: {
        ...goal,
        progress: Math.round(progress * 100) / 100,
        daysLeft,
        contributionsByUser: Object.values(contributionsByUser),
      },
    });
  } catch (error) {
    console.error("GET /api/goals/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/goals/[id] - Update goal
export async function PUT(
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
    const { id } = await params;

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
    const existingGoal = await prisma.goal.findFirst({
      where: {
        id,
        familyId: user.familyId,
      },
    });

    if (!existingGoal) {
      return NextResponse.json(
        { error: "Goal tidak ditemukan" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, targetAmount, deadline, status } = body;

    // Validation
    if (name && !name.trim()) {
      return NextResponse.json(
        { error: "Nama goal tidak boleh kosong" },
        { status: 400 }
      );
    }

    if (targetAmount && targetAmount <= 0) {
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

    if (status && !["ACTIVE", "COMPLETED", "CANCELLED"].includes(status)) {
      return NextResponse.json(
        { error: "Status tidak valid" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined)
      updateData.description = description?.trim() || null;
    if (targetAmount !== undefined)
      updateData.targetAmount = parseFloat(targetAmount);
    if (deadline !== undefined)
      updateData.deadline = deadline ? new Date(deadline) : null;
    if (status !== undefined) updateData.status = status as GoalStatus;

    // Update goal
    const goal = await prisma.goal.update({
      where: { id },
      data: updateData,
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "UPDATE_GOAL",
        entityType: "Goal",
        entityId: goal.id,
        details: `Mengupdate goal: ${goal.name}`,
        userId: user.id,
        familyId: user.familyId,
      },
    });

    return NextResponse.json({
      goal,
      message: "Goal berhasil diupdate",
    });
  } catch (error) {
    console.error("PUT /api/goals/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/goals/[id] - Delete goal
export async function DELETE(
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
    const { id } = await params;

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
    const existingGoal = await prisma.goal.findFirst({
      where: {
        id,
        familyId: user.familyId,
      },
    });

    if (!existingGoal) {
      return NextResponse.json(
        { error: "Goal tidak ditemukan" },
        { status: 404 }
      );
    }

    // Prevent deletion if goal has contributions or distributions
    const hasActivity = await prisma.goal.findFirst({
      where: { id },
      include: {
        _count: {
          select: {
            contributions: true,
            distributions: true,
          },
        },
      },
    });

    if (
      hasActivity &&
      (hasActivity._count.contributions > 0 ||
        hasActivity._count.distributions > 0)
    ) {
      return NextResponse.json(
        {
          error:
            "Tidak bisa menghapus goal yang sudah memiliki kontribusi atau distribusi. Ubah status menjadi CANCELLED sebagai gantinya.",
        },
        { status: 400 }
      );
    }

    // Delete goal
    await prisma.goal.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "DELETE_GOAL",
        entityType: "Goal",
        entityId: id,
        details: `Menghapus goal: ${existingGoal.name}`,
        userId: user.id,
        familyId: user.familyId,
      },
    });

    return NextResponse.json({
      message: "Goal berhasil dihapus",
    });
  } catch (error) {
    console.error("DELETE /api/goals/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
