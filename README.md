# Route — Logistics SaaS Platform

A delivery tracking system built with structured engineering discipline.

## Repository Structure

```
Route/
├── agent-app/           # React Native / Expo app for delivery agents
├── admin-dashboard/     # React web app for administrators
├── functions/           # Firebase Cloud Functions
├── firestore.rules      # Firestore security rules
├── firestore.indexes.json
├── firebase.json        # Firebase project configuration
└── .firebaserc          # Firebase project aliases (dev / prod)
```

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code only |
| `develop` | Integration branch |
| `feature/*` | One branch per feature |

**Example feature branches:**
- `feature/auth`
- `feature/barcode`
- `feature/delivery-save`
- `feature/offline-sync`
- `feature/admin-dashboard`

**Workflow:**
1. Create `feature/*` branch from `develop`
2. Build and test the module
3. Open a Pull Request targeting `develop`
4. Review and merge into `develop`
5. When stable, merge `develop` → `main`

---

## Development Workflow

For every feature:

1. **Define feature** — describe scope clearly
2. **Create branch** — `git checkout -b feature/<name>`
3. **Build** — make only the required file changes
4. **Test locally** — Expo / browser / emulator
5. **Commit** — `git commit -m "feat: <description>"`
6. **Push** — `git push origin feature/<name>`
7. **Open PR** — fill the review checklist

### PR Checklist

- [ ] Code is clean and readable
- [ ] No hardcoded values or secrets
- [ ] Firestore security rules respected
- [ ] No `console.log` left in production code
- [ ] Works offline (where applicable)
- [ ] What feature does this implement?
- [ ] Which files changed?
- [ ] Which Firestore collections are affected?
- [ ] Any schema change?
- [ ] Any security rule change?

---

## CI/CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow | Trigger | Action |
|----------|---------|--------|
| `lint.yml` | Every push / PR to `main`, `develop`, `feature/*` | ESLint + TypeScript check for all modules |
| `deploy-web.yml` | Push to `main` (admin-dashboard changes) | Build and deploy to Firebase Hosting |
| `deploy-functions.yml` | Push to `main` (functions changes) | Deploy Cloud Functions |

---

## Environment Management

Two separate Firebase projects prevent accidental data mixing:

| Alias | Project |
|-------|---------|
| `default` | `delivery-dev` |
| `production` | `delivery-prod` |

Configure in `.firebaserc`. **Never deploy dev data to prod.**

---

## Versioning

Semantic versioning is used for all production releases:

```
v1.0.0  →  MVP release
v1.1.0  →  New feature
v1.1.1  →  Bug fix
```

Tag a release:
```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## Feature Build Order

| Issue | Feature |
|-------|---------|
| #1 | Firebase foundation setup |
| #2 | Agent authentication |
| #3 | Zone selection |
| #4 | Barcode scan and master data fetch |
| #5 | Delivery save |
| #6 | Offline sync |
| #7 | Background GPS tracking |
| #8 | Admin dashboard |

Each issue maps to one `feature/*` branch.
