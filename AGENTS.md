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
