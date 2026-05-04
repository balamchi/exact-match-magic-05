// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "path";
import { loadEnv } from "vite";

// Load all env vars into process.env for server routes
const serverEnv = loadEnv("development", process.cwd(), "");
Object.assign(process.env, serverEnv);

// Public (anon) Supabase values — safe to inline as hardcoded fallbacks.
// During local dev, .env values take precedence; in production builds where
// .env is absent (gitignored), these ensure the client always initialises.
const FALLBACK_SUPABASE_URL = "https://xdprzoqptuswfvpktats.supabase.co";
const FALLBACK_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkcHJ6b3FwdHVzd2Z2cGt0YXRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3Mjc5NjIsImV4cCI6MjA5MjMwMzk2Mn0.Ql1embodycKnqWIN7BvKKafGGRyGxEg4n3VDRC-cFkU";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabasePublishableKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  FALLBACK_SUPABASE_KEY;

export default defineConfig({
  vite: {
    define: {
      // Ensure import.meta.env has the values too (Vite's automatic VITE_
      // injection only works when .env is present at build time)
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
      "process.env.SUPABASE_URL": JSON.stringify(supabaseUrl),
      "process.env.SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
    },
    resolve: {
      alias: {
        "entities/lib/decode.js": path.resolve(__dirname, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(__dirname, "node_modules/entities/lib/encode.js"),
        "entities": path.resolve(__dirname, "node_modules/entities"),
      },
    },
  },
});
