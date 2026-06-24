// API-only Express server for geocoding and transit routes
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import router from './routes/index';

const port = parseInt(process.env.API_PORT || '5002', 10);
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.url} - ${Date.now() - start}ms`);
  });
  next();
});

app.use(router);

app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`);
});