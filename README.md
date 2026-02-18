# NestJS DeveloperKit (Template)

Template repository for building reusable NestJS npm packages.

## What you get

- ESM + CJS + Types build (tsup)
- Jest testing
- ESLint + Prettier
- Changesets (Release PR flow)
- Husky (pre-commit + pre-push)
- Enforced package architecture (core / infra / nest) with strict public API

## Scripts

- `npm run build` – build to `dist/`
- `npm test` – run tests
- `npm run typecheck` – TypeScript typecheck
- `npm run lint` – ESLint
- `npm run format` / `npm run format:write` – Prettier
- `npx changeset` – create a changeset

## Release flow (summary)

- Work on a `feature` branch from `develop`
- Merge to `develop`
- Add a changeset for user-facing changes: `npx changeset`
- Automation opens “Version Packages” PR into `master`
- Merge to `master`, tag `vX.Y.Z` to publish

See `docs/RELEASE.md` for details.
