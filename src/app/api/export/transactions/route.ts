import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireFamily } from "@/lib/auth";

/**
 * GET /api/export/transactions
 *
 * Export transactions to Excel file
 *
 * Query params:
 * - startDate?: ISO date string (filter from this date)
 * - endDate?: ISO date string (filter until this date)
 * - type?: INCOME | EXPENSE (filter by transaction type)
 * - categoryId?: UUID (filter by category)
 * - walletId?: UUID (filter by wallet)
 *
 * Response:
 * Excel file download with Content-Disposition header
 */
export async function GET(request: NextRequest) {
  try {
    // Get current session
    const session = await requireAuth();

    // Ensure user has a family
    await requireFamily(session);

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const type = searchParams.get("type");
    const categoryId = searchParams.get("categoryId");
    const walletId = searchParams.get("walletId");

    // Build where clause
    const where: {
      familyId: string;
      date?: { gte?: Date; lte?: Date };
      type?: "INCOME" | "EXPENSE";
      categoryId?: string;
      fromWalletId?: string;
    } = {
      familyId: session.familyId!,
    };

    // Add date filters
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    // Add type filter
    if (type === "INCOME" || type === "EXPENSE") {
      where.type = type;
    }

    // Add category filter
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Add wallet filter
    if (walletId) {
      where.fromWalletId = walletId;
    }

    // Fetch transactions with related data
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: {
          select: {
            name: true,
            icon: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        fromWallet: {
          select: {
            name: true,
          },
        },
        toWallet: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    // Prepare data for Excel
    type ExcelRow = {
      Tanggal: string;
      Deskripsi: string;
      Kategori: string;
      Anggota: string;
      Tipe: string;
      "Dompet Sumber": string;
      "Dompet Tujuan": string;
      Jumlah: number | string;
    };

    const excelData: ExcelRow[] = transactions.map(
      (transaction: (typeof transactions)[0]) => ({
        Tanggal: new Date(transaction.date).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        Deskripsi: transaction.description || "-",
        Kategori: transaction.category
          ? `${transaction.category.icon || ""} ${
              transaction.category.name
            }`.trim()
          : "-",
        Anggota: transaction.user?.name || transaction.user?.email || "-",
        Tipe: transaction.type === "INCOME" ? "Pemasukan" : "Pengeluaran",
        "Dompet Sumber": transaction.fromWallet?.name || "-",
        "Dompet Tujuan": transaction.toWallet?.name || "-",
        Jumlah: Number(transaction.amount),
      })
    );

    // Calculate summary
    const totalIncome = transactions
      .filter((t: (typeof transactions)[0]) => t.type === "INCOME")
      .reduce(
        (sum: number, t: (typeof transactions)[0]) => sum + Number(t.amount),
        0
      );

    const totalExpense = transactions
      .filter((t: (typeof transactions)[0]) => t.type === "EXPENSE")
      .reduce(
        (sum: number, t: (typeof transactions)[0]) => sum + Number(t.amount),
        0
      );

    const netAmount = totalIncome - totalExpense;

    // Add summary rows
    const emptyRow: ExcelRow = {
      Tanggal: "",
      Deskripsi: "",
      Kategori: "",
      Anggota: "",
      Tipe: "",
      "Dompet Sumber": "",
      "Dompet Tujuan": "",
      Jumlah: "",
    };

    const incomeRow: ExcelRow = {
      Tanggal: "",
      Deskripsi: "",
      Kategori: "",
      Anggota: "",
      Tipe: "",
      "Dompet Sumber": "",
      "Dompet Tujuan": "Total Pemasukan:",
      Jumlah: totalIncome,
    };

    const expenseRow: ExcelRow = {
      Tanggal: "",
      Deskripsi: "",
      Kategori: "",
      Anggota: "",
      Tipe: "",
      "Dompet Sumber": "",
      "Dompet Tujuan": "Total Pengeluaran:",
      Jumlah: totalExpense,
    };

    const netRow: ExcelRow = {
      Tanggal: "",
      Deskripsi: "",
      Kategori: "",
      Anggota: "",
      Tipe: "",
      "Dompet Sumber": "",
      "Dompet Tujuan": "Saldo Bersih:",
      Jumlah: netAmount,
    };

    excelData.push(emptyRow, incomeRow, expenseRow, netRow);

    // Create worksheet from data
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 15 }, // Tanggal
      { wch: 30 }, // Deskripsi
      { wch: 20 }, // Kategori
      { wch: 25 }, // Anggota
      { wch: 12 }, // Tipe
      { wch: 20 }, // Dompet Sumber
      { wch: 20 }, // Dompet Tujuan
      { wch: 18 }, // Jumlah
    ];
    worksheet["!cols"] = columnWidths;

    // Create metadata sheet
    const metaData = [
      { Informasi: "Diekspor pada", Nilai: new Date().toLocaleString("id-ID") },
      { Informasi: "Total Transaksi", Nilai: transactions.length },
      {
        Informasi: "Rentang Tanggal",
        Nilai:
          startDate && endDate
            ? `${new Date(startDate).toLocaleDateString("id-ID")} - ${new Date(
                endDate
              ).toLocaleDateString("id-ID")}`
            : "Semua Tanggal",
      },
      { Informasi: "Filter Tipe", Nilai: type || "Semua" },
      { Informasi: "Total Pemasukan", Nilai: totalIncome },
      { Informasi: "Total Pengeluaran", Nilai: totalExpense },
      { Informasi: "Saldo Bersih", Nilai: netAmount },
    ];

    const metaWorksheet = XLSX.utils.json_to_sheet(metaData);
    metaWorksheet["!cols"] = [{ wch: 25 }, { wch: 40 }];

    // Create workbook and add worksheets
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transaksi");
    XLSX.utils.book_append_sheet(workbook, metaWorksheet, "Info");

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Create filename with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    const filename = `transaksi-${timestamp}.xlsx`;

    // Return Excel file as response
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": excelBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Export transactions error:", error);

    return NextResponse.json(
      {
        error: "Terjadi kesalahan saat mengekspor transaksi",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
