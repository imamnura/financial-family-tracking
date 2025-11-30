import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface JWTPayload {
  userId: string;
  email: string;
}

// DELETE /api/goals/[goalId]/contribute/[contributionId] - Delete contribution
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contributionId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verify(token, JWT_SECRET) as JWTPayload;
    const { id: goalId, contributionId } = await params;

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

    // Check if contribution exists
    const contribution = await prisma.goalContribution.findFirst({
      where: {
        id: contributionId,
        goalId,
        goal: {
          familyId: user.familyId,
        },
      },
      include: {
        goal: true,
      },
    });

    if (!contribution) {
      return NextResponse.json(
        { error: "Kontribusi tidak ditemukan" },
        { status: 404 }
      );
    }

    // Only allow deletion by the contributor or admin
    if (contribution.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Anda tidak memiliki izin untuk menghapus kontribusi ini" },
        { status: 403 }
      );
    }

    // Use transaction to ensure atomic operations
    await prisma.$transaction(async (tx) => {
      // Delete contribution
      await tx.goalContribution.delete({
        where: { id: contributionId },
      });

      // Update goal's current amount
      await tx.goal.update({
        where: { id: goalId },
        data: {
          currentAmount: {
            decrement: contribution.amount,
          },
        },
      });

      // If goal was completed, revert to active if amount is now below target
      const updatedGoal = await tx.goal.findUnique({
        where: { id: goalId },
      });

      if (
        updatedGoal &&
        updatedGoal.status === "COMPLETED" &&
        updatedGoal.currentAmount < updatedGoal.targetAmount
      ) {
        await tx.goal.update({
          where: { id: goalId },
          data: { status: "ACTIVE" },
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: "DELETE_CONTRIBUTION",
          entityType: "GoalContribution",
          entityId: contributionId,
          details: `Menghapus kontribusi Rp ${contribution.amount.toLocaleString(
            "id-ID"
          )} dari goal: ${contribution.goal.name}`,
          userId: user.id,
          familyId: user.familyId,
        },
      });
    });

    return NextResponse.json({
      message: "Kontribusi berhasil dihapus",
    });
  } catch (error) {
    console.error(
      "DELETE /api/goals/[id]/contribute/[contributionId] error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
