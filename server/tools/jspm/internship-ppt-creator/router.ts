import express from 'express';
import { buildOutline } from './content.js';
import { buildDeck } from './ppt/buildDeck.js';
import { slugify } from './ppt/xmlUtils.js';
import type { FormInput } from './types.js';
import { rateLimiter } from '../../../middleware.js';
import { incrementGenerationCount } from '../../../tracker.js';

export const internshipGeneratorRouter = express.Router();

internshipGeneratorRouter.post('/', rateLimiter, async (req, res) => {
  try {
    const { internshipTitle, studentName, prn, classDiv, program } = req.body as FormInput;

    // 1. Validate fields
    if (!internshipTitle || !studentName || !prn || !classDiv || !program) {
      res.status(400).json({ error: 'All fields are required.' });
      return;
    }

    console.log(`[internship-ppt-creator] Incoming generation request for: "${internshipTitle}"`);
    console.log(`[internship-ppt-creator] Params: Student="${studentName}", PRN="${prn}", Class="${classDiv}", Program="${program}"`);

    const startTime = Date.now();

    // 2. Stage A — Outline (retry once on parse failure)
    console.log('[internship-ppt-creator] Constructing structured presentation outline directly using Gemini...');
    let outline;
    try {
      outline = await buildOutline(internshipTitle);
    } catch (e) {
      console.warn('[internship-ppt-creator] Outline generation failed to parse, retrying once...', e);
      outline = await buildOutline(internshipTitle);
    }

    // 4. Build PPTX
    console.log('[internship-ppt-creator] Stage C: Commencing PPTX XML surgery and slide building...');
    const buffer = await buildDeck({ internshipTitle, studentName, prn, classDiv, program }, outline);

    // 5. Return file
    const filename = slugify(internshipTitle) || 'internship-presentation';
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pptx"`);
    res.send(buffer);
    
    // Track count
    await incrementGenerationCount('ppt');
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[internship-ppt-creator] Pipeline successfully completed in ${elapsed}s. Sent ${buffer.byteLength} bytes.`);
  } catch (err) {
    console.error('[internship-ppt-creator] Pipeline failed with error:', err);
    res.status(500).json({
      error: 'Failed to generate presentation. Please try again.',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});
