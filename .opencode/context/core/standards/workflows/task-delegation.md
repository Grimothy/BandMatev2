<!-- Context: standards/workflows/task-delegation.md -->

# Task Delegation Standards

## Core Idea
Implement systematic task delegation processes to ensure efficient project management, clear responsibilities, and timely delivery of features.

## Key Points
- **Task Breakdown**: Decompose features into small, actionable tasks with acceptance criteria
- **Assignment Criteria**: Match tasks to developer skills, workload balance, learning opportunities
- **Progress Tracking**: Daily standups, task status updates, blockers identification
- **Communication**: Clear task descriptions, regular check-ins, feedback loops
- **Estimation**: Story points or time estimates, velocity tracking, sprint planning
- **Documentation**: Task completion criteria, testing requirements, deployment notes

## Quick Example
**Task Description Format:**
```
Title: Implement user authentication flow

Description: 
- Add login/register forms with validation
- Integrate with backend auth API
- Handle JWT token storage
- Redirect authenticated users

Acceptance Criteria:
- [ ] Forms validate email/password
- [ ] API calls handle success/error
- [ ] Token persists across sessions
- [ ] Protected routes work correctly

Estimated: 3 days
Assignee: @developer
```

## Reference
- [Agile Task Management](https://www.atlassian.com/agile/project-management)
- [Scrum Guide](https://scrumguides.org/scrum-guide.html)

## Related
- workflows/code-review.md
- documentation.md

📂 Codebase References
- frontend/src/pages/Login.tsx
- backend/src/routes/auth.ts
- frontend/src/context/AuthContext.tsx