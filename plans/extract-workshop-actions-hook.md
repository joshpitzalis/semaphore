# Plan: Extract `useWorkshopActions()` Hook

## Context

We just extracted a pure `WorkshopState` state machine from `WorkshopRoom` (see `src/worker/workshopState.ts`). The next step is to give route components a clean, domain-level API instead of raw `send()` calls with manually constructed `ClientMessage` objects.

**Problem**: Both route files (`$slug.index.tsx`, `$slug.$name.tsx`) manually construct protocol messages, duplicate validation logic, and manage error/rename callbacks individually.

## Approach: TDD + Vertical Slice

New file lives in `src/lib/useWorkshopActions.ts` — it's shared lib plumbing, not its own feature. Tests in `src/lib/useWorkshopActions.test.ts`.

The hook wraps `useWorkshopSocket` and exposes named action methods instead of raw `send()`.

## Target Interface

```ts
function useWorkshopActions(slug: string, options?: { joinAs?: string }) {
  return {
    // State (passthrough from useWorkshopSocket)
    participants: Participant[],
    workshopClosed: boolean,

    // Actions (replace raw send())
    updateStatus: (name: string, status: Status) => void,
    leave: (name: string) => void,
    rename: (oldName: string, newName: string) => void,
    closeWorkshop: () => void,

    // Error state (replaces onError callback)
    error: string | null,
    clearError: () => void,

    // Rename result (replaces onRenamed callback)
    renamedTo: { oldName: string; newName: string } | null,
  }
}
```

## Vertical Slices (TDD red-green order)

### Slice 1: Basic action methods
**RED**: Test that `useWorkshopActions` returns action functions that call `send()` with correct `ClientMessage` shapes.
**GREEN**: Create hook that wraps `useWorkshopSocket`, exposes `updateStatus`, `leave`, `rename`, `closeWorkshop`.

### Slice 2: Error state
**RED**: Test that errors from the server populate `error` state, and `clearError` clears it.
**GREEN**: Move `onError` callback into the hook, expose `error` + `clearError`.

### Slice 3: Rename result
**RED**: Test that `renamedTo` populates when server sends `renamed` message.
**GREEN**: Move `onRenamed` callback into the hook, expose `renamedTo`.

### Slice 4: Wire up `$slug.$name.tsx`
Refactor the participant route to use `useWorkshopActions` instead of raw `send()` + callbacks.

**Before** (`$slug.$name.tsx`):
- Line 56: `send({ type: "status", name, status })` → `actions.updateStatus(name, status)`
- Line 60: `send({ type: "leave", name })` → `actions.leave(name)`
- Line 72: `send({ type: "rename", oldName: name, newName })` → `actions.rename(name, newName)`
- Lines 18-29: `onRenamed` callback → read `actions.renamedTo` + useEffect for navigation
- Lines 31-33: `onError` callback → read `actions.error`

**After**: Route has zero `ClientMessage` knowledge and zero validation duplication.

### Slice 5: Wire up `$slug.index.tsx`
Refactor the dashboard route to use `useWorkshopActions`.

**Before** (`$slug.index.tsx`):
- Line 63: `send({ type: "close_workshop" })` → `actions.closeWorkshop()`
- Lines 43-54: Client-side name validation in `handleJoin()` — keep navigation logic, remove duplicated "name taken" check since server validates on join

**After**: Route uses `actions.closeWorkshop()` and relies on server validation for join.

### Slice 6: Cleanup
- Remove `send` from `useWorkshopSocket` return type (if no longer needed externally)
- Verify all tests pass (unit + existing integration)
- Run full suite

## Files Changed

| File | Change |
|------|--------|
| `src/lib/useWorkshopActions.ts` | **NEW** — hook wrapping useWorkshopSocket |
| `src/lib/useWorkshopActions.test.ts` | **NEW** — tests for action methods, error/rename state |
| `src/routes/$slug.$name.tsx` | **MODIFY** — replace send() + callbacks with useWorkshopActions |
| `src/routes/$slug.index.tsx` | **MODIFY** — replace send() with useWorkshopActions |
| `src/lib/useWorkshopSocket.ts` | **MAYBE MODIFY** — remove `send` export if fully wrapped |

## Key Decisions

1. **Keep `useWorkshopSocket` as-is internally** — `useWorkshopActions` wraps it, doesn't replace it. This keeps the refactor safe and reversible.
2. **Error/rename as reactive state, not callbacks** — routes read `error` and `renamedTo` instead of passing callbacks. Simpler to test, simpler to consume.
3. **No client-side validation in the hook** — the server (`WorkshopState`) is the single source of truth. The hook sends and reports errors. This eliminates the duplication problem entirely.
4. **`joinAs` stays as a passthrough option** — the join message is sent automatically by `useWorkshopSocket` on connect, so the actions hook just passes it through.

## Testing Strategy

Slices 1-3 use a mock of `useWorkshopSocket` to verify the hook calls `send()` correctly and manages state from callbacks. Slices 4-5 are verified by running the existing test suite + manual smoke test.
