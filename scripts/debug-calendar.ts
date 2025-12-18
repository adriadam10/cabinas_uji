import puppeteer from 'puppeteer';
import fs from 'fs';

// Original Link: https://cataleg.uji.es/view/uresolver/34CVA_UJI/bookingAvailability?mmsId=991002247229706336&itemId=2342155030006336&issueDescription=&userId=333015200006336&pickUpLibraryId=188250260006336&materialType=&institutionCode=34CVA_UJI
// Converted to Calendar URL format
const params = new URLSearchParams({
    'pageBean.mmsId': '991002247229706336',
    'pageBean.itemId': '2342155030006336',
    'pageBean.issueDescription': '',
    'pageBean.userId': '333015200006336',
    'pageBean.pickUpLibraryId': '188250260006336',
    'pageBean.materialType': '',
    'pageBean.institutionCode': '34CVA_UJI',
    'locale': 'en'
});

const url = `https://cataleg.uji.es/view/calendar/Calendar.html?${params.toString()}`;

async function debug() {
    console.log("Launching browser...");
    console.log("Target URL:", url);
    const browser = await puppeteer.launch({
        headless: true, // Keep it visible if possible for debugging? No, server env.
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1024']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 1024 });

        console.log("Navigating...");
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

        console.log("Waiting for GWT...");
        // Wait for something specific to calendar
        try {
            await page.waitForSelector('.fc-event', { timeout: 10000 });
            console.log("Found .fc-event selector");
        } catch {
            console.log("Did not find .fc-event, dumping body anyway");
        }

        // Wait extra time
        await new Promise(r => setTimeout(r, 5000));

        console.log("Taking screenshot...");
        await page.screenshot({ path: 'cabin-213-calendar.png', fullPage: true });

        console.log("Dumping HTML...");
        const html = await page.content();
        fs.writeFileSync('cabin-213-calendar.html', html);

        console.log("Done.");

    } catch (e) {
        console.error("Error", e);
    } finally {
        await browser.close();
    }
}

debug();
