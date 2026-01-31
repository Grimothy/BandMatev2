<!-- Context: standards/documentation.md -->

# Documentation Standards

## Core Idea
Standardize documentation practices to provide clear, comprehensive, and maintainable project information for developers, users, and stakeholders.

## Key Points
- **README Structure**: Project overview, setup instructions, usage examples, contributing guidelines
- **API Documentation**: OpenAPI/Swagger specs, endpoint descriptions, request/response schemas
- **Code Comments**: JSDoc for functions, inline comments for complex logic, TypeScript interfaces
- **Architecture Docs**: System diagrams, data flow, component relationships
- **Change Logs**: Version releases, breaking changes, migration guides
- **Inline Documentation**: Component props, function parameters, return types

## Quick Example
```typescript
/**
 * Authenticates a user with email and password
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise<User> - Authenticated user object
 * @throws {AuthenticationError} When credentials are invalid
 */
async function authenticateUser(email: string, password: string): Promise<User> {
  // Implementation
}
```

## Reference
- [JSDoc Guide](https://jsdoc.app/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Conventional Commits](https://conventionalcommits.org/)

## Related
- code-quality.md
- workflows/task-delegation.md

📂 Codebase References
- frontend/package.json
- backend/package.json
- frontend/src/api/client.ts
- backend/src/routes/index.ts