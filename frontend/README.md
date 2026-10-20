# Frontend

TanStack Start + React 19 + Tailwind + shadcn/ui. First generated with Lovable from `docs/lovable_prompt.md`, then edited by hand (see the root `README.md` and `AI_USAGE_LOG.md`).

```bash
bun install
cp .env.example .env      # VITE_API_URL=http://localhost:8000, VITE_USE_MOCK=false
bun run dev               # http://localhost:5173
bun run test              # vitest
bun run lint              # eslint + prettier
bunx tsc --noEmit -p .    # typecheck
```

`VITE_USE_MOCK=true` serves sample answers from `src/lib/mock.ts`, so the UI works without the backend. The API contract is `src/lib/types.ts`.
