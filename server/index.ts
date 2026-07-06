import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { internshipGeneratorRouter } from './tools/jspm/internship-ppt-creator/router.js';
import { internshipReportRouter } from './tools/jspm/internship-report-creator/router.js';
import { getRateLimit, getRateLimitInfo } from './middleware.js';
import { getGenerationStats } from './tracker.js';

const app = express();
app.set('trust proxy', true);
const PORT = parseInt(process.env.PORT ?? '3001', 10);

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

app.post('/api/log', async (req, res) => {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1523045018464551122/CTGHA2es7TKCPGiyaWbdgzjAimmWB6PWkUyKeXKg7BSM1Z9Rsl4tf4l763dP-r4I73sv';
    
    // Add client details to the Discord embed fields
    const { ip, clientId, count } = getRateLimitInfo(req);
    
    if (req.body && Array.isArray(req.body.embeds) && req.body.embeds.length > 0) {
      const embed = req.body.embeds[0];
      if (!embed.fields) embed.fields = [];
      
      embed.fields.push({
        name: '🌐 IP Address',
        value: `\`${ip}\``,
        inline: true
      });
      
      embed.fields.push({
        name: '📊 Rate Limit Usage',
        value: `\`${count} / 3\``,
        inline: true
      });

      if (clientId) {
        embed.fields.push({
          name: '🆔 Client ID',
          value: `\`${clientId}\``,
          inline: false
        });
      }
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      console.warn(`[Log Proxy] Discord returned non-ok status: ${response.status}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Log Proxy] Failed to proxy log to Discord:', error);
    res.status(500).json({ error: 'Failed to send log to Discord' });
  }
});


// ─── Tool-Scoped Private API Routes ──────────────────────────────────────────
// Each tool is mapped to its matching route path.
app.use('/api/jspm/internship-ppt-creator', internshipGeneratorRouter);
app.use('/api/jspm/internship-report-creator', internshipReportRouter);

app.listen(PORT, () => {
  console.log(`Anomus server running on http://localhost:${PORT}`);
});
