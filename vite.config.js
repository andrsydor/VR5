// vite.config.js
import basicSsl from '@vitejs/plugin-basic-ssl';
import { resolve } from "path";

export default {
  plugins: [
    basicSsl({
      /** name of certification */
      name: 'test',
      /** custom trust domains */
      domains: ['*.custom.com'],
      /** custom certification directory */
      certDir: '/Users/.../.devServer/cert',
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        menu: resolve(__dirname, "index.html"),
        task1: resolve(__dirname, "task1.html"),
        task2: resolve(__dirname, "task2.html"),
      },
    },
  },
}