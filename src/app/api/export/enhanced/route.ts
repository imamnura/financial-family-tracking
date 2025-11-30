import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import {
  getMonthInt,
  monthIntToDate,
  getMonthDateRange,
} from "@/lib/date-helpers";

/**
 * GET /api/export/enhanced
 * Enhanced export with PDF and Excel support
 * Query params:
 * - format: pdf | excel
 * - type: transactions | budget | report
 * - startDate: ISO date
 * - endDate: ISO date
 * - categoryId: optional filter
 * - walletId: optional filter
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "excel";
    const type = searchParams.get("type") || "transactions";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const categoryId = searchParams.get("categoryId");
    const walletId = searchParams.get("walletId");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate required" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get family info
    const family = await prisma.family.findUnique({
      where: { id: user.familyId },
    });

    if (format === "excel") {
      if (type === "transactions") {
        return await exportTransactionsExcel(
          user.familyId,
          start,
          end,
          categoryId,
          walletId,
          family?.name || "Family"
        );
      } else if (type === "budget") {
        return await exportBudgetExcel(
          user.familyId,
          start,
          end,
          family?.name || "Family"
        );
      } else if (type === "report") {
        return await exportMonthlyReportExcel(
          user.familyId,
          start,
          end,
          family?.name || "Family"
        );
      }
    } else if (format === "pdf") {
      if (type === "transactions") {
        return await exportTransactionsPDF(
          user.familyId,
          start,
          end,
          categoryId,
          walletId,
          family?.name || "Family"
        );
      } else if (type === "budget") {
        return await exportBudgetPDF(
          user.familyId,
          start,
          end,
          family?.name || "Family"
        );
      } else if (type === "report") {
        return await exportMonthlyReportPDF(
          user.familyId,
          start,
          end,
          family?.name || "Family"
        );
      }
    }

    return NextResponse.json(
      { error: "Invalid format or type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Export Enhanced] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    );
  }
}

/**
 * Export transactions to Excel
 */
async function exportTransactionsExcel(
  familyId: string,
  startDate: Date,
  endDate: Date,
  categoryId: string | null,
  walletId: string | null,
  familyName: string
) {
  const where: any = {
    familyId,
    date: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (categoryId) where.categoryId = categoryId;
  if (walletId) {
    where.OR = [{ fromWalletId: walletId }, { toWalletId: walletId }];
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      category: true,
      fromWallet: true,
      toWallet: true,
      user: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Transactions");

  // Header
  worksheet.mergeCells("A1:H1");
  worksheet.getCell("A1").value = `${familyName} - Transaction Report`;
  worksheet.getCell("A1").font = { size: 16, bold: true };
  worksheet.getCell("A1").alignment = { horizontal: "center" };

  worksheet.getCell(
    "A2"
  ).value = `Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  worksheet.getCell("A2").alignment = { horizontal: "center" };
  worksheet.mergeCells("A2:H2");

  // Table headers
  const headers = [
    "Date",
    "Type",
    "Category",
    "Description",
    "Amount",
    "From Wallet",
    "To Wallet",
    "Created By",
  ];

  worksheet.addRow([]);
  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  headerRow.font = { color: { argb: "FFFFFFFF" }, bold: true };

  // Data rows
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach((tx) => {
    const row = worksheet.addRow([
      tx.date.toLocaleDateString(),
      tx.type,
      tx.category?.name || "-",
      tx.description,
      tx.amount,
      tx.fromWallet?.name || "-",
      tx.toWallet?.name || "-",
      tx.user.name,
    ]);

    // Format amount
    row.getCell(5).numFmt = "#,##0";

    // Color code by type
    if (tx.type === "INCOME") {
      totalIncome += Number(tx.amount);
      row.getCell(2).font = { color: { argb: "FF00B050" } };
    } else if (tx.type === "EXPENSE") {
      totalExpense += Number(tx.amount);
      row.getCell(2).font = { color: { argb: "FFFF0000" } };
    }
  });

  // Summary
  worksheet.addRow([]);
  const summaryRow = worksheet.addRow(["", "", "", "SUMMARY", "", "", "", ""]);
  summaryRow.font = { bold: true };

  worksheet.addRow(["", "", "", "Total Income", totalIncome, "", "", ""]);
  worksheet.addRow(["", "", "", "Total Expense", totalExpense, "", "", ""]);
  worksheet.addRow(["", "", "", "Net", totalIncome - totalExpense, "", "", ""]);

  // Format summary amounts
  worksheet.getCell(`E${worksheet.rowCount - 2}`).numFmt = "#,##0";
  worksheet.getCell(`E${worksheet.rowCount - 1}`).numFmt = "#,##0";
  worksheet.getCell(`E${worksheet.rowCount}`).numFmt = "#,##0";

  // Column widths
  worksheet.columns = [
    { width: 15 },
    { width: 12 },
    { width: 20 },
    { width: 30 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
  ];

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="transactions_${
        startDate.toISOString().split("T")[0]
      }_${endDate.toISOString().split("T")[0]}.xlsx"`,
    },
  });
}

/**
 * Export budget to Excel
 */
async function exportBudgetExcel(
  familyId: string,
  startDate: Date,
  endDate: Date,
  familyName: string
) {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  const startMonthInt = getMonthInt(startDate);
  const endMonthInt = getMonthInt(endDate);

  const budgets = await prisma.budget.findMany({
    where: {
      familyId,
      year: {
        gte: startYear,
        lte: endYear,
      },
      month: {
        gte: startMonthInt,
        lte: endMonthInt,
      },
    },
    include: {
      category: true,
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Budget");

  // Header
  worksheet.mergeCells("A1:F1");
  worksheet.getCell("A1").value = `${familyName} - Budget Report`;
  worksheet.getCell("A1").font = { size: 16, bold: true };
  worksheet.getCell("A1").alignment = { horizontal: "center" };

  worksheet.getCell(
    "A2"
  ).value = `Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  worksheet.getCell("A2").alignment = { horizontal: "center" };
  worksheet.mergeCells("A2:F2");

  // Table headers
  const headers = [
    "Month",
    "Category",
    "Budget",
    "Spent",
    "Remaining",
    "% Used",
  ];

  worksheet.addRow([]);
  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  headerRow.font = { color: { argb: "FFFFFFFF" }, bold: true };

  // Data rows
  for (const budget of budgets) {
    if (!budget.month || !budget.year) continue;

    const { start: monthStart, end: monthEnd } = getMonthDateRange(
      budget.month
    );

    const spent = await prisma.transaction.aggregate({
      where: {
        familyId,
        categoryId: budget.categoryId,
        type: "EXPENSE",
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _sum: { amount: true },
    });

    const spentAmount = Number(spent._sum?.amount || 0);
    const remaining = Number(budget.amount) - spentAmount;
    const percentUsed = (spentAmount / Number(budget.amount)) * 100;

    const monthDate = monthIntToDate(budget.month);
    const row = worksheet.addRow([
      monthDate.toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
      }),
      budget.category?.name || "Uncategorized",
      budget.amount,
      spentAmount,
      remaining,
      percentUsed,
    ]);

    // Format numbers
    row.getCell(3).numFmt = "#,##0";
    row.getCell(4).numFmt = "#,##0";
    row.getCell(5).numFmt = "#,##0";
    row.getCell(6).numFmt = "0.00%";

    // Color code remaining
    if (remaining < 0) {
      row.getCell(5).font = { color: { argb: "FFFF0000" } };
    }
  }

  // Column widths
  worksheet.columns = [
    { width: 20 },
    { width: 20 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 12 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="budget_${
        startDate.toISOString().split("T")[0]
      }_${endDate.toISOString().split("T")[0]}.xlsx"`,
    },
  });
}

/**
 * Export monthly report to Excel
 */
async function exportMonthlyReportExcel(
  familyId: string,
  startDate: Date,
  endDate: Date,
  familyName: string
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Monthly Report");

  // Header
  worksheet.mergeCells("A1:D1");
  worksheet.getCell("A1").value = `${familyName} - Monthly Financial Report`;
  worksheet.getCell("A1").font = { size: 16, bold: true };
  worksheet.getCell("A1").alignment = { horizontal: "center" };

  worksheet.getCell(
    "A2"
  ).value = `Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  worksheet.getCell("A2").alignment = { horizontal: "center" };
  worksheet.mergeCells("A2:D2");

  worksheet.addRow([]);

  // Get monthly data
  const months: Date[] = [];
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    months.push(new Date(currentDate));
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // Summary table
  const summaryHeaders = ["Month", "Income", "Expense", "Net Savings"];
  worksheet.addRow([]);
  const headerRow = worksheet.addRow(summaryHeaders);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  headerRow.font = { color: { argb: "FFFFFFFF" }, bold: true };

  for (const month of months) {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    const income = await prisma.transaction.aggregate({
      where: {
        familyId,
        type: "INCOME",
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    });

    const expense = await prisma.transaction.aggregate({
      where: {
        familyId,
        type: "EXPENSE",
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    });

    const incomeAmount = Number(income._sum.amount || 0);
    const expenseAmount = Number(expense._sum.amount || 0);
    const net = incomeAmount - expenseAmount;

    const row = worksheet.addRow([
      month.toLocaleDateString("id-ID", { year: "numeric", month: "long" }),
      incomeAmount,
      expenseAmount,
      net,
    ]);

    row.getCell(2).numFmt = "#,##0";
    row.getCell(3).numFmt = "#,##0";
    row.getCell(4).numFmt = "#,##0";

    if (net < 0) {
      row.getCell(4).font = { color: { argb: "FFFF0000" } };
    } else {
      row.getCell(4).font = { color: { argb: "FF00B050" } };
    }
  }

  worksheet.columns = [
    { width: 20 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="monthly_report_${
        startDate.toISOString().split("T")[0]
      }.xlsx"`,
    },
  });
}

/**
 * Export transactions to PDF
 */
async function exportTransactionsPDF(
  familyId: string,
  startDate: Date,
  endDate: Date,
  categoryId: string | null,
  walletId: string | null,
  familyName: string
) {
  const where: any = {
    familyId,
    date: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (categoryId) where.categoryId = categoryId;
  if (walletId) {
    where.OR = [{ fromWalletId: walletId }, { toWalletId: walletId }];
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      category: true,
      fromWallet: true,
      toWallet: true,
      user: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk) => chunks.push(chunk));

  // Header
  doc.fontSize(20).text(`${familyName}`, { align: "center" });
  doc.fontSize(16).text("Transaction Report", { align: "center" });
  doc.moveDown();
  doc
    .fontSize(10)
    .text(
      `Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      { align: "center" }
    );
  doc.moveDown();

  // Summary
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach((tx) => {
    if (tx.type === "INCOME") totalIncome += Number(tx.amount);
    else if (tx.type === "EXPENSE") totalExpense += Number(tx.amount);
  });

  doc.fontSize(12).text("Summary:", { underline: true });
  doc.fontSize(10);
  doc.text(`Total Income: Rp ${totalIncome.toLocaleString("id-ID")}`);
  doc.text(`Total Expense: Rp ${totalExpense.toLocaleString("id-ID")}`);
  doc.text(`Net: Rp ${(totalIncome - totalExpense).toLocaleString("id-ID")}`);
  doc.moveDown();

  // Transactions
  doc.fontSize(12).text("Transactions:", { underline: true });
  doc.moveDown(0.5);

  transactions.forEach((tx, index) => {
    if (index > 0 && index % 15 === 0) {
      doc.addPage();
    }

    doc.fontSize(10);
    doc.text(
      `${tx.date.toLocaleDateString()} - ${tx.type} - ${
        tx.category?.name || "-"
      }`
    );
    doc.text(`  ${tx.description}`);
    doc.text(`  Amount: Rp ${Number(tx.amount).toLocaleString("id-ID")}`);
    doc.text(`  By: ${tx.user.name}`);
    doc.moveDown(0.5);
  });

  doc.end();

  return new Promise<NextResponse>((resolve) => {
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      resolve(
        new NextResponse(buffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="transactions_${
              startDate.toISOString().split("T")[0]
            }.pdf"`,
          },
        })
      );
    });
  });
}

/**
 * Export budget to PDF
 */
async function exportBudgetPDF(
  familyId: string,
  startDate: Date,
  endDate: Date,
  familyName: string
) {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  const startMonthInt = getMonthInt(startDate);
  const endMonthInt = getMonthInt(endDate);

  const budgets = await prisma.budget.findMany({
    where: {
      familyId,
      year: {
        gte: startYear,
        lte: endYear,
      },
      month: {
        gte: startMonthInt,
        lte: endMonthInt,
      },
    },
    include: {
      category: true,
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk) => chunks.push(chunk));

  doc.fontSize(20).text(`${familyName}`, { align: "center" });
  doc.fontSize(16).text("Budget Report", { align: "center" });
  doc.moveDown();
  doc
    .fontSize(10)
    .text(
      `Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      { align: "center" }
    );
  doc.moveDown(2);

  for (const budget of budgets) {
    if (!budget.month || !budget.year) continue;

    const { start: monthStart, end: monthEnd } = getMonthDateRange(
      budget.month
    );

    const spent = await prisma.transaction.aggregate({
      where: {
        familyId,
        categoryId: budget.categoryId,
        type: "EXPENSE",
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _sum: { amount: true },
    });

    const spentAmount = Number(spent._sum?.amount || 0);
    const remaining = Number(budget.amount) - spentAmount;
    const percentUsed = (spentAmount / Number(budget.amount)) * 100;

    const monthDate = monthIntToDate(budget.month);
    doc.fontSize(12).text(
      monthDate.toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
      }),
      { underline: true }
    );
    doc.fontSize(10);
    doc.text(`Category: ${budget.category?.name || "Uncategorized"}`);
    doc.text(`Budget: Rp ${Number(budget.amount).toLocaleString("id-ID")}`);
    doc.text(`Spent: Rp ${spentAmount.toLocaleString("id-ID")}`);
    doc.text(`Remaining: Rp ${remaining.toLocaleString("id-ID")}`);
    doc.text(`Usage: ${percentUsed.toFixed(1)}%`);
    doc.moveDown();
  }

  doc.end();

  return new Promise<NextResponse>((resolve) => {
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      resolve(
        new NextResponse(buffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="budget_${
              startDate.toISOString().split("T")[0]
            }.pdf"`,
          },
        })
      );
    });
  });
}

/**
 * Export monthly report to PDF
 */
async function exportMonthlyReportPDF(
  familyId: string,
  startDate: Date,
  endDate: Date,
  familyName: string
) {
  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk) => chunks.push(chunk));

  doc.fontSize(20).text(`${familyName}`, { align: "center" });
  doc.fontSize(16).text("Monthly Financial Report", { align: "center" });
  doc.moveDown();
  doc
    .fontSize(10)
    .text(
      `Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      { align: "center" }
    );
  doc.moveDown(2);

  const months: Date[] = [];
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    months.push(new Date(currentDate));
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  for (const month of months) {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    const income = await prisma.transaction.aggregate({
      where: {
        familyId,
        type: "INCOME",
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    });

    const expense = await prisma.transaction.aggregate({
      where: {
        familyId,
        type: "EXPENSE",
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    });

    const incomeAmount = Number(income._sum.amount || 0);
    const expenseAmount = Number(expense._sum.amount || 0);
    const net = incomeAmount - expenseAmount;
    const savingsRate =
      incomeAmount > 0 ? ((net / incomeAmount) * 100).toFixed(1) : "0.0";

    doc
      .fontSize(14)
      .text(
        month.toLocaleDateString("id-ID", { year: "numeric", month: "long" }),
        { underline: true }
      );
    doc.fontSize(10);
    doc.text(`Income: Rp ${incomeAmount.toLocaleString("id-ID")}`);
    doc.text(`Expense: Rp ${expenseAmount.toLocaleString("id-ID")}`);
    doc.text(`Net Savings: Rp ${net.toLocaleString("id-ID")}`);
    doc.text(`Savings Rate: ${savingsRate}%`);
    doc.moveDown();
  }

  doc.end();

  return new Promise<NextResponse>((resolve) => {
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      resolve(
        new NextResponse(buffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="monthly_report_${
              startDate.toISOString().split("T")[0]
            }.pdf"`,
          },
        })
      );
    });
  });
}
