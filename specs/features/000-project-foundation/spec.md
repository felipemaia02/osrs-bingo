# Feature: Project Foundation

## Context

OSRS Bingo project started from scratch. The architectural foundation must be established before any domain feature.

## Problem

Without a defined base structure, each feature would be built on inconsistent foundations, making AI-assisted development harder.

## Goal

Have a working monorepo with FastAPI + MongoDB + React, structured Spec-Driven Development, and ready CI pipelines.

## Functional Requirements

### FR-001
The backend must expose `GET /health` returning `{"status": "ok"}`.

### FR-002
The frontend must render a home page indicating the platform is running.

### FR-003
`docker compose up` must start API, Web and MongoDB.

### FR-004
The commands `make test`, `make lint` and `make typecheck` must work.

## Business Rules

### BR-001
No Bingo business rules must be implemented in this feature. The foundation must be domain-agnostic.

## Non-Functional Requirements

- The scaffold must be extensible via specs without structural refactoring.
- All domain modules must have explicit boundaries from the start.

## Out of Scope

- Authentication
- Event creation
- Scoring rules
- Submissions
- Any Bingo functionality beyond the scaffold

## Acceptance Criteria

### AC-001
**Given** `docker compose up` is executed  
**When** all services start  
**Then** `GET http://localhost:8000/health` returns `{"status": "ok"}`

### AC-002
**Given** the frontend is running  
**When** the user visits `http://localhost:5173`  
**Then** the home page is displayed without errors

### AC-003
**Given** the development environment is configured  
**When** `make test` is executed  
**Then** all tests pass
