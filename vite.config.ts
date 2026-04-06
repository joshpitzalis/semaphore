import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
	plugins: [
		tsconfigPaths({ projects: ["./tsconfig.json"] }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
	ssr: {
		noExternal: true,
	},
	environments: {
		ssr: {
			build: {
				rollupOptions: {
					output: {
						inlineDynamicImports: true,
					},
				},
			},
		},
	},
});

export default config;
