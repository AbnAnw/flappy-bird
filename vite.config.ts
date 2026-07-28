import pluginChecker from "vite-plugin-checker";
import { defineConfig } from "vite";

export default defineConfig({
    base: "/flappy-bird/",
    plugins: [pluginChecker({ typescript: true, overlay: false })],
});