# Extension Architecture (AI Decision Guide)

## Purpose

Understand where to place code and how Shell auto-imports work.

- Longhorn UI Extension is a **plugin** for Rancher Shell, not a standalone app
- Shell provides base framework; extension adds Longhorn-specific logic
- File naming determines what Shell auto-loads

## Core Concept: Auto-Import by File Name

Shell automatically imports files matching this pattern:

```
Resource type: longhorn.io.volume
         ↓
Model:  models/longhorn.io.volume.js
Edit:   edit/longhorn.io.volume.vue
Detail: detail/longhorn.io.volume.vue
```

**No manual registration needed.** Shell matches filename to resource type.

## File Type Mapping

| File Location             | Purpose                                      | When to Edit                                |
| :------------------------ | :------------------------------------------- | :------------------------------------------ |
| `models/*.js`             | Business logic, computed properties, actions | State display, add actions, computed fields |
| `edit/*.vue`              | Create/edit forms                            | Form fields, validation rules               |
| `detail/*.vue`            | Detail pages (read-only)                     | Detail display, add tabs                    |
| `formatters/*.vue`        | Table cell formatters                        | Custom column rendering                     |
| `config/table-headers.ts` | Table column definitions                     | Add/remove/reorder columns                  |
| `dialog/*.vue`            | Dialogs/modals                               | Custom dialogs                              |
| `components/*.vue`        | Reusable components                          | Shared UI logic                             |

## Decision Rules: Which File to Edit?

**What determines the file?**

- UI display (read-only) → `detail/*.vue` or `formatters/*.vue`
- Form input/creation → `edit/*.vue`
- Business logic/state/actions → `models/*.js`
- Table columns → `config/table-headers.ts`
- Dialog/modal → `dialog/*.vue`
- Reusable UI → `components/*.vue`

**Examples:**

- Fix state color → `models/*.js` (stateBackground)
- Add form field → `edit/*.vue`
- Add table column → `config/table-headers.ts` + `formatters/*.vue` (if custom rendering)

## Inheritance Patterns (Required)

**Correct inheritance chain:**

```
SteveModel (@shell/plugins/steve/steve-class)
    ↓
LonghornModel (pkg/longhorn/models/longhorn.js)
    ↓
LonghornVolume, LonghornNode, etc.
```

**Models must extend LonghornModel:**

- Inherited from LonghornModel: state display/background helpers, action sanitization, message normalization
- Inherited from SteveModel: `this.metadata`, `this.spec`, `this.status`, `this.save()`, `this.remove()`
- Add: custom getters, `availableActions()`, action methods

**Edit Forms must use CreateEditView mixin:**

- Import: `@shell/mixins/create-edit-view`
- Inherited: `this.value`, `this.mode`, `this.save()`, `this.done()`
- Add: form fields, `fvFormRuleSets()` for validation

## Architecture Rules (Always Verify)

1. **File Naming**: Filename must match resource type exactly (e.g., `longhorn.io.volume.js` for resource `longhorn.io.volume`).

2. **Model Inheritance**: Models must extend `LonghornModel` from `pkg/longhorn/models/longhorn.js`.

3. **Edit Mixin**: Edit forms must use `CreateEditView` mixin from `@shell/mixins/create-edit-view`.

4. **No Reimplement**: Don't reimplement logic that Shell or LonghornModel already provides.

5. **Separation**: Model = logic, Edit = forms, Detail = display, Formatters = table cells.

**Before commit, verify:**

- Filename matches resource type
- Model extends LonghornModel
- Edit uses CreateEditView mixin
- No duplicate logic between files
- Consistent with similar resources
