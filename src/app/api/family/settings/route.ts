import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth";
import { z } from "zod";

/**
 * Family Settings Schema
 */
const FamilySettingsSchema = z.object({
  name: z.string().min(1, "Nama keluarga harus diisi").max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  currency: z.string().length(3).optional(), // ISO 4217 currency code
  timezone: z.string().optional(),
  language: z.enum(["id", "en"]).optional(),
  dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).optional(),
  budgetAlerts: z.boolean().optional(),
  goalReminders: z.boolean().optional(),
  weeklyReport: z.boolean().optional(),
  monthlyReport: z.boolean().optional(),
  emailNotif: z.boolean().optional(),
  defaultBudgetAlert: z.number().min(0).max(100).optional().nullable(),
});

type FamilySettingsInput = z.infer<typeof FamilySettingsSchema>;

/**
 * GET /api/family/settings
 *
 * Get current family settings and preferences
 *
 * Response:
 * {
 *   family: {
 *     id: string,
 *     name: string,
 *     description: string | null,
 *     currency: string,
 *     timezone: string,
 *     language: string,
 *     dateFormat: string,
 *     budgetAlerts: boolean,
 *     goalReminders: boolean,
 *     weeklyReport: boolean,
 *     monthlyReport: boolean,
 *     emailNotif: boolean,
 *     defaultBudgetAlert: number | null,
 *     createdAt: string,
 *     updatedAt: string,
 *     _count: {
 *       members: number,
 *       wallets: number,
 *       categories: number
 *     }
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

    // 2. Get family settings
    const family = await prisma.family.findUnique({
      where: { id: session.familyId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            members: true,
            wallets: true,
            categories: true,
            transactions: true,
            budgets: true,
            goals: true,
          },
        },
      },
    });

    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    return NextResponse.json({ family });
  } catch (error) {
    console.error("GET /api/family/settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch family settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/family/settings
 *
 * Update family settings and preferences (Admin only)
 *
 * Request body:
 * {
 *   name?: string,
 *   description?: string | null,
 *   currency?: string,
 *   timezone?: string,
 *   language?: 'id' | 'en',
 *   dateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD',
 *   budgetAlerts?: boolean,
 *   goalReminders?: boolean,
 *   weeklyReport?: boolean,
 *   monthlyReport?: boolean,
 *   emailNotif?: boolean,
 *   defaultBudgetAlert?: number | null
 * }
 *
 * Response:
 * {
 *   family: {...}
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    // 1. Verify authentication
    const session = await getCurrentSession();
    if (!session?.userId || !session?.familyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Check if user is ADMIN
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only family admin can update settings" },
        { status: 403 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const validatedData = FamilySettingsSchema.parse(body);

    // 4. Get old family data for audit log
    const oldFamily = await prisma.family.findUnique({
      where: { id: session.familyId },
    });

    if (!oldFamily) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    // 5. Update family settings (only name and description for now)
    const { name, description } = validatedData;
    const updatedFamily = await prisma.family.update({
      where: { id: session.familyId },
      data: { name, description },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 6. Create audit log
    const changes: Record<string, any> = {};
    if (name && oldFamily.name !== name) {
      changes.name = { old: oldFamily.name, new: name };
    }
    if (description !== undefined && oldFamily.description !== description) {
      changes.description = { old: oldFamily.description, new: description };
    }

    if (Object.keys(changes).length > 0) {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          familyId: session.familyId,
          action: "UPDATE_FAMILY_SETTINGS",
          entityType: "Family",
          entityId: session.familyId,
          changes: JSON.stringify(changes),
        },
      });
    }

    return NextResponse.json({ family: updatedFamily });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("PUT /api/family/settings error:", error);
    return NextResponse.json(
      { error: "Failed to update family settings" },
      { status: 500 }
    );
  }
}
