import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create a demo family
  const family = await prisma.family.create({
    data: {
      name: "Keluarga Demo",
      description: "Keluarga demo untuk testing aplikasi",
    },
  });
  console.log("✅ Created demo family:", family.name);

  // Create admin user
  const hashedPassword = await hash("admin123", 10);
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@demo.com",
      name: "Admin Demo",
      password: hashedPassword,
      role: "ADMIN",
      familyId: family.id,
    },
  });
  console.log("✅ Created admin user:", adminUser.email);

  // Create member user
  const memberUser = await prisma.user.create({
    data: {
      email: "member@demo.com",
      name: "Member Demo",
      password: hashedPassword,
      role: "MEMBER",
      familyId: family.id,
    },
  });
  console.log("✅ Created member user:", memberUser.email);

  // Create wallets
  const wallets = await prisma.wallet.createMany({
    data: [
      {
        name: "BCA - Ayah",
        type: "BANK",
        balance: 5000000,
        familyId: family.id,
        color: "#0066CC",
      },
      {
        name: "GoPay - Ibu",
        type: "E_WALLET",
        balance: 500000,
        familyId: family.id,
        color: "#00AA13",
      },
      {
        name: "Cash",
        type: "CASH",
        balance: 1000000,
        familyId: family.id,
        color: "#6B7280",
      },
    ],
  });
  console.log("✅ Created", wallets.count, "wallets");

  // Get created wallets
  const walletList = await prisma.wallet.findMany({
    where: { familyId: family.id },
  });

  // Create categories for INCOME
  const incomeCategories = await prisma.category.createMany({
    data: [
      {
        name: "Gaji",
        type: "INCOME",
        familyId: family.id,
        icon: "wallet",
        color: "#10B981",
      },
      {
        name: "Bonus",
        type: "INCOME",
        familyId: family.id,
        icon: "gift",
        color: "#8B5CF6",
      },
      {
        name: "Investasi",
        type: "INCOME",
        familyId: family.id,
        icon: "trending-up",
        color: "#3B82F6",
      },
      {
        name: "Lain-lain",
        type: "INCOME",
        familyId: family.id,
        icon: "plus-circle",
        color: "#6B7280",
      },
    ],
  });
  console.log("✅ Created", incomeCategories.count, "income categories");

  // Create categories for EXPENSE
  const expenseCategories = await prisma.category.createMany({
    data: [
      {
        name: "Makanan & Minuman",
        type: "EXPENSE",
        familyId: family.id,
        icon: "utensils",
        color: "#EF4444",
      },
      {
        name: "Transportasi",
        type: "EXPENSE",
        familyId: family.id,
        icon: "car",
        color: "#F59E0B",
      },
      {
        name: "Belanja",
        type: "EXPENSE",
        familyId: family.id,
        icon: "shopping-cart",
        color: "#EC4899",
      },
      {
        name: "Pendidikan",
        type: "EXPENSE",
        familyId: family.id,
        icon: "book",
        color: "#8B5CF6",
      },
      {
        name: "Kesehatan",
        type: "EXPENSE",
        familyId: family.id,
        icon: "heart",
        color: "#EF4444",
      },
      {
        name: "Hiburan",
        type: "EXPENSE",
        familyId: family.id,
        icon: "film",
        color: "#F59E0B",
      },
      {
        name: "Tagihan",
        type: "EXPENSE",
        familyId: family.id,
        icon: "file-text",
        color: "#6B7280",
      },
      {
        name: "Lain-lain",
        type: "EXPENSE",
        familyId: family.id,
        icon: "more-horizontal",
        color: "#9CA3AF",
      },
    ],
  });
  console.log("✅ Created", expenseCategories.count, "expense categories");

  // Get created categories
  const categoryList = await prisma.category.findMany({
    where: { familyId: family.id },
  });

  // Create sample transactions
  const foodCategory = categoryList.find((c: { name: string }) => c.name === "Makanan & Minuman");
  const salaryCategory = categoryList.find((c: { name: string }) => c.name === "Gaji");

  if (foodCategory && salaryCategory) {
    await prisma.transaction.createMany({
      data: [
        {
          amount: 5000000,
          type: "INCOME",
          description: "Gaji Bulanan",
          familyId: family.id,
          userId: adminUser.id,
          categoryId: salaryCategory.id,
          fromWalletId: walletList[0].id,
          date: new Date(),
        },
        {
          amount: 150000,
          type: "EXPENSE",
          description: "Belanja groceries",
          familyId: family.id,
          userId: memberUser.id,
          categoryId: foodCategory.id,
          fromWalletId: walletList[0].id,
          date: new Date(),
        },
        {
          amount: 50000,
          type: "EXPENSE",
          description: "Makan siang",
          familyId: family.id,
          userId: adminUser.id,
          categoryId: foodCategory.id,
          fromWalletId: walletList[1].id,
          date: new Date(),
        },
      ],
    });
    console.log("✅ Created sample transactions");
  }

  // Create sample asset
  await prisma.asset.create({
    data: {
      name: "Rumah Jakarta",
      type: "PROPERTY",
      value: 500000000,
      acquisitionDate: new Date("2020-01-01"),
      description: "Rumah tinggal di Jakarta Selatan",
      familyId: family.id,
    },
  });
  console.log("✅ Created sample asset");

  // Create sample liability
  await prisma.liability.create({
    data: {
      name: "KPR Rumah",
      type: "MORTGAGE",
      amount: 300000000,
      remainingAmount: 250000000,
      interestRate: 8.5,
      creditor: "Bank Mandiri",
      dueDate: new Date("2035-01-01"),
      startDate: new Date("2020-01-01"),
      description: "KPR Rumah Jakarta 15 tahun",
      familyId: family.id,
    },
  });
  console.log("✅ Created sample liability");

  // Create sample goal
  const goal = await prisma.goal.create({
    data: {
      name: "Liburan Keluarga ke Bali",
      description: "Target liburan keluarga tahun depan",
      targetAmount: 20000000,
      currentAmount: 5000000,
      deadline: new Date("2026-12-31"),
      status: "ACTIVE",
      familyId: family.id,
    },
  });
  console.log("✅ Created sample goal");

  // Create goal contributions
  await prisma.goalContribution.createMany({
    data: [
      {
        amount: 3000000,
        description: "Kontribusi awal",
        goalId: goal.id,
        userId: adminUser.id,
      },
      {
        amount: 2000000,
        description: "Kontribusi bulan ini",
        goalId: goal.id,
        userId: memberUser.id,
      },
    ],
  });
  console.log("✅ Created sample goal contributions");

  // Create sample budget
  const startDate = new Date();
  startDate.setDate(1); // First day of month
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);
  endDate.setDate(0); // Last day of month

  if (foodCategory) {
    await prisma.budget.create({
      data: {
        name: "Budget Makanan Bulanan",
        amount: 3000000,
        spent: 200000,
        period: "MONTHLY",
        startDate: startDate,
        endDate: endDate,
        alertThreshold: 80,
        familyId: family.id,
        categoryId: foodCategory.id,
        createdById: adminUser.id,
      },
    });
    console.log("✅ Created sample budget");
  }

  console.log("\n🎉 Database seeding completed!");
  console.log("\n📝 Demo credentials:");
  console.log("   Admin: admin@demo.com / admin123");
  console.log("   Member: member@demo.com / admin123");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
