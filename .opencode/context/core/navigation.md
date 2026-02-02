# Context Navigation

## Standards Organization

| Category | File | Purpose | Dependencies |
|----------|------|---------|-------------|
| Code Quality | standards/code-quality.md | Frontend/backend coding standards | - |
| UI Components | standards/ui-components.md | shadcn/ui component standards & MCP usage | code-quality.md |
| Documentation | standards/documentation.md | Documentation practices | code-quality.md |
| Testing | standards/test-coverage.md | Testing frameworks and coverage | code-quality.md |
| Code Review | standards/workflows/code-review.md | PR review process | test-coverage.md, documentation.md |
| Task Delegation | standards/workflows/task-delegation.md | Project management workflow | code-review.md |

## Loading Strategy

1. Start with code-quality.md for foundational standards
2. Follow with documentation.md and test-coverage.md in parallel
3. Implement workflows (code-review.md, task-delegation.md) last

## Dependency Map

```
code-quality.md
├── ui-components.md
├── documentation.md
├── test-coverage.md
└── workflows/
    ├── code-review.md
    └── task-delegation.md
```

## Related Context Files

- concepts/: Core domain concepts
- guides/: Implementation guides
- examples/: Code examples
- lookup/: Reference tables
- errors/: Error handling patterns