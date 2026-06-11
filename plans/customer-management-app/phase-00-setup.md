# Phase 00 — Setup

**Goal:** Initialize a monorepo-style workspace with `back-end/` and `front-end/` ready for development. No code yet — just tooling, configs, and conventions.

---

## Prerequisites

- Node.js ≥ 20 LTS
- pnpm ≥ 9 (preferred) or npm ≥ 10
- Git (for version control — init in `/Users/bac/Desktop/Dev/customers/`)
- MongoDB Atlas account (free M0 cluster) — create in Phase 07
- Railway.app account — link in Phase 07
- Vercel account — link in Phase 07

---

## Steps

### 1. Root workspace

Create root `package.json` (workspaces) and shared configs so both apps share lint/format rules.

**Files to create at `/Users/bac/Desktop/Dev/customers/`:**

- `package.json` (root, workspaces)
- `.gitignore`
- `.editorconfig`
- `.nvmrc` (Node 20)
- `README.md` (short pointer to back-end/ and front-end/ READMEs)
- `.prettierrc.json`
- `.prettierignore`
- `eslint.config.mjs` (flat config shared)

**`package.json` (root):**
```json
{
  "name": "customers",
  "private": true,
  "workspaces": ["back-end", "front-end"],
  "scripts": {
    "lint": "npm-run-all -p lint:*",
    "lint:be": "npm --workspace back-end run lint",
    "lint:fe": "npm --workspace front-end run lint",
    "format": "prettier --write \"**/*.{ts,tsx,js,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,json,md}\""
  },
  "devDependencies": {
    "npm-run-all": "^4.1.5",
    "prettier": "^3.3.0",
    "eslint": "^9.0.0",
    "typescript": "^5.5.0"
  },
  "engines": { "node": ">=20" }
}
```

**`.gitignore`:**
```
node_modules
dist
.next
.turbo
.env
.env.local
*.log
.DS_Store
coverage
.vercel
.railway
```

**`.editorconfig`:**
```
root = true
[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

**`.prettierrc.json`:**
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

### 2. Initialize Git

```bash
cd /Users/bac/Desktop/Dev/customers
git init
git add .
git commit -m "chore: initialize monorepo"
```

### 3. Add empty back-end & front-end placeholders

`back-end/README.md` and `front-end/README.md` — short stubs saying "see phase plan".

---

## Deliverables checklist

- [ ] Root `package.json` with workspaces
- [ ] `.gitignore`, `.editorconfig`, `.nvmrc`, `.prettierrc.json`
- [ ] Git initialized, first commit made
- [ ] `back-end/` and `front-end/` directories confirmed empty
- [ ] `pnpm install` (or `npm install`) at root succeeds
- [ ] `pnpm format:check` passes on empty tree

---

## Validation

- `node -v` ≥ 20
- `npm -v` ≥ 10
- `git status` clean after initial commit
- `ls back-end front-end` shows empty dirs

---

## Notes

- We use npm workspaces (not pnpm) for maximum compatibility — no extra global install required.
- ESLint flat config is the modern default; we extend with `typescript-eslint` per app in later phases.
- Do **not** add Turbo/Nx — unnecessary complexity for two apps.
