# 🚀 Production Deployment Checklist

## Pre-Deployment Checklist

### ✅ Code Quality

- [x] TypeScript compilation: 0 errors
- [x] All components tested
- [x] No console.log in production code
- [x] Error boundaries in place
- [x] Loading states everywhere
- [x] Form validation implemented

### ✅ Security

- [x] JWT secret configured
- [x] Environment variables documented
- [x] API routes protected
- [x] Input validation (Zod)
- [x] File upload validation
- [x] SQL injection prevention (Prisma)
- [x] Password hashing (bcrypt)

### ✅ Performance

- [x] React Server Components optimized
- [x] Client components minimal
- [x] Image optimization configured
- [x] Performance monitoring enabled
- [x] Web Vitals tracking
- [x] Optimistic UI updates

### ✅ Database

- [x] Prisma schema finalized
- [x] Migrations ready
- [x] Seed data prepared
- [x] Indexes optimized
- [x] Relationships validated

### ✅ Email Service

- [x] SMTP configured
- [x] Email templates tested
- [x] Fallback to Ethereal in dev
- [x] Production SMTP ready
- [x] Email logging implemented

### ✅ File Upload

- [x] Upload service implemented
- [x] File validation working
- [x] Directory structure ready
- [x] File size limits configured
- [x] Avatar upload tested

---

## Environment Setup

### Required Environment Variables

```env
# Database (REQUIRED)
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# Authentication (REQUIRED)
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters-long"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"

# Email SMTP (OPTIONAL - uses Ethereal in dev if not set)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@yourdomain.com"
```

### Optional Variables

```env
# Cloud Storage (Future enhancement)
# CLOUDINARY_CLOUD_NAME=""
# CLOUDINARY_API_KEY=""
# CLOUDINARY_API_SECRET=""

# Analytics (Future enhancement)
# NEXT_PUBLIC_GA_ID=""
# SENTRY_DSN=""
```

---

## Deployment Steps

### 1. Database Setup

#### Option A: Vercel Postgres

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Create Postgres database
vercel postgres create

# Get connection string
vercel env pull .env.local
```

#### Option B: Supabase

```bash
# 1. Create project at supabase.com
# 2. Get connection string from Settings > Database
# 3. Add to .env:
DATABASE_URL="postgresql://postgres:[password]@[host]:5432/postgres?schema=public"
```

#### Option C: Railway

```bash
# 1. Create project at railway.app
# 2. Add PostgreSQL service
# 3. Copy DATABASE_URL from service variables
```

### 2. Push Database Schema

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# Optional: Seed initial data
npm run db:seed
```

### 3. Build Application

```bash
# Install dependencies
pnpm install

# Build for production
pnpm build

# Test production build locally
pnpm start
```

### 4. Deploy to Vercel

#### Via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add SMTP_HOST
vercel env add SMTP_USER
vercel env add SMTP_PASS
```

#### Via Dashboard

1. Go to vercel.com
2. Import Git repository
3. Configure project:
   - Framework: Next.js
   - Build Command: `pnpm build`
   - Output Directory: `.next`
4. Add environment variables
5. Deploy

### 5. Alternative: Deploy to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add

# Deploy
railway up

# Set environment variables via dashboard
```

### 6. Alternative: Deploy to Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod

# Add environment variables via dashboard
```

---

## Post-Deployment

### 1. Verify Deployment

- [ ] Homepage loads correctly
- [ ] Login/Register works
- [ ] Dashboard displays data
- [ ] Transactions CRUD works
- [ ] Budget tracking works
- [ ] Email sending works
- [ ] File upload works
- [ ] Reports generate correctly

### 2. Configure Custom Domain

#### Vercel

```bash
# Add domain
vercel domains add yourdomain.com

# Configure DNS
# Add A record: 76.76.21.21
# Or CNAME: cname.vercel-dns.com
```

#### Cloudflare (Recommended)

1. Add site to Cloudflare
2. Configure DNS
3. Enable SSL/TLS (Full)
4. Enable caching
5. Configure page rules

### 3. Enable Monitoring

#### Application Monitoring

- Set up error tracking (Sentry)
- Configure analytics (Google Analytics, Plausible)
- Enable performance monitoring (built-in)

#### Server Monitoring

- Database performance (Vercel Analytics)
- API response times
- Error rates
- User activity

### 4. Setup Email Production

#### Gmail Setup

1. Enable 2FA on Google account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use 16-character password in SMTP_PASS

#### SendGrid Setup

1. Sign up at sendgrid.com
2. Verify sender identity
3. Create API key
4. Configure environment:

```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
```

#### AWS SES Setup

1. Sign up for AWS SES
2. Verify domain
3. Request production access
4. Create SMTP credentials
5. Configure environment

### 5. Configure File Storage

#### Option A: Keep Local Storage (Vercel)

- Files stored in `/public/uploads`
- Vercel Edge Network serves files
- No additional configuration needed
- Limited to deployment size

#### Option B: Cloudinary (Recommended)

```bash
npm install cloudinary
```

```env
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

Update `src/lib/upload.ts` to use Cloudinary.

#### Option C: AWS S3

```bash
npm install @aws-sdk/client-s3
```

```env
AWS_S3_BUCKET="your-bucket-name"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
```

Update `src/lib/upload.ts` to use S3.

---

## Performance Optimization

### 1. Caching Strategy

#### Prisma Query Caching

```typescript
// Add to prisma client
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Enable connection pooling
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

#### API Route Caching

```typescript
// Add to API routes
export const revalidate = 60; // Revalidate every 60 seconds
```

### 2. Image Optimization

Already configured in `next.config.ts`:

```typescript
images: {
  domains: ['localhost'],
  formats: ['image/webp', 'image/avif'],
}
```

Add production domains:

```typescript
images: {
  domains: ['localhost', 'yourdomain.com', 'cloudinary.com'],
  formats: ['image/webp', 'image/avif'],
}
```

### 3. Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_transactions_user_date ON "Transaction"(userId, date DESC);
CREATE INDEX idx_transactions_category ON "Transaction"(categoryId);
CREATE INDEX idx_transactions_wallet ON "Transaction"(walletId);
CREATE INDEX idx_budget_user ON "Budget"(userId, month);
```

---

## Security Hardening

### 1. Rate Limiting

Install package:

```bash
npm install express-rate-limit
```

Add to API routes:

```typescript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
```

### 2. CORS Configuration

Add to `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: 'https://yourdomain.com' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
      ],
    },
  ];
}
```

### 3. Security Headers

Add to `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
      ],
    },
  ];
}
```

---

## Backup Strategy

### Database Backups

#### Vercel Postgres

- Automatic daily backups (Pro plan)
- Point-in-time recovery

#### Supabase

- Automatic daily backups
- Manual backups available

#### Manual Backup Script

```bash
#!/bin/bash
# backup-db.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.sql"

pg_dump $DATABASE_URL > $BACKUP_FILE
gzip $BACKUP_FILE

# Upload to S3 or Google Drive
aws s3 cp ${BACKUP_FILE}.gz s3://your-bucket/backups/
```

---

## Monitoring & Analytics

### Application Performance

Built-in monitoring in `src/lib/monitoring.ts`:

- Page view tracking
- Custom event tracking
- Error logging
- Web Vitals (LCP, FID, CLS, TTFB)

### External Services

#### Sentry (Error Tracking)

```bash
npm install @sentry/nextjs
```

#### Google Analytics

```typescript
// Add to layout.tsx
<Script src="https://www.googletagmanager.com/gtag/js?id=GA_ID" />
```

#### Plausible (Privacy-friendly)

```typescript
<Script
  defer
  data-domain="yourdomain.com"
  src="https://plausible.io/js/script.js"
/>
```

---

## Maintenance

### Regular Tasks

#### Daily

- Monitor error logs
- Check email delivery
- Review user activity

#### Weekly

- Database performance review
- API response time analysis
- Security updates

#### Monthly

- Full backup verification
- Performance optimization
- Feature usage analysis
- Cost optimization

---

## Support & Documentation

### Internal Documentation

- `docs/100_PERCENT_COMPLETE.md` - Complete feature list
- `docs/EMAIL_AND_UPLOAD.md` - Email & upload service
- `docs/FRONTEND_PHASE_3.md` - Frontend implementation
- `docs/FRONTEND_AUDIT.md` - Code audit report
- `.env.example` - Environment configuration

### External Resources

- Next.js: https://nextjs.org/docs
- Prisma: https://prisma.io/docs
- Tailwind: https://tailwindcss.com/docs
- Vercel: https://vercel.com/docs

---

## 🎉 Ready for Production!

All items checked? You're ready to deploy!

```bash
# Final check
npm run lint
npx tsc --noEmit
npm run build

# Deploy
vercel --prod
```

**Your Financial Family Tracking app is now live!** 🚀
