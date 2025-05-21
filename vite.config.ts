import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on mode (development/production)
  const env = loadEnv(mode, process.cwd());
  
  console.log(`Building for ${mode} environment`);
  
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Make environment variables available in the app
    define: {
      'process.env.VITE_CUSTOMER_URL': JSON.stringify(env.VITE_CUSTOMER_URL),
      'process.env.NODE_ENV': JSON.stringify(mode)
    }
  };
});
