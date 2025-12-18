import { saveFile } from './storage';

const PDF_URL = 'https://ujiapps.uji.es/ade/rest/storage/CESMFUJWTJAW7PKPZFYO1YNFADALR2UK';
const PDF_FILENAME = 'ejemplo.pdf';

async function downloadPdf() {
    console.log('[Updater] Starting PDF download...');
    try {
        const response = await fetch(PDF_URL);
        if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await saveFile(PDF_FILENAME, buffer);
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
