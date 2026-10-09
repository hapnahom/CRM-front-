import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    setupNodeEvents() {
      // on, config
    },
    baseUrl: 'http://172.16.33.163:3000',
  },
});
