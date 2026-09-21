const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

// Default fallback environment variables for Vercel deployment
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://neondb_owner:npg_RTE9xm8uZGXe@ep-orange-flower-b3x1jago-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "campusconnect_super_secret_jwt_key_2026_x89f2";
}

const app = require('../server/src/app');

module.exports = app;
