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

## Quick Example
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
- backend/src/routes/auth.ts
- backend/src/middleware/auth.ts