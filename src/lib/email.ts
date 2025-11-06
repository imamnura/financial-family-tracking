import nodemailer from 'nodemailer';

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
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development: Use Ethereal Email (test account)
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    console.log('📧 Email transporter initialized with Ethereal');
    console.log('📧 Test account:', testAccount.user);
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
      from: process.env.SMTP_FROM || '"Family Finance Tracker" <noreply@familyfinance.app>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log('📧 Email sent:', info.messageId);

    // For Ethereal, log the preview URL
    if (process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('📧 Preview URL:', previewUrl);
      }
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info),
    };
  } catch (error) {
    console.error('❌ Email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
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
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
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
          
          <p>Kami ingin menginformasikan bahwa pengeluaran Anda untuk kategori berikut sudah mencapai <strong>${percentage.toFixed(1)}%</strong> dari budget yang ditetapkan:</p>

          <div class="category">
            <h2>${categoryName}</h2>
            
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${Math.min(percentage, 100)}%">
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
                <div class="stat-value danger">${formatCurrency(currentSpent)}</div>
              </div>
              <div class="stat-row">
                <div class="stat-label">Sisa Budget:</div>
                <div class="stat-value ${remaining > 0 ? 'warning' : 'danger'}">
                  ${formatCurrency(remaining)}
                </div>
              </div>
            </div>
          </div>

          <p>
            ${
              percentage >= 100
                ? '⛔ <strong>Budget Anda sudah terlampaui!</strong> Harap pertimbangkan untuk mengurangi pengeluaran di kategori ini.'
                : '⚠️ Harap pertimbangkan untuk lebih berhati-hati dalam mengeluarkan uang untuk kategori ini agar tidak melebihi budget.'
            }
          </p>

          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/budget" class="button">
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
    ? 'Budget Anda sudah terlampaui! Harap pertimbangkan untuk mengurangi pengeluaran di kategori ini.'
    : 'Harap pertimbangkan untuk lebih berhati-hati dalam mengeluarkan uang untuk kategori ini agar tidak melebihi budget.'
}

Lihat budget Anda: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/budget

---
Email ini dikirim secara otomatis oleh Family Finance Tracker.
  `.trim();

  return sendEmail({
    to: userEmail,
    subject: `⚠️ Peringatan Budget: ${categoryName} (${percentage.toFixed(0)}%)`,
    html,
    text,
  });
}
