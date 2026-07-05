import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { internshipGeneratorRouter } from './tools/jspm/internship-ppt-creator/router.js';
import { internshipReportRouter } from './tools/jspm/internship-report-creator/router.js';
import { getRateLimit } from './middleware.js';
import { getGenerationStats } from './tracker.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Log incoming requests
app.use((req, res, next) => {
  console.log(`[Request Log] ${req.method} ${req.originalUrl}`);
  if (req.method === 'POST') {
    console.log(`[Request Body]`, JSON.stringify(req.body, null, 2));
  }
  next();
});

// ─── Stats / Rate Limit Endpoint ───────────────────────────────────
app.get('/api/stats', getRateLimit);

app.get('/api/global-stats', async (req, res) => {
  try {
    const stats = await getGenerationStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch global stats' });
  }
});

// ─── Tool-Scoped Private API Routes ──────────────────────────────────────────
// Each tool is mapped to its matching route path.
app.use('/api/jspm/internship-ppt-creator', internshipGeneratorRouter);
app.use('/api/jspm/internship-report-creator', internshipReportRouter);

app.listen(PORT, () => {
  console.log(`Anomus server running on http://localhost:${PORT}`);
});
