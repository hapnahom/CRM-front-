# CRM Frontend

[![Next.js CI](https://github.com/IE-Network-Solutions/CRM-Front-End-/actions/workflows/ci.yml/badge.svg)](https://github.com/IE-Network-Solutions/CRM-Front-End-/actions/workflows/ci.yml)

Multi-tenant Customer Relationship Management (CRM) web application for the SelamNew product ecosystem. Built with [Next.js](https://nextjs.org/) 14 and TypeScript, this frontend provides the UI for lead and deal pipeline management, customers and contacts, targets, reporting, dashboards, and user access control.

It pairs with the [CRM Backend API](https://github.com/IE-Network-Solutions/CRM) and integrates with SelamNew services for authentication, organizational structure, and tenant management.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Authentication & Authorization](#authentication--authorization)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Docker](#docker)
- [CI/CD](#cicd)

## Overview

The CRM frontend is a Next.js App Router application that authenticates users via Firebase, resolves the active workspace (tenant), and calls the CRM REST API with a Firebase JWT and `tenantId` header on every protected request.

Beyond CRM-specific screens, the app also surfaces modules shared across SelamNew (org structure, OKR, payroll, timesheet, and others) when the corresponding service URLs are configured.

## Features

### Sales Pipeline

- **Leads** — Pipeline views, stages, sources, activities, documents, and scoring
- **Deals** — Deal pipeline, stages, and activity tracking
- **Customers & Contacts** — Account and contact management
- **Activities** — Cross-cutting activity views

### Sales Operations

- **Dashboard** — KPIs, pipeline summaries, and conversion analytics
- **Reports** — Pipeline metrics, lead source performance, sector performance, deals requiring attention
- **Targets** — Target plans, distribution, and forecast (when enabled)

### User & Access Management

- **Users, Roles & Permissions** — RBAC aligned with the CRM backend permission catalog
- **Teams** — Team membership and management
- **Invitations** — External user invitation accept/decline flows

### Platform Capabilities

- Firebase authentication with token refresh and route protection via middleware
- Multi-tenant workspace resolution with fallback tenant support
- Request/response payload encryption (configurable; disabled in local development)
- Excel/PDF export on selected screens
- Metabase analytics embedding

## Architecture

```
┌──────────────────┐   Firebase JWT     ┌──────────────────┐
│   Browser        │ ─────────────────► │  CRM Frontend    │
│                  │   + tenantId       │  (Next.js)       │
└──────────────────┘                    └────────┬─────────┘
                                                 │
                    ┌────────────────────────────┼────────────────────────────┐
                    ▼                            ▼                            ▼
            ┌──────────────┐            ┌──────────────┐            ┌──────────────┐
            │  CRM API     │            │   Firebase   │            │  SelamNew    │
            │  (NestJS)    │            │    Auth      │            │  Services    │
            └──────────────┘            └──────────────┘            └──────────────┘
```

Protected routes are guarded by `middleware.ts`, which redirects unauthenticated users to `/authentication/login`. API calls attach `Authorization: Bearer <token>` and the active `tenantId` from the authentication store.

## Tech Stack

| Layer            | Technology                             |
| ---------------- | -------------------------------------- |
| Framework        | Next.js 14 (App Router)                |
| Language         | TypeScript                             |
| UI               | Ant Design, Radix UI, Tailwind CSS     |
| State            | Zustand (client), React Query (server) |
| Authentication   | Firebase Auth                          |
| HTTP             | Axios (with optional encryption)       |
| Charts           | Chart.js, react-chartjs-2              |
| Testing          | Jest, Testing Library, Cypress         |
| Process Manager  | PM2 (production)                       |
| Containerization | Docker (multi-stage)                   |

## Prerequisites

- **Node.js** 20.x (CI target; Docker images use Node 18 Alpine)
- **npm**
- **CRM Backend API** running locally or accessible remotely (default `http://localhost:3021/api/v1`)
- **Firebase** project credentials for client-side authentication
- Access to SelamNew org/employee and tenant management endpoints (for full functionality)

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/IE-Network-Solutions/CRM-Front-End-.git
cd CRM-Front-End-
npm install
```

### 2. Configure environment

Copy the example environment file and fill in your values:

```bash
cp env.example .env
```

See [Configuration](#configuration) for variable descriptions. At minimum, set Firebase credentials and `NEXT_PUBLIC_CRM_URL` pointing at your CRM API.

### 3. Start the CRM backend

The frontend expects the [CRM Backend API](https://github.com/IE-Network-Solutions/CRM) to be running. See that repository's README for setup. The default local API base is:

```
http://localhost:3021/api/v1
```

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Unauthenticated users are redirected to `/authentication/login`.

| Script                 | Purpose                        |
| ---------------------- | ------------------------------ |
| `npm run dev`          | Development server (port 3000) |
| `npm run build`        | Production build               |
| `npm run start`        | Start production server        |
| `npm run stage`        | Start on port 3005             |
| `npm run lint`         | ESLint with auto-fix           |
| `npm run format`       | Prettier formatting            |
| `npm run test`         | Jest unit tests                |
| `npm run cypress:open` | Open Cypress interactively     |
| `npm run cypress:run`  | Run Cypress headlessly         |

Production deployments use PM2 on port **3020** (see `ecosystem.config.js`).

## Configuration

Key environment variables:

| Variable                          | Description                                        | Example                        |
| --------------------------------- | -------------------------------------------------- | ------------------------------ |
| `NEXT_PUBLIC_CRM_URL`             | CRM API base URL (required)                        | `http://localhost:3021/api/v1` |
| `NEXT_PUBLIC_API_KEY`             | Firebase API key                                   | —                              |
| `NEXT_PUBLIC_AUTH_DOMAIN`         | Firebase auth domain                               | —                              |
| `NEXT_PUBLIC_PROJECT_ID`          | Firebase project ID                                | —                              |
| `NEXT_PUBLIC_APP_ID`              | Firebase web app ID                                | —                              |
| `NEXT_PUBLIC_DEFAULT_TENANT_ID`   | Fallback tenant when workspace cannot be resolved  | UUID                           |
| `ORG_AND_EMP_URL`                 | SelamNew org/employee service URL                  | —                              |
| `TENANT_BASE_URL`                 | Tenant management service base URL                 | —                              |
| `NOTIFICATION_URL`                | Notification service URL                           | —                              |
| `PUBLIC_DOMAIN`                   | Public domain for tenant resolution                | —                              |
| `NEXT_PUBLIC_ENCRYPTION_DISABLED` | Skip payload encryption (set `true` for local dev) | `true`                         |
| `NEXT_PUBLIC_METABASE_URL`        | Metabase instance for analytics page               | —                              |

Refer to `.env.example` for the complete list of supported variables.

## Authentication & Authorization

### Authentication Flow

1. The user signs in via Firebase on `/authentication/login`.
2. The JWT is stored in a cookie and used for subsequent API requests.
3. `middleware.ts` protects all routes except login, password reset, 2FA, and invitation decision pages.
4. The active workspace `tenantId` is resolved from the domain, token, or `NEXT_PUBLIC_DEFAULT_TENANT_ID` fallback.

### API Requests

CRM API calls include:

```
Authorization: Bearer <firebase-jwt-token>
tenantId: <workspace-uuid>
```

Permission checks on the client mirror the backend RBAC catalog. The backend enforces permissions authoritatively via `PermissionsGuard`.

### Payload Encryption

In non-development environments, request and response bodies may be encrypted. Set `NEXT_PUBLIC_ENCRYPTION_DISABLED=true` in `.env` to disable encryption during local development.

## Testing

```bash
# Unit tests
npm run test

# End-to-end tests (requires a running server)
npm run cypress:open
npm run cypress:run

# Lint and format (also enforced in CI)
npm run lint
npm run format
```

## Project Structure

```
app/
├── (afterLogin)/          # Authenticated routes (dashboard, leads, deals, etc.)
├── (beforeLogin)/         # Auth pages (login, password reset, 2FA)
├── invitations/           # Invitation decision flows
└── user-management/       # User management routes
components/                # Shared UI components
store/
├── server/features/       # React Query hooks per domain (leads, deals, customers, etc.)
└── uistate/features/      # Zustand client state (authentication, UI)
utils/                     # API client, Firebase config, constants, permissions
providers/                 # React Query and other context providers
middleware.ts              # Route protection and redirects
```

Path alias `@/*` maps to the project root (configured in `tsconfig.json`).

## Docker

The `Dockerfile` uses a multi-stage build:

1. **deps** — Install npm dependencies
2. **builder** — Fetch secrets from HashiCorp Vault, lint, and build the Next.js app
3. **runner** — Production image served via `entrypoint.sh`

```bash
docker build -t crm-frontend .
docker run -p 3020:3020 crm-frontend
```

## CI/CD

GitHub Actions workflow in `.github/workflows/ci.yml` runs on pushes and pull requests to `develop` and `staging`:

- `npm run lint`
- `npm run format`
- `npm run build` (with Firebase secrets from GitHub Actions)

For detailed CI setup instructions, including required GitHub secrets, see [CI_SETUP.md](CI_SETUP.md).

Jenkins pipeline configuration is available in `Jenkinsfile` for alternate deployment targets.
