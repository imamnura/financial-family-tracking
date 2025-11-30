import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { sendEmail as sendEmailNotification } from "@/lib/email";

/**
 * POST /api/notifications/send-due-date-reminders
 * Manually trigger due date reminders for liabilities
 * Query params:
 * - daysAhead: number (default: 7)
 * - sendEmail: boolean (default: true)
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const authUser = await verifyToken(token);
    if (!authUser || !authUser.familyId) {
      return NextResponse.json(
        { error: "Unauthorized or no family" },
        { status: 401 }
      );
    }

    // Fetch full user data
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { id: true, name: true, email: true, familyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const daysAhead = parseInt(searchParams.get("daysAhead") || "7");
    const sendEmail = searchParams.get("sendEmail") !== "false";

    const familyId = user.familyId!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    // Find liabilities with upcoming due dates
    const liabilities = await prisma.liability.findMany({
      where: {
        familyId,
        remainingAmount: { gt: 0 },
        dueDate: {
          gte: today,
          lte: futureDate,
        },
      },
      orderBy: { dueDate: "asc" },
    });

    const notificationsSent: any[] = [];
    const emailsSent: any[] = [];

    for (const liability of liabilities) {
      const dueDate = new Date(liability.dueDate!);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      const title = `Payment Reminder: ${liability.name}`;
      const message = `Your payment for ${
        liability.name
      } is due in ${daysUntilDue} day${
        daysUntilDue > 1 ? "s" : ""
      }. Amount: Rp ${Number(liability.remainingAmount).toLocaleString(
        "id-ID"
      )}`;

      // Create notification
      const notification = await prisma.notification.create({
        data: {
          type: "PAYMENT_DUE",
          title,
          message,
          data: {
            liabilityId: liability.id,
            liabilityName: liability.name,
            amount: Number(liability.remainingAmount),
            dueDate: liability.dueDate,
            daysUntilDue,
          },
          userId: user.id,
          familyId,
          referenceId: liability.id,
          referenceType: "liability",
          status: "SENT",
        },
      });

      notificationsSent.push(notification);

      // Send email
      if (sendEmail && user.email) {
        const isOverdue = daysUntilDue < 0;
        const urgency = isOverdue
          ? "OVERDUE"
          : daysUntilDue <= 3
          ? "URGENT"
          : "UPCOMING";
        const urgencyColor = isOverdue
          ? "#dc2626"
          : daysUntilDue <= 3
          ? "#f59e0b"
          : "#3b82f6";

        const emailHtml = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: ${urgencyColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0;">💳 Payment Reminder</h2>
  </div>
  <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
    <p>Hello <strong>${user.name}</strong>,</p>
    <p>This is a reminder about your upcoming payment:</p>
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <p><strong>Liability:</strong> ${liability.name}</p>
      <p><strong>Amount:</strong> <span style="font-size: 20px; font-weight: bold;">Rp ${Number(
        liability.remainingAmount
      ).toLocaleString("id-ID")}</span></p>
      <p><strong>Due Date:</strong> ${new Date(
        liability.dueDate!
      ).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}</p>
      <p><strong>Status:</strong> <span style="background: ${urgencyColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">${urgency} - ${
          isOverdue
            ? `${Math.abs(daysUntilDue)} days overdue`
            : `${daysUntilDue} days remaining`
        }</span></p>
    </div>
    ${
      isOverdue
        ? `<p style="color: #dc2626; font-weight: bold;">⚠️ This payment is overdue! Please make payment as soon as possible.</p>`
        : daysUntilDue <= 3
        ? `<p style="color: #f59e0b; font-weight: bold;">⚠️ Payment due in ${daysUntilDue} days. Please ensure you have sufficient funds.</p>`
        : `<p>Please make sure you have sufficient funds ready for this payment.</p>`
    }
    <p>Thank you for using Family Finance Tracker!</p>
  </div>
</div>
        `;

        const emailResult = await sendEmailNotification({
          to: user.email,
          subject: title,
          html: emailHtml,
          text: message,
        });

        if (emailResult.success) {
          await prisma.notification.update({
            where: { id: notification.id },
            data: {
              emailSent: true,
              emailSentAt: new Date(),
            },
          });
          emailsSent.push({ liabilityId: liability.id, email: user.email });
        }
      }
    }

    return NextResponse.json({
      success: true,
      notificationsSent: notificationsSent.length,
      emailsSent: emailsSent.length,
      liabilitiesProcessed: liabilities.length,
      details: {
        notifications: notificationsSent,
        emails: emailsSent,
      },
      message: `Sent ${notificationsSent.length} notifications and ${emailsSent.length} emails`,
    });
  } catch (error: any) {
    console.error("Error sending due date reminders:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
