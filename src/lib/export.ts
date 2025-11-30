import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatCurrency, formatDateTime } from "./utils";

export interface ExportTransaction {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  date: string;
  category: {
    name: string;
  };
  wallet: {
    name: string;
  };
  notes?: string | null;
}

export interface ExportOptions {
  startDate?: string;
  endDate?: string;
  type?: "ALL" | "INCOME" | "EXPENSE";
}

/**
 * Export transactions to PDF format
 */
export const exportTransactionsToPDF = (
  transactions: ExportTransaction[],
  options?: ExportOptions
) => {
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.text("Laporan Transaksi", 14, 20);

  // Add filter info
  doc.setFontSize(10);
  let yPos = 30;

  if (options?.startDate && options?.endDate) {
    doc.text(
      `Periode: ${formatDateTime(options.startDate)} - ${formatDateTime(
        options.endDate
      )}`,
      14,
      yPos
    );
    yPos += 6;
  }

  if (options?.type && options.type !== "ALL") {
    doc.text(
      `Tipe: ${options.type === "INCOME" ? "Pemasukan" : "Pengeluaran"}`,
      14,
      yPos
    );
    yPos += 6;
  }

  // Calculate totals
  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  // Add summary
  doc.text(`Total Pemasukan: ${formatCurrency(totalIncome)}`, 14, yPos);
  yPos += 6;
  doc.text(`Total Pengeluaran: ${formatCurrency(totalExpense)}`, 14, yPos);
  yPos += 6;
  doc.text(`Saldo Bersih: ${formatCurrency(netBalance)}`, 14, yPos);
  yPos += 10;

  // Create table data
  const tableData = transactions.map((t) => [
    formatDateTime(t.date),
    t.description,
    t.category.name,
    t.wallet.name,
    t.type === "INCOME" ? "Pemasukan" : "Pengeluaran",
    formatCurrency(t.amount),
  ]);

  // Add table
  autoTable(doc, {
    head: [["Tanggal", "Deskripsi", "Kategori", "Dompet", "Tipe", "Jumlah"]],
    body: tableData,
    startY: yPos,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [99, 102, 241] }, // Indigo
    columnStyles: {
      5: { halign: "right" }, // Amount column
    },
  });

  // Add footer with timestamp
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Halaman ${i} dari ${pageCount} - Dicetak pada ${formatDateTime(
        new Date().toISOString()
      )}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  // Save the PDF
  const filename = `transaksi_${new Date().getTime()}.pdf`;
  doc.save(filename);
};

/**
 * Export transactions to Excel format
 */
export const exportTransactionsToExcel = (
  transactions: ExportTransaction[],
  options?: ExportOptions
) => {
  // Create worksheet data
  const worksheetData: any[] = [];

  // Add header info
  worksheetData.push(["LAPORAN TRANSAKSI"]);
  worksheetData.push([]);

  if (options?.startDate && options?.endDate) {
    worksheetData.push([
      "Periode:",
      `${formatDateTime(options.startDate)} - ${formatDateTime(
        options.endDate
      )}`,
    ]);
  }

  if (options?.type && options.type !== "ALL") {
    worksheetData.push([
      "Tipe:",
      options.type === "INCOME" ? "Pemasukan" : "Pengeluaran",
    ]);
  }

  worksheetData.push([]);

  // Calculate totals
  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  // Add summary
  worksheetData.push(["Total Pemasukan:", totalIncome]);
  worksheetData.push(["Total Pengeluaran:", totalExpense]);
  worksheetData.push(["Saldo Bersih:", netBalance]);
  worksheetData.push([]);

  // Add table headers
  worksheetData.push([
    "Tanggal",
    "Deskripsi",
    "Kategori",
    "Dompet",
    "Tipe",
    "Jumlah",
    "Catatan",
  ]);

  // Add transaction data
  transactions.forEach((t) => {
    worksheetData.push([
      formatDateTime(t.date),
      t.description,
      t.category.name,
      t.wallet.name,
      t.type === "INCOME" ? "Pemasukan" : "Pengeluaran",
      t.amount,
      t.notes || "",
    ]);
  });

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 18 }, // Tanggal
    { wch: 30 }, // Deskripsi
    { wch: 15 }, // Kategori
    { wch: 15 }, // Dompet
    { wch: 12 }, // Tipe
    { wch: 15 }, // Jumlah
    { wch: 30 }, // Catatan
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transaksi");

  // Save the file
  const filename = `transaksi_${new Date().getTime()}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

/**
 * Export budgets to PDF format
 */
export const exportBudgetsToPDF = (budgets: any[], month: string) => {
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.text("Laporan Anggaran", 14, 20);

  // Add month info
  doc.setFontSize(10);
  const monthYear = `${month.substring(4, 6)}/${month.substring(0, 4)}`;
  doc.text(`Bulan: ${monthYear}`, 14, 30);

  // Calculate totals
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudget - totalSpent;

  // Add summary
  doc.text(`Total Anggaran: ${formatCurrency(totalBudget)}`, 14, 40);
  doc.text(`Total Terpakai: ${formatCurrency(totalSpent)}`, 14, 46);
  doc.text(`Sisa Anggaran: ${formatCurrency(totalRemaining)}`, 14, 52);

  // Create table data
  const tableData = budgets.map((b) => [
    b.category.name,
    formatCurrency(b.amount),
    formatCurrency(b.spent),
    formatCurrency(b.amount - b.spent),
    `${Math.round(b.percentage)}%`,
    b.status === "ON_TRACK"
      ? "Aman"
      : b.status === "WARNING"
      ? "Peringatan"
      : "Melebihi",
  ]);

  // Add table
  autoTable(doc, {
    head: [
      ["Kategori", "Anggaran", "Terpakai", "Sisa", "Persentase", "Status"],
    ],
    body: tableData,
    startY: 60,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [99, 102, 241] },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
  });

  // Add footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Halaman ${i} dari ${pageCount} - Dicetak pada ${formatDateTime(
        new Date().toISOString()
      )}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  // Save the PDF
  const filename = `anggaran_${month}_${new Date().getTime()}.pdf`;
  doc.save(filename);
};

/**
 * Export budgets to Excel format
 */
export const exportBudgetsToExcel = (budgets: any[], month: string) => {
  const worksheetData: any[] = [];

  // Add header
  worksheetData.push(["LAPORAN ANGGARAN"]);
  worksheetData.push([]);

  const monthYear = `${month.substring(4, 6)}/${month.substring(0, 4)}`;
  worksheetData.push(["Bulan:", monthYear]);
  worksheetData.push([]);

  // Calculate totals
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudget - totalSpent;

  // Add summary
  worksheetData.push(["Total Anggaran:", totalBudget]);
  worksheetData.push(["Total Terpakai:", totalSpent]);
  worksheetData.push(["Sisa Anggaran:", totalRemaining]);
  worksheetData.push([]);

  // Add table headers
  worksheetData.push([
    "Kategori",
    "Anggaran",
    "Terpakai",
    "Sisa",
    "Persentase",
    "Status",
  ]);

  // Add budget data
  budgets.forEach((b) => {
    worksheetData.push([
      b.category.name,
      b.amount,
      b.spent,
      b.amount - b.spent,
      `${Math.round(b.percentage)}%`,
      b.status === "ON_TRACK"
        ? "Aman"
        : b.status === "WARNING"
        ? "Peringatan"
        : "Melebihi",
    ]);
  });

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Anggaran");

  // Save the file
  const filename = `anggaran_${month}_${new Date().getTime()}.xlsx`;
  XLSX.writeFile(workbook, filename);
};
