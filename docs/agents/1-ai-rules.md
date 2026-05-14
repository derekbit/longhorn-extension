# AI Assistant Rules

## Core Rules (Must Follow)

### ✅ Always Do

1. **Read before Edit**
   - ALWAYS use Read tool first before modifying any file
   - Never assume file content - always verify current state

2. **Minimal Scope Changes**
   - Only change what is explicitly requested
   - Do NOT refactor unrelated code
   - Keep changes focused and reviewable

3. **No Unnecessary Comments**
   - Code should be self-explanatory with good naming
   - Only add comments for complex business logic
   - Do NOT add comments that just restate the code

4. **TypeScript Strict**
   - All new code must be TypeScript
   - NEVER use `any` type - use proper types from `pkg/longhorn/types/`
   - If type is truly unknown, use `unknown` and add type guards

5. **i18n Always**
   - NEVER hardcode user-facing text
   - ALL text must use `t('longhorn.key.path')`
   - Add new keys to `pkg/longhorn/l10n/en-us.yaml`

6. **Run lint before commit**
   - Check for linting errors before finalizing changes
   - Fix any warnings or errors reported

7. **Follow existing naming conventions**
   - Match the project's naming style for files, variables, and functions
   - Check similar files for patterns

8. **Auto-format with eslint**
   - After changing any `.vue`, `.js`, or `.ts` file, ensure it's automatically formatted
   - Run `yarn lint:fix` if needed

### 🚫 Never Do

1. **Do NOT modify unrelated code**
   - Common mistake: "improving" nearby code while fixing a bug
   - Only touch the specific code needed for the task

2. **Do NOT commit or log secrets, .env, or API keys**
   - Never commit sensitive data
   - Never log credentials or API keys

3. **Do NOT edit node_modules/**
   - Never modify dependencies directly
   - Make changes in the project source code only

4. **Do NOT modify package.json dependencies**
   - Never add, remove, or update dependencies
   - Never run `yarn add`, `yarn remove`, or `yarn upgrade`
   - If a dependency is needed, inform the user and let them add it manually
