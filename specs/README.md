# Specs – Spec-Driven Development

This directory contains the specifications for all project features.

## Structure

```
specs/
├── templates/          – templates for creating new specs
│   ├── specification.md
│   ├── plan.md
│   ├── tasks.md
│   └── acceptance.md
└── features/
    └── <NNN>-<slug>/   – one folder per feature
        ├── spec.md
        ├── plan.md
        ├── tasks.md
        └── acceptance.md
```

## Source of truth hierarchy

```
spec.md  →  plan.md  →  tasks.md  →  code
```

If code and spec diverge, **the spec prevails**.

## Creating a new feature

1. Create folder `specs/features/<NNN>-<slug>/`
2. Copy `specs/templates/specification.md` → `spec.md`
3. Fill in and wait for approval
4. Copy `specs/templates/plan.md` → `plan.md`
5. Copy `specs/templates/tasks.md` → `tasks.md`
6. Implement task by task
7. Fill in `acceptance.md` from the template

## Numbering

Use three-digit sequential numbers: `001`, `002`, etc.
Feature `000` is reserved for the project foundation.
