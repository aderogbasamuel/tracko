// NOTE: this project runs Prisma 5.22, which does NOT read prisma.config.ts —
// that is a Prisma 7 feature and this file is inert scaffolding. The CLI takes
// its schema path from package.json/defaults and its env from `.env`, which is
// why DATABASE_URL lives there rather than in .env.local (secrets only).
// Seeding is `npm run seed`; `prisma db seed` is not wired up on v5.
import "dotenv/config";

export default {
  schema: "prisma/schema.prisma",
};
