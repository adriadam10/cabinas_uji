import fs from 'fs';
import path from 'path';

const PDF_URL = 'https://ujiapps.uji.es/ade/rest/storage/CESMFUJWTJAW7PKPZFYO1YNFADALR2UK';
const LOCAL_PATH = path.join(process.cwd(), 'data/ejemplo.pdf');

async function downloadPdf() {
    console.log('[Updater] Starting PDF download...');
    try {
        const response = await fetch(PDF_URL);
        if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Ensure directory exists
        const dir = path.dirname(LOCAL_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(LOCAL_PATH, buffer);
        console.log(`[Updater] PDF updated successfully at ${new Date().toISOString()}`);
    } catch (error) {
        console.error('[Updater] Error downloading PDF:', error);
    }
}

let schedulerStarted = false;

export function startScheduler() {
    if (schedulerStarted) return;
    schedulerStarted = true;

    console.log('[Updater] Scheduler initialized.');

    // Run immediately on startup
    downloadPdf();

    // Schedule every 24 hours (24 * 60 * 60 * 1000 ms)
    setInterval(downloadPdf, 24 * 60 * 60 * 1000);
}
