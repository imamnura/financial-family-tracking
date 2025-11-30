# Email & File Upload Services

## Overview

Complete implementation of email notifications and file upload functionality for the Financial Family Tracking application.

---

## 📧 Email Service

### Features

- ✅ **SMTP Integration** with Nodemailer
- ✅ **Multiple Email Templates**:
  - Welcome email for new users
  - Family invitation emails
  - Budget warning alerts
  - Monthly summary reports
- ✅ **Development Mode**: Uses Ethereal email (test service)
- ✅ **Production Ready**: Supports all major SMTP providers
- ✅ **Beautiful HTML Templates** with inline styles
- ✅ **Fallback Text Versions** for all emails

### Configuration

#### Environment Variables

```env
# SMTP Configuration (Optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@familyfinance.app"
```

#### Supported Providers

- **Gmail**: `smtp.gmail.com:587` (requires App Password)
- **Outlook**: `smtp-mail.outlook.com:587`
- **SendGrid**: `smtp.sendgrid.net:587`
- **Mailgun**: `smtp.mailgun.org:587`
- **AWS SES**: `email-smtp.region.amazonaws.com:587`

### Usage

#### Send Welcome Email

```typescript
import { sendWelcomeEmail } from "@/lib/email";

await sendWelcomeEmail("user@example.com", "John Doe");
```

#### Send Invitation Email

```typescript
import { sendInvitationEmail } from "@/lib/email";

await sendInvitationEmail(
  "member@example.com",
  "John Doe",
  "Smith Family",
  "invite-token-123"
);
```

#### Send Budget Warning

```typescript
import { sendBudgetWarningEmail } from "@/lib/email";

await sendBudgetWarningEmail(
  "user@example.com",
  "John Doe",
  "Groceries",
  500000, // budget amount
  450000, // current spent
  90 // percentage
);
```

#### Send Monthly Summary

```typescript
import { sendMonthlySummaryEmail } from "@/lib/email";

await sendMonthlySummaryEmail("user@example.com", "John Doe", "Januari 2024", {
  totalIncome: 10000000,
  totalExpense: 7500000,
  balance: 2500000,
  topCategories: [
    { name: "Groceries", amount: 2000000, count: 15 },
    { name: "Transport", amount: 1500000, count: 30 },
  ],
  budgetPerformance: {
    total: 10,
    exceeded: 2,
    onTrack: 8,
  },
});
```

### Email Templates

All emails include:

- ✅ Responsive HTML design
- ✅ Inline CSS for email client compatibility
- ✅ Professional branding
- ✅ Clear call-to-action buttons
- ✅ Plain text fallback
- ✅ Dark mode friendly colors

### Development Testing

When SMTP is not configured, emails are sent to **Ethereal Email**:

- Preview URLs are logged to console
- No real emails are sent
- Perfect for development & testing

---

## 📤 File Upload Service

### Features

- ✅ **Local File Storage** in `/public/uploads`
- ✅ **Avatar Uploads** (max 2MB)
- ✅ **Transaction Attachments** (max 10MB)
- ✅ **File Validation**: Size and type checking
- ✅ **Automatic Directory Creation**
- ✅ **Unique Filenames** using nanoid
- ✅ **Multiple File Upload Support**
- ✅ **File Deletion** capability

### Upload Types

#### 1. Avatar Uploads

- **Path**: `/public/uploads/avatars/`
- **Max Size**: 2MB
- **Allowed Types**: JPG, PNG, WEBP, GIF
- **Use Case**: User profile pictures

#### 2. Attachment Uploads

- **Path**: `/public/uploads/attachments/`
- **Max Size**: 10MB
- **Allowed Types**:
  - Images: JPG, PNG, WEBP, GIF
  - Documents: PDF, DOC, DOCX, XLS, XLSX
- **Use Case**: Transaction receipts, invoices

### Usage

#### Upload File (Server-side)

```typescript
import { uploadAvatar, uploadAttachment } from "@/lib/upload";

// Upload avatar
const result = await uploadAvatar(file);
if (result.success) {
  console.log("URL:", result.url);
  console.log("Filename:", result.filename);
}

// Upload attachment
const result = await uploadAttachment(file);
```

#### Upload Hook (Client-side)

```typescript
"use client";
import { useFileUpload } from "@/hooks/useFileUpload";

function MyComponent() {
  const { uploading, progress, uploadFile } = useFileUpload({
    type: "avatar",
    onSuccess: (url) => {
      console.log("Uploaded:", url);
    },
    maxSize: 2,
  });

  const handleUpload = async (file: File) => {
    await uploadFile(file);
  };

  return <div>{uploading && <div>Progress: {progress}%</div>}</div>;
}
```

#### Upload Component

```typescript
import { FileUpload, AvatarUpload } from '@/components/FileUpload';

// General file upload
<FileUpload
  type="attachment"
  label="Upload Receipt"
  onUploadSuccess={(url) => console.log(url)}
  maxSize={10}
/>

// Avatar upload (circular preview)
<AvatarUpload
  currentAvatar="/uploads/avatars/user.jpg"
  userName="John Doe"
  onUploadSuccess={(url) => console.log(url)}
/>
```

### API Endpoint

**POST** `/api/upload`

**Request**:

```typescript
const formData = new FormData();
formData.append("file", file);
formData.append("type", "avatar"); // or 'attachment'

const response = await fetch("/api/upload", {
  method: "POST",
  body: formData,
});
```

**Response**:

```json
{
  "success": true,
  "url": "/uploads/avatars/user_abc123.jpg",
  "filename": "user_abc123.jpg"
}
```

### File Structure

```
public/
  uploads/
    avatars/
      user_abc123.jpg
      john_doe_xyz789.png
    attachments/
      receipt_def456.jpg
      invoice_ghi789.pdf
```

### Security Features

1. **File Type Validation**: Only allowed MIME types
2. **File Size Limits**: Configurable per upload type
3. **Filename Sanitization**: Removes special characters
4. **Unique Filenames**: Prevents overwrites using nanoid
5. **Directory Isolation**: Separate folders for different types

---

## 📁 File Structure

```
src/
├── lib/
│   ├── email.ts              # Email service with 4 templates
│   └── upload.ts             # File upload service
├── hooks/
│   └── useFileUpload.ts      # React hook for file uploads
├── components/
│   └── FileUpload.tsx        # UI components (FileUpload, AvatarUpload)
└── app/
    └── api/
        └── upload/
            └── route.ts      # Upload API endpoint
```

---

## 🔧 Setup Instructions

### 1. Email Service Setup

#### Option A: Gmail (Recommended for testing)

1. Enable 2-Factor Authentication
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Add to `.env`:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-16-char-app-password"
SMTP_FROM="noreply@familyfinance.app"
```

#### Option B: SendGrid

1. Sign up at sendgrid.com
2. Create API key
3. Add to `.env`:

```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
```

#### Option C: Development (No setup)

- Leave SMTP variables empty
- Emails will use Ethereal (test service)
- Check console for preview URLs

### 2. File Upload Setup

#### Local Storage (Default)

1. Ensure `/public/uploads` is in `.gitignore`
2. Directory is auto-created on first upload
3. No configuration needed

#### Production Considerations

- Add file serving middleware
- Consider CDN for static files
- Monitor disk space usage
- Implement cleanup for unused files

---

## 🎯 Integration Examples

### Example 1: Send Welcome Email on Registration

```typescript
// src/app/api/auth/register/route.ts
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(request: Request) {
  const { email, name, password } = await request.json();

  // Create user...
  const user = await prisma.user.create({ ... });

  // Send welcome email
  await sendWelcomeEmail(email, name);

  return NextResponse.json({ success: true });
}
```

### Example 2: Upload Avatar in Profile Page

```typescript
// src/app/(protected)/profile/page.tsx
"use client";
import { AvatarUpload } from "@/components/FileUpload";
import { useState } from "react";

export default function ProfilePage() {
  const [avatarUrl, setAvatarUrl] = useState("/default-avatar.png");

  const handleAvatarUpload = async (url: string) => {
    // Update user profile with new avatar
    const response = await fetch("/api/profile", {
      method: "PATCH",
      body: JSON.stringify({ avatar: url }),
    });

    if (response.ok) {
      setAvatarUrl(url);
    }
  };

  return (
    <div>
      <h1>Profile Settings</h1>
      <AvatarUpload
        currentAvatar={avatarUrl}
        userName="John Doe"
        onUploadSuccess={handleAvatarUpload}
      />
    </div>
  );
}
```

### Example 3: Attachment Upload in Transaction Form

```typescript
// src/components/forms/TransactionForm.tsx
import { FileUpload } from "@/components/FileUpload";

export function TransactionForm() {
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

  return (
    <form>
      {/* Other form fields... */}

      <FileUpload
        type="attachment"
        label="Upload Receipt (Optional)"
        onUploadSuccess={(url) => setAttachmentUrl(url)}
        maxSize={10}
      />

      {attachmentUrl && (
        <input type="hidden" name="attachment" value={attachmentUrl} />
      )}
    </form>
  );
}
```

---

## 🧪 Testing

### Test Email Service

```bash
# Send test email
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User"}'

# Check console for Ethereal preview URL
```

### Test File Upload

```bash
# Upload file via API
curl -X POST http://localhost:3000/api/upload \
  -F "file=@/path/to/image.jpg" \
  -F "type=avatar"

# Response should include URL
```

---

## 📊 Features Status

### Email Service

| Feature             | Status      | Notes              |
| ------------------- | ----------- | ------------------ |
| SMTP Integration    | ✅ Complete | Nodemailer         |
| Welcome Email       | ✅ Complete | HTML template      |
| Invitation Email    | ✅ Complete | With invite link   |
| Budget Warning      | ✅ Complete | Dynamic percentage |
| Monthly Summary     | ✅ Complete | Stats & charts     |
| Dev Mode (Ethereal) | ✅ Complete | Auto fallback      |
| Production SMTP     | ✅ Complete | Multi-provider     |

### File Upload Service

| Feature           | Status      | Notes           |
| ----------------- | ----------- | --------------- |
| Local Storage     | ✅ Complete | /public/uploads |
| Avatar Upload     | ✅ Complete | 2MB limit       |
| Attachment Upload | ✅ Complete | 10MB limit      |
| File Validation   | ✅ Complete | Size + type     |
| API Endpoint      | ✅ Complete | /api/upload     |
| React Hook        | ✅ Complete | useFileUpload   |
| UI Components     | ✅ Complete | 2 variants      |
| Progress Tracking | ✅ Complete | Visual feedback |

---

## 🚀 Next Steps

### Future Enhancements

#### Email Service

- [ ] Email queue system (Bull/BullMQ)
- [ ] Email templates in database
- [ ] Unsubscribe functionality
- [ ] Email analytics & tracking
- [ ] i18n for multi-language support

#### File Upload Service

- [ ] Cloud storage (AWS S3, Cloudinary)
- [ ] Image optimization (sharp, ImageMagick)
- [ ] Image resizing & thumbnails
- [ ] File compression
- [ ] Virus scanning
- [ ] Direct upload to S3 (presigned URLs)
- [ ] Drag & drop upload area
- [ ] Bulk upload with progress

---

## 📝 Notes

1. **Email Deliverability**: For production, use dedicated email service (SendGrid, Mailgun, AWS SES)
2. **File Storage**: Consider cloud storage for scalability (AWS S3, Google Cloud Storage, Cloudinary)
3. **Security**: Always validate files server-side, never trust client validation
4. **Performance**: Implement lazy loading for image previews
5. **Cleanup**: Add cron job to delete unused uploads

---

## 🎉 Completion Status

✅ **Email SMTP Service**: 100% Complete  
✅ **File Upload Service**: 100% Complete  
✅ **UI Components**: 100% Complete  
✅ **API Routes**: 100% Complete  
✅ **Documentation**: 100% Complete

**Overall Backend Completion: 100%**
