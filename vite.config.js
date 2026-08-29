import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "toolkit-page-routes",
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          const pathname = request.url?.split("?")[0];
          if (pathname === "/med-tabs/" || pathname === "/canned-remarks/") {
            request.url = `${pathname}index.html`;
          }
          next();
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        app: resolve(import.meta.dirname, "index.html"),
        authCallback: resolve(import.meta.dirname, "auth/callback.html"),
      },
    },
  },
});
