<!-- Context: standards/code-quality.md -->

# Code Quality Standards

## Core Idea
Establish consistent code quality standards for React/TypeScript frontend and Node.js/Prisma backend to ensure maintainable, scalable, and bug-free applications.

## Key Points
- **TypeScript Configuration**: Enable strict mode, no implicit any, exact optional properties
- **Frontend Patterns**: Functional components with hooks, consistent prop interfaces, error boundaries
- **Backend Architecture**: RESTful API design, middleware for auth/validation, service layer separation
- **Database Modeling**: Prisma schema best practices, relations, indexes, migrations
- **Code Style**: ESLint/Prettier configuration, consistent naming conventions, import organization
- **Error Handling**: Centralized error handling, user-friendly messages, logging
- **Performance**: Lazy loading, memoization, efficient queries

## Frontend Example
```typescript
// Good: Typed functional component with error boundary
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ onClick, children, variant = 'primary' }) => (
  <button 
    className={`btn btn-${variant}`} 
    onClick={onClick}
  >
    {children}
  </button>
);
```

## Backend Patterns

### Prisma Singleton
Always import from the shared instance—never instantiate `PrismaClient` directly:
```typescript
// ✅ Good
import prisma from '../lib/prisma';

// ❌ Bad - creates connection pool exhaustion
const prisma = new PrismaClient();
```
📂 `backend/src/lib/prisma.ts`

### Rate Limiting
Use pre-configured limiters for auth endpoints:
```typescript
import { loginRateLimiter, authRateLimiter, apiRateLimiter } from '../middleware/rateLimit';

router.post('/login', loginRateLimiter, handler);    // 5 attempts / 15 min
router.post('/refresh', authRateLimiter, handler);   // 10 attempts / 15 min
router.get('/resource', apiRateLimiter, handler);    // 100 requests / min
```
📂 `backend/src/middleware/rateLimit.ts`

### Access Control
Use shared access check functions—never duplicate access logic in routes:
```typescript
import { checkProjectAccess, checkVibeAccess, checkCutAccess, checkFileAccess } from '../services/access';

// Check access at appropriate level
const hasAccess = await checkProjectAccess(user.id, user.role, projectId);
const hasAccess = await checkVibeAccess(user.id, user.role, vibeId);
const hasAccess = await checkCutAccess(user.id, user.role, cutId);
const hasAccess = await checkFileAccess(user.id, user.role, fileId);
```
📂 `backend/src/services/access.ts`

## Reference
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Best Practices](https://react.dev/learn/thinking-in-react)
- [Prisma Schema Reference](https://www.prisma.io/docs/concepts/components/prisma-schema)
- [Node.js API Design](https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction/)

## Related
- test-coverage.md
- documentation.md
- workflows/code-review.md

📂 Codebase References
- frontend/src/components/ui/Button.tsx
- frontend/src/types/index.ts
- backend/prisma/schema.prisma
- backend/src/lib/prisma.ts (Prisma singleton)
- backend/src/middleware/rateLimit.ts (rate limiters)
- backend/src/services/access.ts (access control)
- backend/src/routes/auth.ts
- backend/src/middleware/auth.ts