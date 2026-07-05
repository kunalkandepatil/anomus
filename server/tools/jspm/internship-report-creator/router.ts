import express from 'express';
import { buildContent } from './content.js';
import { buildReport, slugify } from './docx/buildReport.js';
import type { ReportFormInput } from './types.js';
import { rateLimiter } from '../../../middleware.js';
import { incrementGenerationCount, saveGeneratedData } from '../../../tracker.js';
import { validateReportInput } from '../../../validation.js';

export const internshipReportRouter = express.Router();

internshipReportRouter.post('/', rateLimiter, async (req, res) => {
  try {
    const {
      internshipDomain,
      companyName,
      studentName,
      classDiv,
      rollNumber,
      program,
      schoolName,
      facultyGuideName,
      industryGuideName,
      internshipStartDate,
      internshipEndDate,
      semester,
      certificateImage,
    } = req.body as ReportFormInput;

    const input: ReportFormInput = {
      internshipDomain: internshipDomain?.trim() ?? '',
      companyName: companyName?.trim() ?? '',
      studentName: studentName?.trim() ?? '',
      classDiv: classDiv?.trim() ?? '',
      rollNumber: rollNumber?.trim() ?? '',
      program: program?.trim() ?? '',
      schoolName: schoolName?.trim() ?? '',
      facultyGuideName: facultyGuideName?.trim() ?? '',
      industryGuideName: industryGuideName?.trim() ?? '',
      internshipStartDate: internshipStartDate?.trim() ?? '',
      internshipEndDate: internshipEndDate?.trim() ?? '',
      semester: semester?.trim() ?? '',
      certificateImage: certificateImage ?? undefined,
    };

    // 1. Validate fields
    const validationError = validateReportInput(input);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    console.log(`[internship-report-creator] Generation request: "${input.internshipDomain}" @ "${input.companyName}"`);
    console.log(`[internship-report-creator] Student: "${input.studentName}", PRN: "${input.rollNumber}", Class: "${input.classDiv}", Program: "${input.program}"`);

    const startTime = Date.now();

    // 2. Stage A — AI content generation
    console.log('[internship-report-creator] Generating structured report content directly using Gemini...');
    let reportContent;
    try {
      reportContent = await buildContent(input);
    } catch (e) {
      console.warn('[internship-report-creator] Content generation failed, retrying...', e);
      reportContent = await buildContent(input);
    }

    // Save JSON data
    try {
      await saveGeneratedData('report', input, reportContent);
    } catch (err) {
      console.error('[internship-report-creator] Failed to save JSON data:', err);
    }

    // 4. Stage C — Build DOCX
    console.log('[internship-report-creator] Stage C: Building DOCX from template...');
    const buffer = await buildReport(input, reportContent);

    // 5. Serve the file
    const filename = slugify(input.internshipDomain) || 'internship-report';
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.docx"`);
    res.send(buffer);
    
    // Track count
    await incrementGenerationCount('report');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[internship-report-creator] Pipeline completed in ${elapsed}s. Sent ${buffer.byteLength} bytes.`);
  } catch (err) {
    console.error('[internship-report-creator] Pipeline failed:', err);
    res.status(500).json({
      error: 'Failed to generate report. Please try again.',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});
