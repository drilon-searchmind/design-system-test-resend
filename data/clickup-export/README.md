# ClickUp export (review before import)

CSV/JSON files in this folder are generated from ClickUp. They are **not** imported into MongoDB automatically.

## Customers

```bash
npm run fetch-clickup-customers
```

Requires `CLICKUP_API_TOKEN` in `.env`. Optional: `CLICKUP_VIEW_ID` (defaults to Account Dashboard view `kg3eh-1173392`).

Field mapping follows `mapping/clickup-mapping.html` → Agency OS `Client` model (`lib/db/models/client.js`).

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
```

## Users (team roster + auth)

```bash
npm run fetch-clickup-users
```

Requires `CLICKUP_API_TOKEN`. Optional: `CLICKUP_USERS_LIST_ID` (defaults to `210313781`).

Uses [Get List Members](https://developer.clickup.com/reference/getlistmembers) — members with explicit access to the list (not inherited from Space/Folder).

| CSV column | Agency OS target | ClickUp source |
|---|---|---|
| `clickUpMemberId` | *(import key)* | Member `id` |
| `name` | `User.name`, `TeamMember.name` | `username` |
| `email` | `User.email` | `email` |
| `teamMemberKey` | `TeamMember.key` | Suggested from email/initials |
| `avatarInitials` | `TeamMember.avatarInitials` | `initials` |
| `image` | `User.image` | `profilePicture` |
| `colorHex` | *(reference)* | `color` |
| `hue` | `TeamMember.hue` | Derived from `color` |
| `accessTier` | `User.accessTier` | Default `internal_full` |
| `provisionedVia` | `User.provisionedVia` | Default `migration` |
| `active` | `TeamMember.active` | Default `true` |
| `weeklyHours` | `TeamMember.weeklyHours` | Default `37` |
| `profileDisplay` | *(reference)* | `profileInfo.display_profile` |
| `verified*` / `aiExpert` | *(reference)* | `profileInfo.*` |

Review `users-YYYY-MM-DD.csv` before database import.

```bash
npm run import-clickup-users
```

Creates/updates `User` (auth) + linked `TeamMember` (roster) by email / `clickUpMemberId`. Google OAuth later links to the same `User` by email — no duplicate.
