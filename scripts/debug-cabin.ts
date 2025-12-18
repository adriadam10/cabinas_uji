import puppeteer from 'puppeteer';
import fs from 'fs';

const url = "https://cataleg.uji.es/view/uresolver/34CVA_UJI/bookingAvailability?mmsId=991002247229706336&itemId=2342155030006336&issueDescription=&userId=333015200006336&pickUpLibraryId=188250260006336&materialType=&institutionCode=34CVA_UJI&locale=en";

async function debug() {
    console.log("Launching browser...");
    const browser = await puppeteer.launch({
        headless: true, // Use old headless for now to be safe or 'new'
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1024']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 1024 });

        console.log("Navigating to URL...");
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

        console.log("Waiting for body...");
        await page.waitForSelector('body');

        // Wait extra time for GWT to render
        await new Promise(r => setTimeout(r, 5000));

        console.log("Taking screenshot...");
        await page.screenshot({ path: 'cabin-213-debug.png', fullPage: true });

        console.log("Dumping HTML...");
        const html = await page.content();
        fs.writeFileSync('cabin-213-debug.html', html);

        console.log("Done.");

    } catch (e) {
        console.error("Error", e);
    } finally {
        await browser.close();
    }
}

debug();
