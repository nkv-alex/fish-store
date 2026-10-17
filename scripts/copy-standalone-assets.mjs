import { cp } from "node:fs/promises";

await Promise.all([
  cp("public", ".next/standalone/public", { recursive: true, force: true }),
  cp(".next/static", ".next/standalone/.next/static", {
    recursive: true,
    force: true,
  }),
]);
