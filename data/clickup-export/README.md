# ClickUp export (review before import)

CSV/JSON files in this folder are generated from ClickUp. They are **not** imported into MongoDB automatically.

Requires in `.env`:

- `CLICKUP_API_TOKEN`
- `MONGODB_URI` (for import scripts)
- Optional: `CLICKUP_VIEW_ID` (customers, default `kg3eh-1173392`)
- Optional: `CLICKUP_USERS_LIST_ID` (users, default `210313781`)

Field mapping: `mapping/clickup-mapping.html` → Agency OS models.

## npm scripts (quick reference)

| Command | What it does |
|---|---|
| `npm run fetch-clickup-customers` | ClickUp → `customers-YYYY-MM-DD.csv` |
| `npm run fetch-clickup-users` | ClickUp → `users-YYYY-MM-DD.csv` |
| `npm run fetch-clickup-all` | Both exports above |
| `npm run import-clickup-customers` | Latest `customers-*.csv` → MongoDB |
| `npm run import-clickup-users` | Latest `users-*.csv` → MongoDB |
| `npm run import-clickup-all` | Both CSV imports (latest files) |
| `npm run import-clickup-customers-api` | ClickUp API → MongoDB (skip CSV) |
| `npm run import-clickup-users-api` | ClickUp API → MongoDB (skip CSV) |
| `npm run import-clickup-all-api` | Both API imports |
| `npm run clickup-migrate` | Export all → import CSVs → sync disciplines |
| `npm run sync-member-disciplines` | Map client assignees → team `disciplineKeys` |
| `npm run sync-member-disciplines-dry-run` | Preview discipline sync only |

Import a specific CSV file:

```bash
npm run import-clickup-customers -- data/clickup-export/customers-2026-06-29.csv
npm run import-clickup-users -- data/clickup-export/users-2026-06-29.csv
npm run import-clickup-all -- path/to/customers.csv path/to/users.csv
```

Full migrate options:

```bash
npm run clickup-migrate -- --dry-run-disciplines   # preview discipline sync at end
npm run clickup-migrate -- --skip-disciplines      # skip discipline sync
```

## Customers

```bash
npm run fetch-clickup-customers
```

Key columns:

| CSV column | Agency OS field | ClickUp source |
|---|---|---|
| `customerClickUpId` | `customerClickUpId` | Task id (`869dvuqnz`) |
| `name` | `name` | ⭐ Virksomhedsnavn |
| `slug` | `slug` | Generated from domain / company name |
| `cvr` | `cvr` | ⭐ CVR |
| `status` | `status` | 🤝 Status (normalized) |
| `retainerAmount` | `retainerAmount` | 💰 Marketing - MRR |
| `deptAssignees.*` | `deptAssignees` | 🤝 * - Ansvarlig |

Import after review:

```bash
npm run import-clickup-customers
# or direct from API:
npm run import-clickup-customers-api
```

## Users (team roster + auth)

```bash
npm run fetch-clickup-users
```

Uses [Get List Members](https://developer.clickup.com/reference/getlistmembers).

| CSV column | Agency OS target | ClickUp source |
|---|---|---|
| `clickUpMemberId` | *(import key)* | Member `id` |
| `name` | `User.name`, `TeamMember.name` | `username` |
| `email` | `User.email` | `email` |
| `teamMemberKey` | `TeamMember.key` | Suggested from email/initials |

Import after review:

```bash
npm run import-clickup-users
# or direct from API:
npm run import-clickup-users-api
```

Creates/updates `User` + linked `TeamMember` by email / `clickUpMemberId`. Google OAuth links to the same `User` by email.

## One-shot re-migration

Review-friendly (exports CSVs you can inspect first, then imports those exact files):

```bash
npm run clickup-migrate
```

Fast re-sync without CSV review:

```bash
npm run import-clickup-all-api
npm run sync-member-disciplines
```
