# Opportunity Field-Change History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record one Activity history event per deal/lead field save (built-in + custom) and show it on the opportunity detail Activity history feed.

**Architecture:** Extend the existing Activity system with `field_change`. Diff built-ins in `DealService.update` / `LeadService.update` and custom values in `EntityFieldService.upsertValues` (skipping stage-transition upserts). Frontend renders metadata.changes as old → new on one card.

**Tech Stack:** NestJS + TypeORM + Postgres enums; React Activity feed in CRM-Front-End-

**Spec:** `docs/superpowers/specs/2026-09-30-opportunity-field-change-history-design.md`

## Global Constraints

- One activity per successful save that has ≥1 real change; empty diffs write nothing
- Track all editable built-in + custom fields for DEAL and LEAD
- Do not emit field-change for stage transitions / stage-context upserts
- History write must not block saves (`tryWriteSystemEvent`)
- No backfill, analytics, or other entity types

## File map

| File | Responsibility |
|------|----------------|
| `CRM/.../activities/utils/field-change-diff.util.ts` | Equality + built-in/custom diff helpers |
| `CRM/.../activities/utils/field-change-diff.util.spec.ts` | Unit tests for diffs |
| `CRM/.../activities/enums/activity-kind.enum.ts` | Add `FIELD_CHANGE` |
| `CRM/.../activities/enums/activity-source-type.enum.ts` | Add deal/lead field_change sources |
| `CRM/src/database/migrations/1758280000000-ActivityFieldChangeEnum.ts` | Postgres enum ADD VALUE |
| `CRM/.../activities/services/activity-domain-events.service.ts` | `recordFieldChange` |
| `CRM/.../deal/services/deal.service.ts` | Hook built-in diffs after update |
| `CRM/.../lead/services/lead.service.ts` | Hook built-in diffs after update |
| `CRM/.../custom/entity-fields/entity-fields.service.ts` | Hook custom diffs; `skipFieldChangeHistory` |
| `CRM/.../custom/entity-fields/entity-fields.module.ts` | Import `ActivitiesModule` |
| `CRM-Front-End-/store/server/features/activity/types.ts` | `field_change` kind |
| `CRM-Front-End-/store/server/features/activity/utils.ts` | Label |
| `CRM-Front-End-/components/entity-activity/FieldChangeFeedItem.tsx` | Render changes |
| `CRM-Front-End-/components/entity-activity/EntityActivityFeed.tsx` | Use field-change card |

---

### Task 1: Diff utility + tests

**Files:**
- Create: `CRM/src/app/modules/activities/utils/field-change-diff.util.ts`
- Create: `CRM/src/app/modules/activities/utils/field-change-diff.util.spec.ts`

**Interfaces:**
- Produces: `FieldChangeEntry`, `fieldValuesEqual`, `diffMappedFields`, `normalizeComparableValue`, `formatFieldChangeSubject`

- [ ] **Step 1: Write failing tests** for equality, multi-field diff, empty/null, subject formatting
- [ ] **Step 2: Implement util**
- [ ] **Step 3: Run** `cd CRM && npx jest src/app/modules/activities/utils/field-change-diff.util.spec.ts --no-cache`
- [ ] **Step 4: Commit** (CRM) `feat: add field-change diff helpers`

### Task 2: Activity enums + migration + recordFieldChange

**Files:**
- Modify activity kind/source enums
- Create migration `1758280000000-ActivityFieldChangeEnum.ts`
- Modify `activity-domain-events.service.ts`

**Interfaces:**
- Produces: `ActivityDomainEventsService.recordFieldChange(params)`

- [ ] **Step 1: Add enums + migration ADD VALUE IF NOT EXISTS** for `activity_kind_enum` / `activity_sourcetype_enum` (safe no-op if types named differently — query `pg_type` pattern like other migrations)
- [ ] **Step 2: Implement `recordFieldChange`** with metadata.changes, unique sourceId using entityId + ms timestamp + fieldKeys
- [ ] **Step 3: Commit** `feat: record field_change activity events`

### Task 3: Hook deal + lead update

**Files:**
- Modify `deal.service.ts` `update`
- Modify `lead.service.ts` `update`

- [ ] **Step 1: Before mutating**, build change list from dto vs existing (built-ins only; skip stageId)
- [ ] **Step 2: After successful save + tenantId**, call `recordFieldChange` when changes.length > 0
- [ ] **Step 3: Commit** `feat: emit field-change history on deal/lead update`

### Task 4: Hook custom field upserts

**Files:**
- Modify `entity-fields.module.ts` — import `ActivitiesModule`
- Modify `entity-fields.service.ts` — inject events; collect value diffs; skip when `skipFieldChangeHistory`
- Modify stage-path `upsertValues` callers in deal/lead services to pass `skipFieldChangeHistory: true`

- [ ] **Step 1: Wire module + service**
- [ ] **Step 2: After persist loop**, if DEAL/LEAD and not skipped and value changes exist, record one event
- [ ] **Step 3: Mark stage/create/approval upserts with skip**
- [ ] **Step 4: Commit** `feat: emit field-change history on custom field upsert`

### Task 5: Frontend Activity history UI

**Files:**
- Modify activity types + utils
- Create `FieldChangeFeedItem.tsx`
- Modify `EntityActivityFeed.tsx` + empty-state copy
- Export from `entity-activity/index.ts` if needed

- [ ] **Step 1: Add kind + label**
- [ ] **Step 2: Render field_change via dedicated card (Label: old → new)**
- [ ] **Step 3: Commit** (front-end) `feat: show field changes in opportunity activity history`

---

## Self-review

- Spec coverage: all-fields, one event, deals+leads, stage exclusion, tryWrite, UI card — covered
- No placeholders in tasks
- Names consistent: `FieldChangeEntry`, `recordFieldChange`, `skipFieldChangeHistory`
