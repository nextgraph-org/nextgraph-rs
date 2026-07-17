import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        projects: [
            "sdk/js/orm",
            "sdk/js/shex-orm",
            "sdk/js/alien-deepsignals",
            "app/nextgraph",
        ],
        coverage: {
            reportsDirectory: "./.coverage",
        },
    },
});
