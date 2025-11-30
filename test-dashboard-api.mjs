#!/usr/bin/env node

/**
 * Test script for Dashboard Stats API
 *
 * Usage: node test-dashboard-api.mjs
 */

const BASE_URL = "http://localhost:3000";

// Demo credentials
const CREDENTIALS = {
  email: "admin@demo.com",
  password: "admin123",
};

/**
 * Login and get auth token
 */
async function login() {
  console.log("🔐 Logging in...");

  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(CREDENTIALS),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Login failed: ${error.error || response.statusText}`);
  }

  // Extract cookie from response headers
  const setCookie = response.headers.get("set-cookie");

  const data = await response.json();
  console.log("✅ Login successful:", data.user.name);

  return setCookie;
}

/**
 * Test dashboard stats API
 */
async function testDashboardStats(cookie) {
  console.log("\n📊 Testing dashboard stats API...\n");

  // Test 1: Get current month stats
  console.log("Test 1: Current month stats (default)");
  const response1 = await fetch(`${BASE_URL}/api/dashboard/stats`, {
    headers: {
      Cookie: cookie,
    },
  });

  if (!response1.ok) {
    const error = await response1.json();
    throw new Error(
      `API request failed: ${error.error || response1.statusText}`
    );
  }

  const data1 = await response1.json();
  console.log("✅ Response received");
  console.log(
    "   Date Range:",
    data1.dateRange.startDate.substring(0, 10),
    "to",
    data1.dateRange.endDate.substring(0, 10)
  );
  console.log("   Summary:");
  console.log(
    "     - Total Income:",
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(data1.summary.totalIncome)
  );
  console.log(
    "     - Total Expense:",
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(data1.summary.totalExpense)
  );
  console.log(
    "     - Balance:",
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(data1.summary.balance)
  );
  console.log("     - Transaction Count:", data1.summary.transactionCount);

  console.log(
    "   Category Breakdown:",
    data1.categoryBreakdown.length,
    "categories"
  );
  if (data1.categoryBreakdown.length > 0) {
    data1.categoryBreakdown.slice(0, 3).forEach((cat, idx) => {
      console.log(
        `     ${idx + 1}. ${cat.categoryIcon} ${
          cat.categoryName
        }: ${new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
        }).format(cat.amount)} (${cat.percentage.toFixed(1)}%)`
      );
    });
  }

  console.log("   Budget Status:", data1.budgetStatus.length, "budgets");
  if (data1.budgetStatus.length > 0) {
    data1.budgetStatus.slice(0, 3).forEach((budget, idx) => {
      console.log(
        `     ${idx + 1}. ${budget.categoryIcon} ${
          budget.categoryName
        }: ${budget.percentage.toFixed(1)}% (${budget.status})`
      );
    });
  }

  console.log("   Net Worth:");
  console.log(
    "     - Total Assets:",
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(data1.netWorth.totalAssets)
  );
  console.log(
    "     - Total Liabilities:",
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(data1.netWorth.totalLiabilities)
  );
  console.log(
    "     - Net Worth:",
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(data1.netWorth.netWorth)
  );

  console.log("   Monthly Trend:", data1.monthlyTrend.length, "months");
  if (data1.monthlyTrend.length > 0) {
    console.log("     Last 3 months:");
    data1.monthlyTrend.slice(-3).forEach((month) => {
      const income = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(month.income);
      const expense = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(month.expense);
      console.log(`     ${month.month}: Income ${income}, Expense ${expense}`);
    });
  }

  console.log("   Recent Transactions:", data1.recentTransactions.length);
  if (data1.recentTransactions.length > 0) {
    console.log("     Last 3:");
    data1.recentTransactions.slice(0, 3).forEach((txn, idx) => {
      const amount = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(txn.amount);
      const type = txn.type === "INCOME" ? "💰" : "💸";
      console.log(`     ${idx + 1}. ${type} ${txn.description} - ${amount}`);
    });
  }

  // Test 2: Custom date range (last 3 months)
  console.log("\n\nTest 2: Custom date range (last 3 months)");
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

  const response2 = await fetch(
    `${BASE_URL}/api/dashboard/stats?startDate=${threeMonthsAgo.toISOString()}&endDate=${now.toISOString()}`,
    {
      headers: {
        Cookie: cookie,
      },
    }
  );

  if (!response2.ok) {
    const error = await response2.json();
    throw new Error(
      `API request failed: ${error.error || response2.statusText}`
    );
  }

  const data2 = await response2.json();
  console.log("✅ Response received");
  console.log(
    "   Date Range:",
    data2.dateRange.startDate.substring(0, 10),
    "to",
    data2.dateRange.endDate.substring(0, 10)
  );
  console.log("   Summary:");
  console.log(
    "     - Total Income:",
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(data2.summary.totalIncome)
  );
  console.log(
    "     - Total Expense:",
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(data2.summary.totalExpense)
  );
  console.log(
    "     - Balance:",
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(data2.summary.balance)
  );

  console.log("\n✅ All tests passed!");
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log("🚀 Starting Dashboard Stats API Test\n");

    const cookie = await login();
    await testDashboardStats(cookie);

    console.log("\n🎉 Test completed successfully!\n");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    process.exit(1);
  }
}

main();
