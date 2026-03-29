import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/../.env' });

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!
  }
});
