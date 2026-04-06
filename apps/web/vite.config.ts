import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    base: process.env.VITE_BASE_URL || "/",
    server: {
        port: 5173,
        host: "localhost",
    },
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "."),
        },
    },
});
