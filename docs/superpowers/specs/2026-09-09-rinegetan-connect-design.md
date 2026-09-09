# Phase 2 CMS & Platform Foundation — Design Specification

## Purpose

Deliver a secure Next.js and Supabase foundation that preserves the completed Phase 1 public website while enabling Admin and Editor to manage public church information and approved photo galleries.

## User stories

- As a visitor, I can read current announcements, events, schedules, departments, media, and photo albums without an account.
- As an Editor, I can draft, publish, archive, and correct public content directly.
- As an Admin, I can invite/deactivate staff, inspect an audit trail, and perform permanent deletions safely.
- As a visitor, I only see photos with public consent and can download only assets/collections that are explicitly enabled for public download.

## Functional design

### Staff access

The application has a staff sign-in route. Public sign-up is disabled. Admin invites an Editor; the recipient establishes a password through the Supabase Auth flow. Protected routes verify the session and role on the server before rendering or mutating.

### CMS

The admin area has content sections for announcements, events, schedules, schedule exceptions, departments, albums, and assets. Each editor form supports Draft, Published, and Archived. Content lists expose filters by status and time; public pages query only eligible Published records.

### Gallery

Albums have a category, activity date, optional event/department, cover, description, and ordered assets. Assets have consent, hidden, processing, alt text, and download flags. The public gallery begins with filterable albums, opens accessible lightbox/grid views, and only exposes safe downloads.

### Audit

Record create, update, publish, archive, hide, role change, invite, and permanent delete with actor, target, time, correlation ID, and redacted change summary. Do not record secrets or pastoral payloads.

## Non-functional design

- Preserve 7-column Creation Grid and existing public URLs.
- Target WCAG 2.2 AA and mobile-first layout.
- Enforce RLS/grants on every exposed table and bucket.
- Store all times in UTC and present content in Asia/Makassar.
- Keep the pilot within a controlled 1 GB media storage budget.
- Make migrations, policies, and tests reproducible in source control.

## Out of scope

Public forms, Bible courses, Adventech content, PWA, push, WhatsApp, Member roles/accounts, cloud progress, video hosting, and a page builder.

## Acceptance criteria

1. Admin and Editor permissions are proven by RLS tests.
2. Public content cannot expose drafts, archived records, private fields, or unconsented media.
3. The Phase 1 visual identity and rute are retained after refactor.
4. Gallery download output contains only eligible JPEG derivatives and follows limits.
5. Operations can use the CMS without editing source code for Phase 2 content.
