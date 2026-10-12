import { defineConfig } from "vitest/config";

// Plain Node environment: the handler only uses fetch/Request/Response/URL,
// and the tests stub fetch, so the Workers runtime is not needed.
export default defineConfig({
    test: {
        environment: "node",
        include: ["test/**/*.test.ts"],
    },
});
