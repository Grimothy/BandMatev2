<!-- Context: standards/test-coverage.md -->

# Test Coverage Standards

## Core Idea
Implement comprehensive testing standards using Jest and React Testing Library to ensure code reliability, prevent regressions, and support refactoring.

## Key Points
- **Test Types**: Unit tests for components/hooks, integration tests for API calls, E2E for critical flows
- **Coverage Goals**: 80%+ line coverage, 90%+ branch coverage, focus on critical paths
- **Testing Frameworks**: Jest for test runner, React Testing Library for component testing
- **Test Organization**: Colocate tests with components, descriptive test names, AAA pattern
- **Mocking Strategy**: Mock external APIs, database calls, file uploads
- **CI Integration**: Automated test runs, coverage reports, failure notifications
- **Build Integration**: Tests must pass before production builds (`./build.sh`)

## When to Add Tests

### Always Add Tests For:
1. **New Features**: Any new functionality needs corresponding tests
2. **Bug Fixes**: Write a test that reproduces the bug, then fix it (regression prevention)
3. **API Endpoints**: All new routes need integration tests
4. **Complex Business Logic**: Any non-trivial calculations, transformations, or workflows
5. **User-Facing Components**: Components with significant interactivity or state

### Test Decision Framework
When implementing a new feature or fixing a bug, ask:
- Could this break silently in the future? → Add test
- Is this a critical user path (auth, payments, data creation)? → Add test
- Does this involve complex state or logic? → Add test
- Is this a simple pass-through or styling-only change? → Consider skipping

### Examples of What to Test
- ✅ API route handlers (request/response cycles)
- ✅ Authentication flows (login, logout, token refresh)
- ✅ WebSocket event handlers (connection, room management)
- ✅ Database service functions (CRUD operations)
- ✅ Activity/notification creation and delivery
- ✅ Permission checks (admin vs member access)
- ✅ Form validation and submission
- ✅ Component state changes

### Examples of What NOT to Test
- ❌ Simple presentational components with no logic
- ❌ Third-party library internals
- ❌ CSS/styling changes
- ❌ Prisma schema (DB constraints handle this)

## Running Tests

### Quick Test Run
```bash
./test.sh
```

### Full Build with Tests
```bash
./build.sh
```
Tests must pass for the build to proceed.

### Docker Test Environment
Tests run in Docker with a clean PostgreSQL database:
```bash
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit
```

## Quick Example
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

test('renders button with text', () => {
  render(<Button onClick={() => {}}>Click me</Button>);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});

test('calls onClick when clicked', () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  fireEvent.click(screen.getByText('Click me'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

## Backend Integration Test Example
```typescript
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/database';

describe('Activities API', () => {
  beforeEach(async () => {
    await prisma.activity.deleteMany();
  });

  it('should return activities for project members', async () => {
    // Setup: Create user, project, membership
    const user = await createTestUser();
    const project = await createTestProject();
    await addMemberToProject(user.id, project.id);
    
    // Execute
    const response = await request(app)
      .get('/api/activities')
      .set('Authorization', `Bearer ${user.token}`);
    
    // Assert
    expect(response.status).toBe(200);
    expect(response.body.activities).toBeDefined();
  });
});
```

## Agent Guidelines

When implementing features, agents should:
1. **Consider testability** during implementation
2. **Ask about test requirements** if uncertain: "Should I add tests for [feature]?"
3. **Run existing tests** before committing: `./test.sh`
4. **Add tests for bug fixes** to prevent regressions
5. **Update tests** when modifying existing functionality

## Reference
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Related
- code-quality.md
- workflows/code-review.md
- workflows/activity-notifications.md

📂 Codebase References
- frontend/package.json
- backend/package.json
- backend/src/tests/ (test files)
- Dockerfile.test (test environment)
- docker-compose.test.yml (test infrastructure)
- build.sh (build with tests)
- test.sh (quick test run)
