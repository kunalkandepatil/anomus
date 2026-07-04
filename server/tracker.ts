import fs from 'fs/promises';
import path from 'path';

const TRACKER_FILE = path.join(process.cwd(), 'server', 'generated.json');

// Concurrency queue to prevent race conditions during concurrent write operations
let writeQueue = Promise.resolve();

export async function incrementGenerationCount(type: 'ppt' | 'report') {
  // Chain the operations sequentially to guarantee event-loop safety
  writeQueue = writeQueue.then(async () => {
    try {
      let data = { ppt: 0, report: 0, total: 0 };
      
      try {
        const content = await fs.readFile(TRACKER_FILE, 'utf-8');
        data = JSON.parse(content);
      } catch (err) {
        // File doesn't exist yet, we will create it
      }

      // Increment
      if (type === 'ppt') {
        data.ppt = (data.ppt || 0) + 1;
      } else if (type === 'report') {
        data.report = (data.report || 0) + 1;
      }
      
      data.total = (data.ppt || 0) + (data.report || 0);

      // Write back
      await fs.writeFile(TRACKER_FILE, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`[Tracker] Incremented ${type}. Current stats: PPT=${data.ppt}, Report=${data.report}, Total=${data.total}`);
    } catch (error) {
      console.error('[Tracker] Failed to update generated.json:', error);
    }
  });

  // Await the queued operation to finish before returning
  await writeQueue;
}
