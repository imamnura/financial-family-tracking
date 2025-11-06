# Contributing to Family Financial Tracker

Terima kasih atas ketertarikan Anda untuk berkontribusi! 🎉

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Issue Guidelines](#issue-guidelines)

---

## Code of Conduct

Dengan berpartisipasi dalam project ini, Anda setuju untuk menjaga lingkungan yang ramah dan profesional.

### Kami Berkomitmen untuk:

- ✅ Menggunakan bahasa yang ramah dan inklusif
- ✅ Menghormati sudut pandang dan pengalaman yang berbeda
- ✅ Menerima kritik konstruktif dengan baik
- ✅ Fokus pada yang terbaik untuk komunitas

### Tidak Dapat Diterima:

- ❌ Komentar yang tidak pantas atau diskriminatif
- ❌ Harassment dalam bentuk apapun
- ❌ Publikasi informasi pribadi orang lain
- ❌ Perilaku tidak profesional lainnya

---

## Getting Started

### 1. Fork & Clone Repository

```bash
# Fork di GitHub UI, lalu clone
git clone https://github.com/YOUR_USERNAME/family-tracking-realtime.git
cd family-tracking-realtime

# Add upstream
git remote add upstream https://github.com/ORIGINAL_OWNER/family-tracking-realtime.git
```

### 2. Setup Development Environment

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env dengan konfigurasi Anda

# Setup database
pnpm db:generate
pnpm db:push
pnpm db:seed

# Run development server
pnpm dev
```

### 3. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

---

## Development Process

### 1. Pick an Issue

- Lihat [Issues](https://github.com/OWNER/REPO/issues)
- Pilih issue dengan label `good first issue` untuk pemula
- Comment di issue bahwa Anda akan mengerjakannya
- Tunggu approval dari maintainer

### 2. Develop Your Feature

```bash
# Keep your branch updated
git fetch upstream
git rebase upstream/main

# Make your changes
# Write tests (if applicable)
# Test thoroughly

# Commit your changes
git add .
git commit -m "feat: add your feature"
```

### 3. Test Your Changes

```bash
# Run linter
pnpm lint

# Type check
pnpm type-check

# Run tests (when implemented)
pnpm test

# Build check
pnpm build
```

### 4. Push & Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create Pull Request di GitHub.

---

## Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] All tests pass (when implemented)
- [ ] Documentation updated if needed
- [ ] No console.log or debugging code
- [ ] Branch is up to date with main

### PR Title Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add user authentication
fix: resolve wallet balance bug
docs: update API documentation
refactor: simplify transaction logic
test: add budget validation tests
chore: update dependencies
```

### PR Description Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

How you tested the changes

## Screenshots (if applicable)

Add screenshots for UI changes

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Documentation updated
```

### Review Process

1. Maintainer akan review PR Anda
2. Address feedback jika ada
3. Setelah approved, PR akan di-merge
4. Your contribution akan masuk ke project! 🎉

---

## Coding Standards

### TypeScript

```typescript
// ✅ Good - Proper typing
interface UserData {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<UserData> {
  // ...
}

// ❌ Bad - Using any
function getUser(id: any): any {
  // ...
}
```

### React Components

```typescript
// ✅ Good - Functional component with proper types
interface ButtonProps {
  variant: "primary" | "secondary";
  onClick: () => void;
  children: React.ReactNode;
}

export function Button({ variant, onClick, children }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}

// ❌ Bad - No types, inline styles
export function Button(props) {
  return <button style={{ color: "red" }}>{props.children}</button>;
}
```

### API Routes

```typescript
// ✅ Good - Proper error handling & validation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = schema.parse(body);

    const result = await prisma.user.create({
      data: validated,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Invalid data" },
      { status: 400 }
    );
  }
}

// ❌ Bad - No validation or error handling
export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await prisma.user.create({ data: body });
  return NextResponse.json(result);
}
```

### Database Queries

```typescript
// ✅ Good - Select specific fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
  },
});

// ❌ Bad - Select all including password
const users = await prisma.user.findMany();
```

---

## Commit Guidelines

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting)
- **refactor**: Code refactoring
- **test**: Adding tests
- **chore**: Maintenance tasks

### Examples

```bash
# Feature
feat(auth): add JWT authentication

# Bug fix
fix(transaction): resolve balance calculation error

# Documentation
docs(api): update authentication endpoints

# Refactor
refactor(wallet): simplify transfer logic

# Test
test(budget): add validation tests
```

### Best Practices

- Use present tense ("add" not "added")
- Use imperative mood ("move" not "moves")
- First line max 72 characters
- Reference issues when applicable (#123)

---

## Issue Guidelines

### Creating Issues

#### Bug Report

```markdown
**Describe the bug**
Clear description of the bug

**To Reproduce**
Steps to reproduce:

1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen

**Screenshots**
If applicable

**Environment**

- OS: [e.g. macOS]
- Browser: [e.g. Chrome]
- Version: [e.g. 1.0.0]
```

#### Feature Request

```markdown
**Is your feature request related to a problem?**
Clear description of the problem

**Describe the solution**
Clear description of what you want

**Describe alternatives**
Alternative solutions you've considered

**Additional context**
Any other context or screenshots
```

---

## Questions?

- Check [Documentation](./docs/)
- Check existing [Issues](https://github.com/OWNER/REPO/issues)
- Create new issue dengan label `question`
- Contact maintainers

---

## Recognition

Contributors akan ditampilkan di:

- README.md
- CHANGELOG.md
- GitHub Contributors page

---

Thank you for contributing! 🙏
