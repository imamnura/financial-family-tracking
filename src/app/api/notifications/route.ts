import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { sendEmail as sendEmailNotification } from "@/lib/email";

/**
 * GET /api/notifications
 * Get user notifications with filters
 * Query params:
 * - status: "PENDING" | "SENT" | "FAILED" | "READ"
 * - type: NotificationType
 * - limit: number (default: 50)
 * - unreadOnly: boolean
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "50");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const filter: any = { userId: user.userId };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (unreadOnly) filter.readAt = null;

    const notifications = await prisma.notification.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Count unread notifications
    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.userId,
        readAt: null,
      },
    });

    // Group by type
    const groupedByType = notifications.reduce((acc: any, notif) => {
      if (!acc[notif.type]) acc[notif.type] = [];
      acc[notif.type].push(notif);
      return acc;
    }, {});

    return NextResponse.json({
      notifications,
      unreadCount,
      groupedByType,
      total: notifications.length,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Create a new notification
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await verifyToken(token);
    if (!user || !user.familyId) {
      return NextResponse.json(
        { error: "Unauthorized or no family" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      type,
      title,
      message,
      data,
      targetUserId,
      referenceId,
      referenceType,
      sendEmail,
    } = body;

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: "type, title, and message are required" },
        { status: 400 }
      );
    }

    const familyId = user.familyId!;
    const userId = targetUserId || user.userId;

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        data,
        userId,
        familyId,
        referenceId,
        referenceType,
        status: "SENT",
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Send email if requested
    if (sendEmail && notification.user.email) {
      const emailResult = await sendEmailNotification({
        to: notification.user.email,
        subject: title,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${title}</h2>
            <p>${message}</p>
            ${
              data
                ? `<pre style="background: #f3f4f6; padding: 10px; border-radius: 4px;">${JSON.stringify(
                    data,
                    null,
                    2
                  )}</pre>`
                : ""
            }
          </div>
        `,
        text: `${title}\n\n${message}`,
      });

      // Update notification with email status
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          emailSent: emailResult.success,
          emailSentAt: emailResult.success ? new Date() : null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      notification,
      message: "Notification created successfully",
    });
  } catch (error: any) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Mark notifications as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAll } = body;

    if (markAll) {
      // Mark all as read
      const result = await prisma.notification.updateMany({
        where: {
          userId: user.userId,
          readAt: null,
        },
        data: {
          readAt: new Date(),
          status: "READ",
        },
      });

      return NextResponse.json({
        success: true,
        count: result.count,
        message: "All notifications marked as read",
      });
    }

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: "notificationIds array or markAll is required" },
        { status: 400 }
      );
    }

    // Mark specific notifications as read
    const result = await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: user.userId,
      },
      data: {
        readAt: new Date(),
        status: "READ",
      },
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      message: "Notifications marked as read",
    });
  } catch (error: any) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications
 * Delete notifications
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("id");
    const deleteAll = searchParams.get("deleteAll") === "true";

    if (deleteAll) {
      // Delete all read notifications
      const result = await prisma.notification.deleteMany({
        where: {
          userId: user.userId,
          readAt: { not: null },
        },
      });

      return NextResponse.json({
        success: true,
        count: result.count,
        message: "All read notifications deleted",
      });
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: "notificationId or deleteAll is required" },
        { status: 400 }
      );
    }

    // Delete specific notification
    await prisma.notification.delete({
      where: {
        id: notificationId,
        userId: user.userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
