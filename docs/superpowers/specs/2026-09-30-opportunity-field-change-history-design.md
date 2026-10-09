# Opportunity field-change history

**Date:** 2026-09-30  
**Scope:** Deal and lead field edits surfaced as one Activity history event per save  
**Approach:** A — extend the existing Activity system (`field_change` kind); no separate history table

## Goals

- When someone changes one or more fields on a deal or lead, record **one** history event for that save.
- Show that event in the opportunity detail **Activity history** section (same feed as stage changes, logged activities, and system events).
- Track **all** editable fields: built-in columns and custom entity fields.
- Backend supports both deals and leads; Opportunities UI currently shows deals only (leads remain hidden by product config).

## Non-goals

- Backfilling historical field edits that already happened
- Field-change analytics, filters, export, or reporting dashboards
- Customers, contacts, campaigns, or other entity types
- Treating stage transitions as field changes (stage history stays as today)
- Blocking saves if history write fails

## Approach comparison (chosen: A)

| | A — Activity event | B — Dedicated history table | C — Generic audit platform |
|---|---|---|---|
| Fit | Matches existing Activity history feed | Extra API + merge like stage history | Large new subsystem |
| Cost | Low | Medium | High |
| Analytics | Limited (activity metadata) | Stronger | Strongest |

**Chosen:** A.

## Architecture

```
Deal/Lead update  ──diff built-ins──┐
                                    ├──► ActivityDomainEventsService.recordFieldChange
Custom field upsert (DEAL/LEAD) ───┘              │
                                                  ▼
                                         Activity (kind=field_change)
                                                  │
                                                  ▼
                              EntityActivityFeed on detail page
```

## Backend

### Activity model

- Add `ActivityKind.FIELD_CHANGE = 'field_change'`.
- Add source types:
  - `deal_field_change`
  - `lead_field_change`
- Persist via `ActivityWriterService.tryWriteSystemEvent` so write failures never block the domain update.
- Idempotency `sourceId`: include entity id + stable fingerprint of the change set + timestamp (or request/save id) so retries of the **same** write can dedupe without collapsing two legitimate consecutive edits that happen to set the same values.

### Event shape

One activity per successful save that has at least one real change:

- `subject`: e.g. `Fields updated` (or `1 field updated` / `N fields updated`)
- `summary`: short human-readable line (optional; UI may prefer metadata)
- `kind`: `field_change`
- `origin`: `system`
- `actorId`: requesting user when available
- `entityType` / `entityId`: `DEAL` or `LEAD`
- `metadata.changes`: array of:

```ts
{
  fieldKey: string;      // built-in column name or custom field id
  fieldLabel: string;    // display label
  oldValue: unknown;     // normalized for display/compare
  newValue: unknown;
}
```

Display formatting (null/empty → "—", booleans/dates/currency/options) is the frontend’s responsibility; backend stores raw/normalized comparable values and labels.

### Diff rules

**Built-in fields** (deal and lead `update` paths):

- Diff before persist against the loaded entity.
- Include only fields present on the update DTO that actually change.
- Examples: name, description, customer, contact, type, value, currency, expected close, responsible user, session, exact value (when allowed), and any other updatable scalar/relation ids on those DTOs.
- Do **not** emit field-change events for `stageId` / stage transitions (those use existing stage history + stage activity kinds). Updates already reject direct stage edits on deal update.

**Custom fields** (`entity-fields.service.upsertValues`):

- Only when `entityType` is `LEAD` or `DEAL`.
- Load existing values; emit only fields whose new value differs.
- Use field label from the entity-field definition.
- If the same HTTP/user action updates built-ins and custom fields as separate API calls, each call that has changes produces **one** event (two events total). Prefer coalescing only when both happen in the same backend transaction/handler; do not invent client-side batching in v1.

**No-op:** if the change list is empty after diff, write nothing.

### Hooks

1. `DealService.update` — after successful save, if built-in diffs exist → `recordFieldChange`.
2. `LeadService.update` — same.
3. `EntityFieldsService.upsertValues` — after successful upsert for DEAL/LEAD, if custom diffs exist → `recordFieldChange`.
4. Stage-change handlers that also upsert transition field values: do **not** emit a separate field-change activity for values captured as stage transition context (those remain on stage history / change reason). Only standalone custom-field upserts and entity updates produce field-change activities.

### Migration / enum

- Extend Postgres activity `kind` enum (and any TypeORM enum sync) with `field_change`.
- Extend `activity_source_type` enum with `deal_field_change` and `lead_field_change`.

## Frontend

### Types and labels

- Add `field_change` to `ActivityKind` and `activityKindLabel` → `Field change` (or `Fields updated`).

### Activity history UI

- In `EntityActivityFeed`, render `field_change` activities as one card:
  - Badge: Field change
  - Title: subject (e.g. `3 fields updated`)
  - Body: list of `Label: old → new` from `metadata.changes`
  - Footer: occurred-at (same as other items)
- Truncate long lists sensibly (e.g. show first N + “and M more”) if needed for readability; full list acceptable for typical small saves.
- Empty-state copy can mention field changes alongside stage changes and logged activities.
- Works for `entityType === 'DEAL'` and `'LEAD'` (lead detail ready if leads UI is enabled).

### Out of scope for UI

- Dedicated filter chip for field changes only
- Diff viewer / JSON expand for complex custom values beyond stringified display

## Error handling

- History write uses try/swallow pattern already used for system activities.
- Missing actor id still records the event without actor.
- Unknown custom field labels fall back to `fieldKey`.

## Testing

- Unit: diff helper — unchanged values omitted; multiple fields → one change list; null ↔ value counted.
- Service: update with two built-in changes writes one activity with two metadata entries; no-op update writes zero.
- Custom upsert: one changed custom field → one activity; DEAL/LEAD only.
- Frontend: `field_change` activity renders label old → new without crashing on missing metadata.

## Success criteria

- Editing opportunity (deal) fields produces one Activity history entry listing every changed field.
- Same behavior for leads in API/history when lead detail is used.
- Stage moves remain on existing stage history path.
- Failed history writes do not fail the user-facing update.
