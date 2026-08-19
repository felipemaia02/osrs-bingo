# OSRS Bingo Web

React SPA – frontend for the OSRS Bingo project.

## Local development

```bash
npm install
npm run dev
```

## Lint / Typecheck / Format

```bash
npm run lint
npm run typecheck
npm run format
```

## Structure

```
src/
├── app/
│   ├── router/     – route definitions (React Router)
│   └── providers/  – global providers (Query, etc.)
├── features/       – features by domain
├── components/
│   ├── ui/         – UI primitives
│   └── common/     – shared composites (LanguageSwitcher...)
├── hooks/          – generic hooks
├── lib/
│   ├── api/        – central HTTP client (axios + interceptors)
│   └── i18n/       – i18next config and locales (en, pt, es)
├── services/       – domain API calls
└── types/          – global types and OpenAPI-generated types
```

## Internationalisation

Supported languages: English (`en`), Portuguese (`pt`), Spanish (`es`).
Switch language via the `LanguageSwitcher` component or by changing the browser language.

## API type generation

```bash
npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.gen.ts
```
