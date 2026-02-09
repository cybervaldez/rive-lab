# rive-playbook-guidelines

A playbook-guided React project scaffold for exploring trending micro-SaaS ideas with structured AI-assisted development.

## Quick Start

```bash
npm run dev
# Open http://localhost:5173
```

## Tech Stack

- React 18 + TypeScript
- Vite 5
- Bash E2E testing with agent-browser

## Development Workflow

This project uses the [Cybervaldez Playbook](https://github.com/cybervaldez/cybervaldez-playbook) for structured AI-assisted development.

### Available Skills

| Skill | Purpose |
|-------|---------|
| `/ux-planner` | Plan features with UX tradeoffs |
| `/ui-planner` | Establish visual identity |
| `/create-task` | Build with tests baked in |
| `/coding-guard` | Audit for anti-patterns |
| `/e2e` | End-to-end test verification |
| `/research` | Research new technologies |

See `.claude/skills/SKILL_INDEX.md` for full details.

### Workflow

1. `/ux-planner` — plan the feature
2. `/ui-planner` — design the visuals
3. `/create-task` — implement with tests
4. `/coding-guard` + `/e2e` — verify quality

## Project Structure

```
rive-playbook-guidelines/
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── src/
│   ├── App.tsx
│   └── main.tsx
├── tests/
│   └── test_welcome.sh
├── techs/
│   └── README.md
└── .claude/
    ├── PROJECT_CONFIG.md
    └── skills/
```

## Conventions

_To be established as the project grows. Run `/coding-guard` to audit patterns._
