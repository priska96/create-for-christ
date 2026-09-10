# Create For Christ

- Read README.md and the current decision at the top of app-konzept.mdx before changing the architecture.
- Use Node.js from .nvmrc and npm workspaces. Run commands from the repository root unless a workspace-specific working directory is required.
- Stack: Expo/TypeScript mobile app, Fastify/TypeScript API, PostgreSQL. No hosted backend is required.
- Run npm run check for code changes. Build shared contracts before consuming them.
- Never commit .env files, credentials or user data. EXPO_PUBLIC_* values are public.
- All authorization is enforced by the API. UI role selection does not grant access.
- Keep auth-provider identities separate from stable profile IDs. Store money in integer minor units with a currency.
- Only reels are supported. Barter and paid are campaign-level compensation types.
- Persist schema changes as new SQL migrations. Do not edit applied migrations.
- Accounts and own-profile onboarding/editing are implemented with Better Auth. Swiping and matching are not implemented yet.
- Run npm run test:integration with local PostgreSQL for auth/profile changes. These tests use a temporary schema; never point tests at production.
- Local auth emails go to Mailpit. Never expose auth tables or mail outbox contents through public APIs.

- Keep app.ts limited to composition. Put API routes and persistence in modules/<feature>, shared HTTP guards in http/, and infrastructure in infrastructure/.
- Reuse shared domain constants from contracts, operational constants from API config, and mobile design tokens from src/ui/theme.ts.
- Reuse src/ui controls. Expo UI universal Buttons/Checkboxes are integrated; keep accessible React Native Fields until the universal TextInput exposes an equivalent accessible label.
- Keep noUnusedLocals/noUnusedParameters enabled. Run npm run format:check; npm run format applies the agreed source formatting.
- Keep file names in camelCase.
- Keep file names with capital first letter for component files.
- Custom Hooks should be in the hooks directory.
