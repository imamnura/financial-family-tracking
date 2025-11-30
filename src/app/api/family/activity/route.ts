import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth";

/**
 * GET /api/family/activity
 *
 * Get family activity timeline from audit logs
 *
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - action: string (filter by action type)
 * - entityType: string (filter by entity type)
 * - userId: string (filter by user)
 * - startDate: ISO date string
 * - endDate: ISO date string
 *
 * Response:
 * {
 *   activities: AuditLog[],
 *   pagination: {
 *     total: number,
 *     page: number,
 *     limit: number,
 *     totalPages: number
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify authentication
    const session = await getCurrentSession();
    if (!session?.userId || !session?.familyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20"))
    );
    const action = searchParams.get("action");
    const entityType = searchParams.get("entityType");
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // 3. Build where clause
    const where: any = {
      familyId: session.familyId,
    };

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // 4. Get total count
    const total = await prisma.auditLog.count({ where });

    // 5. Get activities with pagination
    const activities = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 6. Format activities with parsed JSON
    const formattedActivities = activities.map((activity) => ({
      ...activity,
      dataBefore: activity.dataBefore ? JSON.parse(activity.dataBefore) : null,
      dataAfter: activity.dataAfter ? JSON.parse(activity.dataAfter) : null,
      details: activity.details ? JSON.parse(activity.details) : null,
      changes: activity.changes ? JSON.parse(activity.changes) : null,
    }));

    return NextResponse.json({
      activities: formattedActivities,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/family/activity error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity timeline" },
      { status: 500 }
    );
  }
}
