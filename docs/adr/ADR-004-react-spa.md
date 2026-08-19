# ADR-004: React SPA

## Status
Accepted

## Context
The frontend needs to be a SPA consuming the FastAPI. Next.js would add SSR complexity unnecessary for this use case.

## Decision
React 18 + Vite + TypeScript. Remote state via TanStack Query v5. Routing via React Router v6. Styling via Tailwind CSS. i18n via react-i18next (en, pt, es). Zustand only when there is genuine frontend global state.

## Consequences
- Fast builds with Vite.
- TanStack Query eliminates manual cache/loading/error management.
- TypeScript types will be generated from the FastAPI OpenAPI schema.
