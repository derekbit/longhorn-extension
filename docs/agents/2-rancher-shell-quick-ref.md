# Rancher Shell Quick Reference (AI Best Practices)

## Purpose

Use this guide to make consistent, low-risk changes in the Longhorn UI Extension.

- Project: Longhorn Extension for Rancher Dashboard
- Stack: Vue 3, TypeScript, Vuex
- Primary dependency: `@rancher/shell`

## Core Workflow (Always Follow)

Before writing code, resolve in this order:

1. `@shell` (`node_modules/@rancher/shell/`)
2. `@components` (`dashboard/pkg/rancher-components/`)
3. Custom implementation in `@longhorn` (`pkg/longhorn/`) only when 1 and 2 do not fit

Why: this avoids duplication, keeps behavior aligned with Rancher Shell, and reduces maintenance cost.

## Path Aliases

| Alias           | Target                               |
| :-------------- | :----------------------------------- |
| `@shell/*`      | `node_modules/@rancher/shell/*`      |
| `@components/*` | `dashboard/pkg/rancher-components/*` |
| `@longhorn/*`   | `pkg/longhorn/*`                     |

## Fast Discovery Commands

```bash
# 1) Check @shell first
ls node_modules/@rancher/shell/components/
ls node_modules/@rancher/shell/components/form/
ls node_modules/@rancher/shell/utils/

# 2) Check shared Rancher components
ls dashboard/pkg/rancher-components/

# 3) Find usage examples in extension code
rg "ComponentName|utilityName" pkg/longhorn/
```

## Common Shell Locations

- Forms: `@shell/components/form/` (LabeledInput, LabeledSelect, UnitInput, KeyValue)
- Layout: `@shell/components/` (CruResource, Card, Tabbed, Tab, ResourceTable)
- Utilities: `@shell/utils/` (object, string, time, error, units, promise, validators)

Useful in-repo references:

- `pkg/longhorn/edit/longhorn.io.backingimage.vue`
- `pkg/longhorn/dialog/BackupUrlDialog.vue`
- `pkg/longhorn/formatters/NodeReadiness.vue`

## Store Access Patterns (Preferred)

```javascript
// Get all resources
this.$store.getters['cluster/all'](LONGHORN.VOLUMES);

// Get one resource
this.$store.getters['cluster/byId'](LONGHORN.VOLUMES, 'id');

// Fetch all resources from backend
await this.$store.dispatch('cluster/findAll', { type: LONGHORN.VOLUMES });

// Fetch one resource from backend
await this.$store.dispatch('cluster/find', { type: LONGHORN.SETTINGS, id: 'name' });
```

## Shell Requirements

1. Component priority: use `@shell` before custom UI.
2. AsyncButton contract: call `buttonCb(true)` on success and `buttonCb(false)` on failure.
3. Styling: prefer Rancher utility classes (`row`, `col span-X`, `mt-20`, `mb-10`, `text-success/error/warning`).
4. Data access: use `cluster` store APIs for resources; avoid direct API calls.
5. Scope discipline: avoid unrelated refactors in feature/bugfix changes.

## Quality Bar For AI-Generated Changes

Every change should be:

1. Minimal: only touched files needed for the request.
2. Predictable: follows existing file patterns and naming.
3. Safe: no behavior change outside requested scope.
4. Verifiable: includes clear manual validation steps.
