import { resolve, dirname } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

/**
 * Loads environment variables from the nearest .env file.
 * Checks project root first, then the parent directory for backwards compatibility.
 * Does not validate — provider factories handle their own validation.
 */
export function loadEnv() {
  const candidates = [resolve(PROJECT_ROOT, ".env"), resolve(PROJECT_ROOT, "../.env")];
  const envPath = candidates.find((p) => existsSync(p));
  if (envPath) dotenv.config({ path: envPath });
}
