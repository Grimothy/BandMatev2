<!-- Context: standards/workflows/code-review.md -->

# Code Review Workflow Standards

## Core Idea
Establish structured code review processes to maintain code quality, share knowledge, and ensure consistent implementation across the team.

## Key Points
- **Pull Request Template**: Description, testing instructions, screenshots, related issues
- **Review Checklist**: Code quality, tests, documentation, performance, security
- **Approval Process**: Minimum reviewers, blocking comments resolution, CI checks
- **Feedback Guidelines**: Constructive comments, specific suggestions, knowledge sharing
- **Review Timeline**: Response within 24 hours, completion within 3 days
- **Merge Strategy**: Squash commits, conventional commit messages

## Quick Example
**Review Checklist:**
- [ ] Code follows TypeScript/React best practices
- [ ] Tests added/updated with good coverage
- [ ] Documentation updated (README, API docs)
- [ ] No console.logs or debugging code
- [ ] Performance considerations addressed
- [ ] Security implications reviewed
- [ ] Database migrations tested

## Reference
- [GitHub Pull Request Reviews](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/about-pull-request-reviews)
- [Code Review Best Practices](https://google.github.io/eng-practices/review/)

## Related
- test-coverage.md
- documentation.md
- workflows/task-delegation.md

📂 Codebase References
- frontend/package.json
- backend/package.json
- .gitignore (if exists)