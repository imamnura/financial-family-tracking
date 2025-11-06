# 🎯 Development Guide

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL 14+
- Git

### Setup Development Environment

1. **Clone & Install**

   ```bash
   git clone <repository-url>
   cd family-tracking-realtime
   pnpm install
   ```

2. **Environment Setup**

   ```bash
   cp .env.example .env
   # Edit .env dengan konfigurasi Anda
   ```

3. **Database Setup**

   ```bash
   pnpm db:generate
   pnpm db:push
   pnpm db:seed
   ```

4. **Run Development Server**
   ```bash
   pnpm dev
   ```

---

## Project Structure

```
family-tracking-realtime/
├── prisma/               # Database schema & migrations
│   ├── schema.prisma
│   └── seed.ts
├── public/              # Static assets
│   └── uploads/         # User uploads
├── src/
│   ├── app/            # Next.js App Router
│   │   ├── api/        # API routes
│   │   ├── (auth)/     # Auth pages group
│   │   ├── (dashboard)/ # Dashboard pages group
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/     # React components
│   │   ├── ui/        # Base UI components
│   │   ├── forms/     # Form components
│   │   ├── charts/    # Chart components
│   │   └── layout/    # Layout components
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utilities & helpers
│   │   ├── prisma.ts
│   │   ├── prisma-helpers.ts
│   │   ├── env.ts
│   │   └── utils.ts
│   ├── types/         # TypeScript types
│   └── middleware.ts  # Next.js middleware
├── docs/              # Documentation
└── tests/             # Tests (future)
```

---

## Coding Standards

### TypeScript

- Use strict mode
- Define proper types/interfaces
- Avoid `any` type
- Use type inference when obvious

### Naming Conventions

- **Files**: kebab-case (`user-profile.tsx`)
- **Components**: PascalCase (`UserProfile`)
- **Functions**: camelCase (`getUserData`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- **Types/Interfaces**: PascalCase (`UserData`)

### Component Structure

```typescript
// Imports
import { useState } from "react";
import { ComponentProps } from "./types";

// Types/Interfaces
interface Props {
  title: string;
  onSubmit: () => void;
}

// Component
export function MyComponent({ title, onSubmit }: Props) {
  // Hooks
  const [state, setState] = useState();

  // Handlers
  const handleClick = () => {
    // ...
  };

  // Render
  return <div>{/* JSX */}</div>;
}
```

---

## Git Workflow

### Branch Naming

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/what-changed` - Documentation
- `refactor/what-changed` - Code refactoring
- `test/what-tested` - Tests

### Commit Messages

Follow Conventional Commits:

```
feat: add user authentication
fix: resolve wallet balance calculation
docs: update API documentation
refactor: simplify transaction logic
test: add tests for budget validation
chore: update dependencies
```

### Workflow

```bash
# Create feature branch
git checkout -b feature/transaction-list

# Make changes and commit
git add .
git commit -m "feat: add transaction list component"

# Push to remote
git push origin feature/transaction-list

# Create Pull Request on GitHub
```

---

## Testing (Future)

### Unit Tests

```typescript
// Example test
import { calculateBudget } from "./budget";

describe("Budget Calculation", () => {
  it("should calculate remaining budget", () => {
    const result = calculateBudget(1000, 300);
    expect(result).toBe(700);
  });
});
```

### Run Tests

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

---

## API Development

### Creating API Routes

```typescript
// app/api/transactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  amount: z.number().positive(),
  description: z.string().min(3),
});

export async function POST(req: NextRequest) {
  try {
    // Parse & validate
    const body = await req.json();
    const data = schema.parse(body);

    // Get user from token (middleware)
    const user = req.user;

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        ...data,
        userId: user.id,
        familyId: user.familyId,
      },
    });

    return NextResponse.json({ success: true, data: transaction });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
```

---

## Database Development

### Schema Changes

1. Edit `prisma/schema.prisma`
2. Generate client: `pnpm db:generate`
3. Create migration: `pnpm db:migrate`
4. Update seed if needed

### Query Best Practices

```typescript
// ✅ Good - Select only needed fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
    // password excluded
  },
});

// ❌ Bad - Selects all fields including password
const users = await prisma.user.findMany();

// ✅ Good - Use transactions for atomic operations
await prisma.$transaction([
  prisma.wallet.update({ ... }),
  prisma.transaction.create({ ... }),
]);

// ✅ Good - Use pagination
const transactions = await prisma.transaction.findMany({
  skip: (page - 1) * limit,
  take: limit,
});
```

---

## Component Development

### Creating Components

```typescript
// components/ui/button.tsx
import { cn } from "@/lib/utils";

interface ButtonProps {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({
  variant = "primary",
  size = "md",
  children,
  onClick,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "btn-base",
        variant === "primary" && "btn-primary",
        variant === "secondary" && "btn-secondary",
        size === "sm" && "text-sm px-3 py-1",
        size === "lg" && "text-lg px-6 py-3"
      )}
    >
      {children}
    </button>
  );
}
```

---

## Styling

### Using Tailwind CSS

```typescript
// ✅ Good - Use utility classes
<div className="flex items-center gap-4 p-4 rounded-lg bg-white shadow">
  <span className="text-lg font-semibold">Title</span>
</div>

// ✅ Good - Use cn() for conditional classes
<button className={cn(
  'px-4 py-2 rounded',
  isActive && 'bg-blue-600',
  !isActive && 'bg-gray-400'
)}>
  Click me
</button>

// ✅ Good - Use custom utility classes from globals.css
<button className="btn-primary">Submit</button>
<div className="card-base card-hover">Card content</div>
```

---

## Performance Tips

### React Performance

- Use `React.memo()` for expensive components
- Use `useMemo()` and `useCallback()` wisely
- Avoid inline functions in renders
- Use proper key props in lists

### Database Performance

- Add indexes for frequently queried fields
- Use `select` to fetch only needed fields
- Implement pagination for large datasets
- Use database transactions for atomic operations

### Next.js Performance

- Use Server Components when possible
- Implement proper caching strategies
- Optimize images with next/image
- Use dynamic imports for code splitting

---

## Debugging

### Server-side Debugging

```typescript
// Add console.log in API routes
console.log("Request body:", body);

// Use debugger
debugger;

// Check Prisma queries
const result = await prisma.user.findMany();
console.log("Query result:", result);
```

### Client-side Debugging

```typescript
// React DevTools
// Browser Console
console.log("State:", state);

// Network Tab
// Check API requests/responses
```

---

## Environment Variables

### Development

```env
NODE_ENV=development
DATABASE_URL="postgresql://..."
JWT_SECRET="dev-secret"
```

### Production

```env
NODE_ENV=production
DATABASE_URL="postgresql://production-db"
JWT_SECRET="strong-production-secret"
COOKIE_SECURE="true"
```

---

## Common Issues

### Database Connection Error

```bash
# Check PostgreSQL is running
pg_isready

# Check connection string in .env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

### Prisma Client Not Found

```bash
# Regenerate Prisma Client
pnpm db:generate
```

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 pnpm dev
```

---

## Useful Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server

# Database
pnpm db:generate      # Generate Prisma Client
pnpm db:push          # Push schema (dev)
pnpm db:migrate       # Create migration
pnpm db:studio        # Open Prisma Studio
pnpm db:seed          # Seed database

# Code Quality
pnpm lint             # Run ESLint
pnpm type-check       # TypeScript check
pnpm format           # Format code

# Testing (future)
pnpm test             # Run tests
pnpm test:watch       # Watch mode
```

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [React Docs](https://react.dev)

---

## Getting Help

- Check documentation in `/docs`
- Review code examples
- Ask team members
- Create GitHub issue
