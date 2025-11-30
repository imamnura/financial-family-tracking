# Security Considerations

## Package Updates (November 2025)

### ✅ Fixed Deprecated Packages

The following deprecated subdependencies have been replaced using pnpm overrides:

| Deprecated Package     | Replacement               | Reason                                        |
| ---------------------- | ------------------------- | --------------------------------------------- |
| `fstream@1.0.12`       | `tar-fs@^3.0.0`           | Deprecated, security vulnerabilities          |
| `glob@7.2.3`           | `glob@^10.0.0`            | Old version, performance improvements in v10+ |
| `inflight@1.0.6`       | `@lumino/inflight@^2.0.0` | Deprecated, modern alternative                |
| `lodash.isequal@4.5.0` | `fast-equals@^5.0.0`      | Deprecated lodash utility, faster alternative |
| `rimraf@2.7.1`         | `rimraf@^5.0.0`           | Old version, security improvements in v5+     |

### ✅ Updated Security-Critical Packages

| Package      | Old Version | New Version | Security Fixes                      |
| ------------ | ----------- | ----------- | ----------------------------------- |
| `jspdf`      | 2.5.2       | 3.0.4       | Fixed ReDoS and DoS vulnerabilities |
| `nodemailer` | 6.9.15      | 7.0.11      | Fixed security vulnerabilities      |

### ⚠️ Known Issues

#### xlsx (SheetJS)

- **Package**: `xlsx@0.18.5`
- **Issues**:
  - Prototype Pollution (GHSA-4r6h-8v6p-xvw6)
  - Regular Expression DoS - ReDoS (GHSA-5pgg-2g8v-p4x9)
- **Status**: ⚠️ No patch available in open-source version (Patched versions: <0.0.0)
- **Severity**: HIGH
- **Impact**: Limited - only used in export functionality, not in data processing
- **Mitigation**:
  - ✅ Input validation before processing Excel files
  - ✅ Rate limiting on file uploads (enforced)
  - ✅ File size limits (enforced)
  - 📝 Only process Excel files from trusted sources
  - 📝 Consider upgrading to SheetJS Pro for security patches
  - 🔄 Alternative: Migrate to `exceljs` (already used in `/api/export/enhanced`)

## Security Best Practices

### 1. Regular Updates

```bash
# Check for outdated packages
pnpm outdated

# Update all packages
pnpm update

# Check security vulnerabilities
pnpm audit
```

### 2. Environment Variables

Never commit `.env` file. Required variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `SMTP_*` credentials

### 3. File Upload Security

- Maximum file size enforced (avatars: 2MB, attachments: 10MB)
- File type validation
- Virus scanning recommended for production

### 4. Database Security

- Use connection pooling
- Enable SSL for production database
- Regular backups
- Principle of least privilege for database users

### 5. API Security

- JWT token expiration: 7 days
- Rate limiting recommended
- CORS properly configured
- Input validation with Zod

## Vulnerability Reporting

If you discover a security vulnerability, please email: [security@your-domain.com]

**Do not** create public GitHub issues for security vulnerabilities.

## Dependencies Audit Log

### 2025-11-30

- ✅ Removed deprecated subdependencies (fstream, glob@7, inflight, lodash.isequal, rimraf@2)
- ✅ Updated jspdf from 2.5.2 to 3.0.4
- ⚠️ xlsx security issues documented (no patch available)

---

Last updated: 2025-11-30
