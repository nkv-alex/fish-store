import { execFileSync } from "node:child_process";

if (process.env.VERCEL_ENV === "production") {
  execFileSync("npm", ["run", "db:deploy"], {
    stdio: "inherit",
    env: process.env,
  });
  execFileSync("npm", ["run", "db:seed"], {
    stdio: "inherit",
    env: process.env,
  });
}

execFileSync("npx", ["next", "build"], {
  stdio: "inherit",
  env: process.env,
});

execFileSync("node", ["scripts/copy-standalone-assets.mjs"], {
  stdio: "inherit",
  env: process.env,
});
