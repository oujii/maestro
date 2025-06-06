# Agent Guidelines - Maestro Quiz

## Commands
- **Dev**: `npm run dev` (Next.js with Turbopack)
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Type check**: `npx tsc --noEmit`
- **Tests**: No test framework configured

## Code Style
- **Language**: TypeScript with strict mode enabled
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS v4
- **Imports**: Use `@/*` for src imports, named imports preferred
- **Components**: React functional components with TypeScript interfaces
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Files**: kebab-case for file names, PascalCase for component files
- **Types**: Explicit interface definitions, use `React.FC<Props>` for components
- **Error handling**: Throw descriptive errors with Swedish messages where appropriate
- **Comments**: Swedish comments for business logic, English for technical code
- **Environment**: Use NEXT_PUBLIC_ prefix for client-side env vars
- **Database**: Supabase client in `src/lib/supabaseClient.ts`
