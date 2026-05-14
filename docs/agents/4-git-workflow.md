# Git Workflow

## Commit Message Format (Conventional Commits)

```
<type>(<scope>): <subject>
```

### Type

- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `style` - UI/CSS changes
- `chore` - Build/tooling changes
- `docs` - Documentation

### Scope

Resource or area affected:

- `volume`, `node`, `backup`, `backing-image`
- `ui`, `model`, `formatter`, `i18n`

### Examples

```
feat(volume): add snapshot creation dialog
fix(node): correct readiness state display
refactor(model): extract common state display logic
style(table): improve column spacing
chore(deps): update @rancher/shell to 3.0.12
docs(agents): update form validation guide
```

## Commit Requirements

### 1. Sign-off Required (DCO)

**All commits must be signed off using `-s` flag:**

```bash
git commit -s -m "feat(volume): add snapshot feature"
```

This adds `Signed-off-by: Your Name <your.email@example.com>` to the commit message.

**Critical:** Never commit without sign-off. The commit will be rejected.

### 2. Pre-commit Checklist

**Automated (hooks will run automatically):**

- ✅ Linting and formatting (`lint-staged` runs `prettier` + `eslint --fix`)
- ✅ Commit message format (`commitlint` checks Conventional Commits)

**Manual verification required before commit:**

1. **TypeScript type check passes:**

   ```bash
   yarn type-check
   ```

2. **Sign-off included:**
   ```bash
   git commit -s -m "feat(scope): description"
   ```

**Note:** Pre-commit hooks will auto-format your code. If type-check fails, fix errors before committing.

## Commit Best Practices

1. **Keep commits focused**: One commit per logical change
2. **Reference issues when applicable**: `Fixes #123` (optional but helpful)
3. **Write clear subjects**: Describe what changed, not how
