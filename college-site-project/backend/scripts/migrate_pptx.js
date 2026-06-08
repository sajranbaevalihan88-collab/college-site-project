/**
 * migrate_pptx.js
 * Re-processes all existing PPTX files in the DB that have no slides_data.
 * Run once: node backend/scripts/migrate_pptx.js
 */

const path = require('path');
const { spawn } = require('child_process');
const { getDb } = require('../database');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function reprocessPptx() {
  const db = await getDb();

  // Find all PPTX files with empty or missing slides_data
  const files = await db.all(`
    SELECT * FROM lesson_files 
    WHERE file_type = 'pptx' AND (slides_data IS NULL OR slides_data = '[]' OR slides_data = '')
  `);

  if (files.length === 0) {
    console.log('No PPTX files need reprocessing.');
    return;
  }

  console.log(`Found ${files.length} PPTX file(s) to reprocess...`);

  for (const file of files) {
    // file_url is like /uploads/lessons/filename.pptx
    const filename = path.basename(file.file_url);
    const filePath = path.join(__dirname, '../uploads/lessons', filename);

    console.log(`\nProcessing: ${filename}`);

    await new Promise((resolve) => {
      const py = spawn('python', [path.join(__dirname, 'process_file.py'), filePath]);
      let output = '';
      let errOutput = '';

      py.stdout.on('data', (d) => output += d.toString());
      py.stderr.on('data', (d) => errOutput += d.toString());

      py.on('close', async (code) => {
        if (errOutput) console.warn('  Warnings:', errOutput.trim());

        try {
          const result = JSON.parse(output.trim());
          if (result.slides && result.slides.length > 0) {
            const slidesJson = JSON.stringify(result.slides);
            await db.run(
              'UPDATE lesson_files SET slides_data = ? WHERE id = ?',
              [slidesJson, file.id]
            );
            console.log(`  ✓ Updated ${result.slides.length} slides for file id=${file.id}`);
          } else {
            console.log(`  ✗ No slides extracted for file id=${file.id}`);
          }
        } catch (e) {
          console.error(`  ✗ Failed to parse output for file id=${file.id}:`, e.message);
        }
        resolve();
      });
    });
  }

  console.log('\nMigration complete!');
  process.exit(0);
}

reprocessPptx().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
