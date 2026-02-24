process.env.SEED_LOCAL_DEBUG = "1";
if (!process.env.LOCAL_DEBUG_EMAIL) {
  process.env.LOCAL_DEBUG_EMAIL = "debug@local.oingapp";
}
if (!process.env.LOCAL_DEBUG_PASSWORD) {
  process.env.LOCAL_DEBUG_PASSWORD = "debug1234!";
}

await import("../../prisma/seed.js");
