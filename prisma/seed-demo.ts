import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🎬 Seeding demo data for Financial Family Tracking...\n");

  // Clean up existing data
  console.log("🧹 Cleaning up existing data...");
  try {
    await prisma.transaction.deleteMany();
    await prisma.recurringTransaction.deleteMany();
    await prisma.transactionTemplate.deleteMany();
    await prisma.budget.deleteMany();
    await prisma.category.deleteMany();
    await prisma.wallet.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.user.updateMany({ data: { familyId: null } });
    await prisma.family.deleteMany();
    await prisma.user.deleteMany();
    console.log("✅ Cleanup complete\n");
  } catch (error) {
    console.log("⚠️  Cleanup skipped (database might be empty)\n");
  }

  // Create Users
  console.log("👥 Creating users...");
  const hashedPassword = await bcrypt.hash("demo123", 10);

  const budi = await prisma.user.create({
    data: {
      email: "budi@demo.com",
      name: "Budi Santoso",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  const ani = await prisma.user.create({
    data: {
      email: "ani@demo.com",
      name: "Ani Santoso",
      password: hashedPassword,
      role: "MEMBER",
    },
  });

  const rudi = await prisma.user.create({
    data: {
      email: "rudi@demo.com",
      name: "Rudi Pratama",
      password: hashedPassword,
      role: "MEMBER",
    },
  });

  console.log(`✅ Created 3 users\n`);

  // Create Family
  console.log("👨‍👩‍👧‍👦 Creating family...");
  const family = await prisma.family.create({
    data: {
      name: "Keluarga Budi",
      description: "Keluarga kecil yang bahagia",
      currency: "IDR",
    },
  });

  // Update users with familyId
  await prisma.user.update({
    where: { id: budi.id },
    data: { familyId: family.id },
  });
  await prisma.user.update({
    where: { id: ani.id },
    data: { familyId: family.id },
  });

  console.log(`✅ Created family\n`);

  // Create Categories
  console.log("📁 Creating categories...");
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: "Makanan & Minuman",
        type: "EXPENSE",
        icon: "🍔",
        color: "#ef4444",
        familyId: family.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Transport",
        type: "EXPENSE",
        icon: "🚗",
        color: "#f59e0b",
        familyId: family.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Belanja",
        type: "EXPENSE",
        icon: "🛒",
        color: "#8b5cf6",
        familyId: family.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Tagihan",
        type: "EXPENSE",
        icon: "💳",
        color: "#ef4444",
        familyId: family.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Gaji",
        type: "INCOME",
        icon: "💰",
        color: "#10b981",
        familyId: family.id,
      },
    }),
  ]);

  const [food, transport, shopping, bills, salary] = categories;
  console.log(`✅ Created ${categories.length} categories\n`);

  // Create Wallets
  console.log("💼 Creating wallets...");
  const wallets = await Promise.all([
    prisma.wallet.create({
      data: {
        name: "BCA - Budi",
        type: "BANK_ACCOUNT",
        balance: 15000000,
        icon: "🏦",
        color: "#2563eb",
        familyId: family.id,
      },
    }),
    prisma.wallet.create({
      data: {
        name: "Mandiri - Ani",
        type: "BANK_ACCOUNT",
        balance: 8000000,
        icon: "🏦",
        color: "#f59e0b",
        familyId: family.id,
      },
    }),
    prisma.wallet.create({
      data: {
        name: "Dompet Cash",
        type: "CASH",
        balance: 1500000,
        icon: "💵",
        color: "#10b981",
        familyId: family.id,
      },
    }),
  ]);

  const [bcaWallet, mandiriWallet, cashWallet] = wallets;
  console.log(`✅ Created ${wallets.length} wallets\n`);

  // Create Transactions
  console.log("💸 Creating transactions...");
  const transactions = [];
  const today = new Date();

  // Income: salary (3 months)
  for (let month = 0; month < 3; month++) {
    const salaryDate = new Date(today);
    salaryDate.setMonth(salaryDate.getMonth() - month);
    salaryDate.setDate(1);

    transactions.push({
      type: "INCOME" as const,
      amount: 10000000,
      description: `Gaji Bulan ${salaryDate.toLocaleDateString("id-ID", {
        month: "long",
      })}`,
      date: salaryDate,
      categoryId: salary.id,
      toWalletId: bcaWallet.id,
      userId: budi.id,
      familyId: family.id,
    });
  }

  // Expenses: last 30 days
  for (let day = 0; day < 30; day++) {
    const transactionDate = new Date(today);
    transactionDate.setDate(transactionDate.getDate() - day);

    // Food (daily)
    const amount = Math.floor(Math.random() * 100000) + 30000;
    transactions.push({
      type: "EXPENSE" as const,
      amount,
      description: amount > 80000 ? "Makan di restoran" : "Jajan & snack",
      date: transactionDate,
      categoryId: food.id,
      fromWalletId: cashWallet.id,
      userId: Math.random() > 0.5 ? budi.id : ani.id,
      familyId: family.id,
    });

    // Transport (every 2 days)
    if (day % 2 === 0) {
      transactions.push({
        type: "EXPENSE" as const,
        amount: Math.floor(Math.random() * 60000) + 20000,
        description: "Bensin/Grab/Parkir",
        date: transactionDate,
        categoryId: transport.id,
        fromWalletId: cashWallet.id,
        userId: budi.id,
        familyId: family.id,
      });
    }

    // Shopping (weekly)
    if (day % 7 === 0) {
      transactions.push({
        type: "EXPENSE" as const,
        amount: Math.floor(Math.random() * 400000) + 100000,
        description: "Belanja kebutuhan rumah",
        date: transactionDate,
        categoryId: shopping.id,
        fromWalletId: mandiriWallet.id,
        userId: ani.id,
        familyId: family.id,
      });
    }
  }

  // Monthly bill
  transactions.push({
    type: "EXPENSE" as const,
    amount: 1500000,
    description: "Listrik, air, internet",
    date: new Date(today.setDate(5)),
    categoryId: bills.id,
    fromWalletId: bcaWallet.id,
    userId: budi.id,
    familyId: family.id,
  });

  await prisma.transaction.createMany({ data: transactions });
  console.log(`✅ Created ${transactions.length} transactions\n`);

  // Create Budgets
  console.log("📊 Creating budgets...");
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  await Promise.all([
    prisma.budget.create({
      data: {
        name: "Budget Makanan",
        amount: 3000000,
        month: currentMonth,
        year: currentYear,
        alertThreshold: 80,
        familyId: family.id,
        categoryId: food.id,
        createdById: budi.id,
      },
    }),
    prisma.budget.create({
      data: {
        name: "Budget Transport",
        amount: 1500000,
        month: currentMonth,
        year: currentYear,
        alertThreshold: 80,
        familyId: family.id,
        categoryId: transport.id,
        createdById: budi.id,
      },
    }),
  ]);

  console.log("✅ Created 2 budgets\n");

  // Create Recurring Transactions
  console.log("🔄 Creating recurring transactions...");
  await prisma.recurringTransaction.createMany({
    data: [
      {
        name: "Tagihan Bulanan",
        type: "EXPENSE",
        amount: 1500000,
        description: "Listrik, air, internet",
        frequency: "MONTHLY",
        startDate: new Date(),
        nextDate: new Date(new Date().setDate(5)),
        categoryId: bills.id,
        fromWalletId: bcaWallet.id,
        createdById: budi.id,
        familyId: family.id,
        status: "ACTIVE",
      },
      {
        name: "Gaji Bulanan",
        type: "INCOME",
        amount: 10000000,
        description: "Gaji bulanan",
        frequency: "MONTHLY",
        startDate: new Date(),
        nextDate: new Date(new Date().setDate(1)),
        categoryId: salary.id,
        toWalletId: bcaWallet.id,
        createdById: budi.id,
        familyId: family.id,
        status: "ACTIVE",
      },
    ],
  });

  console.log("✅ Created 2 recurring transactions\n");

  // Summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 DEMO DATA SEEDING COMPLETED!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("📧 Login Credentials:");
  console.log("   Email: budi@demo.com");
  console.log("   Password: demo123");
  console.log("   Role: Admin\n");
  console.log("📊 Data Summary:");
  console.log(`   • Users: 3`);
  console.log(`   • Family: 1`);
  console.log(`   • Categories: ${categories.length}`);
  console.log(`   • Wallets: ${wallets.length}`);
  console.log(`   • Transactions: ${transactions.length}`);
  console.log(`   • Budgets: 2`);
  console.log(`   • Recurring: 2\n`);
  console.log("🚀 Run: pnpm dev");
  console.log("🌐 Open: http://localhost:3000");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
