import nodemailer from "nodemailer";

/**
 * Email configuration and helper functions
 */

// Email transporter (using Ethereal for testing)
let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize email transporter
 * Uses Ethereal.email for testing without real email account
 */
async function getTransporter() {
  if (transporter) {
    return transporter;
  }

  // For production, you would use real SMTP credentials from environment variables
  // For now, we use Ethereal for testing
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    // Production SMTP configuration
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development: Use Ethereal Email (test account)
    const testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    console.log("📧 Email transporter initialized with Ethereal");
    console.log("📧 Test account:", testAccount.user);
  }

  return transporter;
}

/**
 * Send email interface
 */
interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email function
 *
 * @param options - Email options (to, subject, html, text)
 * @returns Promise with message info
 */
export async function sendEmail(options: SendEmailOptions) {
  try {
    const emailTransporter = await getTransporter();

    const info = await emailTransporter.sendMail({
      from:
        process.env.SMTP_FROM ||
        '"Family Finance Tracker" <noreply@familyfinance.app>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log("📧 Email sent:", info.messageId);

    // For Ethereal, log the preview URL
    if (process.env.NODE_ENV !== "production" && !process.env.SMTP_HOST) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log("📧 Preview URL:", previewUrl);
      }
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info),
    };
  } catch (error) {
    console.error("❌ Email send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(userEmail: string, userName: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          h1 {
            color: #2563eb;
            font-size: 28px;
          }
          .features {
            background-color: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .feature {
            margin: 15px 0;
            padding-left: 25px;
            position: relative;
          }
          .feature:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #10b981;
            font-weight: bold;
            font-size: 18px;
          }
          .button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Selamat Datang, ${userName}! 🎉</h1>
            <p>Terima kasih telah bergabung dengan Family Finance Tracker</p>
          </div>

          <p>Kami sangat senang Anda bergabung! Aplikasi ini dirancang untuk membantu Anda dan keluarga mengelola keuangan dengan lebih baik.</p>

          <div class="features">
            <h3>Apa yang bisa Anda lakukan:</h3>
            <div class="feature">Catat pemasukan dan pengeluaran real-time</div>
            <div class="feature">Buat dan pantau budget bulanan</div>
            <div class="feature">Kelola multiple wallet dan aset</div>
            <div class="feature">Analisis keuangan dengan dashboard & reports</div>
            <div class="feature">Undang anggota keluarga untuk kolaborasi</div>
            <div class="feature">Set recurring transactions otomatis</div>
            <div class="feature">Dapatkan notifikasi budget warning</div>
          </div>

          <div style="text-align: center;">
            <a href="${
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            }/dashboard" class="button">
              Mulai Sekarang
            </a>
          </div>

          <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
            Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi kami.<br>
            Selamat mengelola keuangan keluarga Anda!
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
Selamat Datang, ${userName}!

Terima kasih telah bergabung dengan Family Finance Tracker.

Apa yang bisa Anda lakukan:
- Catat pemasukan dan pengeluaran real-time
- Buat dan pantau budget bulanan
- Kelola multiple wallet dan aset
- Analisis keuangan dengan dashboard & reports
- Undang anggota keluarga untuk kolaborasi
- Set recurring transactions otomatis
- Dapatkan notifikasi budget warning

Mulai sekarang: ${
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  }/dashboard

Selamat mengelola keuangan keluarga Anda!
  `.trim();

  return sendEmail({
    to: userEmail,
    subject: "Selamat Datang di Family Finance Tracker! 🎉",
    html,
    text,
  });
}

/**
 * Send family invitation email
 */
export async function sendInvitationEmail(
  recipientEmail: string,
  inviterName: string,
  familyName: string,
  inviteToken: string
) {
  const inviteLink = `${
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  }/invite/${inviteToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          h1 {
            color: #2563eb;
            font-size: 24px;
          }
          .invitation-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            margin: 20px 0;
          }
          .invitation-box h2 {
            margin: 0 0 10px 0;
            font-size: 20px;
          }
          .button {
            display: inline-block;
            background-color: white;
            color: #2563eb;
            padding: 12px 32px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .link-box {
            background-color: #f9fafb;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            word-break: break-all;
            font-size: 12px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Undangan Keluarga 👨‍👩‍👧‍👦</h1>
          </div>

          <div class="invitation-box">
            <h2>${inviterName}</h2>
            <p style="margin: 0;">mengundang Anda untuk bergabung di</p>
            <h2 style="margin: 15px 0 0 0;">${familyName}</h2>
          </div>

          <p>
            Anda telah diundang untuk bergabung dalam keluarga di Family Finance Tracker. 
            Dengan bergabung, Anda dapat:
          </p>

          <ul>
            <li>Melihat dan mengelola transaksi keluarga</li>
            <li>Berkontribusi dalam budget planning</li>
            <li>Akses dashboard keuangan keluarga</li>
            <li>Kolaborasi dalam financial goals</li>
          </ul>

          <div style="text-align: center;">
            <a href="${inviteLink}" class="button">
              Terima Undangan
            </a>
          </div>

          <div class="link-box">
            Atau salin link berikut:<br>
            ${inviteLink}
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Link ini akan kadaluarsa dalam 7 hari.<br>
            Jika Anda tidak mengenal ${inviterName}, abaikan email ini.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
Undangan Keluarga

${inviterName} mengundang Anda untuk bergabung di ${familyName}

Dengan bergabung, Anda dapat:
- Melihat dan mengelola transaksi keluarga
- Berkontribusi dalam budget planning
- Akses dashboard keuangan keluarga
- Kolaborasi dalam financial goals

Terima undangan: ${inviteLink}

Link ini akan kadaluarsa dalam 7 hari.
  `.trim();

  return sendEmail({
    to: recipientEmail,
    subject: `${inviterName} mengundang Anda ke ${familyName}`,
    html,
    text,
  });
}

/**
 * Send monthly summary email
 */
export async function sendMonthlySummaryEmail(
  userEmail: string,
  userName: string,
  month: string,
  data: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    topCategories: Array<{ name: string; amount: number; count: number }>;
    budgetPerformance: { total: number; exceeded: number; onTrack: number };
  }
) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const categoriesHtml = data.topCategories
    .map(
      (cat, index) => `
        <tr>
          <td style="padding: 10px;">${index + 1}. ${cat.name}</td>
          <td style="padding: 10px; text-align: center;">${cat.count}x</td>
          <td style="padding: 10px; text-align: right; font-weight: 600;">
            ${formatCurrency(cat.amount)}
          </td>
        </tr>
      `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          h1 {
            color: #2563eb;
            font-size: 24px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
          }
          .stat-card {
            background-color: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
          }
          .stat-label {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 5px;
          }
          .stat-value {
            font-size: 18px;
            font-weight: 700;
          }
          .stat-value.income {
            color: #10b981;
          }
          .stat-value.expense {
            color: #ef4444;
          }
          .stat-value.balance {
            color: #2563eb;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th {
            background-color: #f3f4f6;
            padding: 10px;
            text-align: left;
            font-weight: 600;
          }
          .budget-summary {
            background-color: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Ringkasan Keuangan Bulan ${month} 📊</h1>
            <p>Halo ${userName}, ini adalah ringkasan keuangan Anda bulan ini.</p>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Total Pemasukan</div>
              <div class="stat-value income">${formatCurrency(
                data.totalIncome
              )}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total Pengeluaran</div>
              <div class="stat-value expense">${formatCurrency(
                data.totalExpense
              )}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Saldo Akhir</div>
              <div class="stat-value balance">${formatCurrency(
                data.balance
              )}</div>
            </div>
          </div>

          <h3>Top 5 Kategori Pengeluaran</h3>
          <table>
            <thead>
              <tr>
                <th>Kategori</th>
                <th style="text-align: center;">Transaksi</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${categoriesHtml}
            </tbody>
          </table>

          <div class="budget-summary">
            <h3 style="margin-top: 0;">Budget Performance</h3>
            <p>Total Budget: ${data.budgetPerformance.total}</p>
            <p style="color: #10b981;">✓ On Track: ${
              data.budgetPerformance.onTrack
            }</p>
            <p style="color: #ef4444;">⚠ Exceeded: ${
              data.budgetPerformance.exceeded
            }</p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            }/reports" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Lihat Laporan Lengkap
            </a>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Ringkasan Keuangan Bulan ${month}

Halo ${userName},

Total Pemasukan: ${formatCurrency(data.totalIncome)}
Total Pengeluaran: ${formatCurrency(data.totalExpense)}
Saldo Akhir: ${formatCurrency(data.balance)}

Budget Performance:
- Total Budget: ${data.budgetPerformance.total}
- On Track: ${data.budgetPerformance.onTrack}
- Exceeded: ${data.budgetPerformance.exceeded}

Lihat laporan lengkap: ${
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  }/reports
  `.trim();

  return sendEmail({
    to: userEmail,
    subject: `Ringkasan Keuangan Bulan ${month}`,
    html,
    text,
  });
}

/**
 * Send budget warning email
 */
export async function sendBudgetWarningEmail(
  userEmail: string,
  userName: string,
  categoryName: string,
  budgetAmount: number,
  currentSpent: number,
  percentage: number
) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const remaining = budgetAmount - currentSpent;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Peringatan Budget</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .warning-icon {
            font-size: 48px;
            margin-bottom: 10px;
          }
          h1 {
            color: #dc2626;
            font-size: 24px;
            margin: 0;
          }
          .category {
            background-color: #fef2f2;
            border-left: 4px solid #dc2626;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .category h2 {
            margin: 0 0 10px 0;
            color: #991b1b;
            font-size: 18px;
          }
          .stats {
            display: table;
            width: 100%;
            margin: 20px 0;
          }
          .stat-row {
            display: table-row;
          }
          .stat-label, .stat-value {
            display: table-cell;
            padding: 10px 0;
            border-bottom: 1px solid #f3f4f6;
          }
          .stat-label {
            color: #6b7280;
            font-weight: 500;
          }
          .stat-value {
            text-align: right;
            font-weight: 600;
          }
          .stat-value.danger {
            color: #dc2626;
          }
          .stat-value.warning {
            color: #f59e0b;
          }
          .stat-value.success {
            color: #10b981;
          }
          .progress-bar {
            background-color: #e5e7eb;
            border-radius: 9999px;
            height: 20px;
            margin: 20px 0;
            overflow: hidden;
          }
          .progress-fill {
            height: 100%;
            background-color: #dc2626;
            border-radius: 9999px;
            transition: width 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: 600;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
          }
          .button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="warning-icon">⚠️</div>
            <h1>Peringatan Budget</h1>
            <p>Budget kategori Anda hampir habis!</p>
          </div>

          <p>Halo <strong>${userName}</strong>,</p>
          
          <p>Kami ingin menginformasikan bahwa pengeluaran Anda untuk kategori berikut sudah mencapai <strong>${percentage.toFixed(
            1
          )}%</strong> dari budget yang ditetapkan:</p>

          <div class="category">
            <h2>${categoryName}</h2>
            
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${Math.min(
                percentage,
                100
              )}%">
                ${percentage.toFixed(0)}%
              </div>
            </div>

            <div class="stats">
              <div class="stat-row">
                <div class="stat-label">Budget Bulan Ini:</div>
                <div class="stat-value">${formatCurrency(budgetAmount)}</div>
              </div>
              <div class="stat-row">
                <div class="stat-label">Total Pengeluaran:</div>
                <div class="stat-value danger">${formatCurrency(
                  currentSpent
                )}</div>
              </div>
              <div class="stat-row">
                <div class="stat-label">Sisa Budget:</div>
                <div class="stat-value ${remaining > 0 ? "warning" : "danger"}">
                  ${formatCurrency(remaining)}
                </div>
              </div>
            </div>
          </div>

          <p>
            ${
              percentage >= 100
                ? "⛔ <strong>Budget Anda sudah terlampaui!</strong> Harap pertimbangkan untuk mengurangi pengeluaran di kategori ini."
                : "⚠️ Harap pertimbangkan untuk lebih berhati-hati dalam mengeluarkan uang untuk kategori ini agar tidak melebihi budget."
            }
          </p>

          <div style="text-align: center;">
            <a href="${
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            }/budget" class="button">
              Lihat Budget Saya
            </a>
          </div>

          <div class="footer">
            <p>Email ini dikirim secara otomatis oleh Family Finance Tracker.</p>
            <p>Anda menerima email ini karena Anda adalah anggota dari keluarga yang memiliki budget tracking aktif.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Peringatan Budget - Family Finance Tracker

Halo ${userName},

Budget kategori Anda hampir habis!

Kategori: ${categoryName}
Persentase Terpakai: ${percentage.toFixed(1)}%

Budget Bulan Ini: ${formatCurrency(budgetAmount)}
Total Pengeluaran: ${formatCurrency(currentSpent)}
Sisa Budget: ${formatCurrency(remaining)}

${
  percentage >= 100
    ? "Budget Anda sudah terlampaui! Harap pertimbangkan untuk mengurangi pengeluaran di kategori ini."
    : "Harap pertimbangkan untuk lebih berhati-hati dalam mengeluarkan uang untuk kategori ini agar tidak melebihi budget."
}

Lihat budget Anda: ${
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  }/budget

---
Email ini dikirim secara otomatis oleh Family Finance Tracker.
  `.trim();

  return sendEmail({
    to: userEmail,
    subject: `⚠️ Peringatan Budget: ${categoryName} (${percentage.toFixed(
      0
    )}%)`,
    html,
    text,
  });
}
