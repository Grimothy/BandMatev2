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

## Reference
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Related
- code-quality.md
- workflows/code-review.md

📂 Codebase References
- frontend/package.json
- backend/package.json
- frontend/src/components/ui/Button.tsx
- backend/src/services/auth.ts