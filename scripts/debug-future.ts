import puppeteer from 'puppeteer';

const URL_TEMPLATE = 'https://cataleg.uji.es/view/calendar/Calendar.html?pageBean.mmsId=991002248529706336&pageBean.itemId=2347632600006336&pageBean.userId=333015200006336&pageBean.pickUpLibraryId=188250260006336&pageBean.institutionCode=34CVA_UJI&locale=en';

async function debug() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: true, // Generate screenshots
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1024']
    });/**/

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 1024 });

        console.log('Navigating to calendar...');
        await page.goto(URL_TEMPLATE, { waitUntil: 'networkidle0' });

        console.log('Taking initial screenshot...');
        await page.screenshot({ path: 'calendar-initial.png' });

        // Dump potential date pickers
        const inputs = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input'));
            return inputs.map(i => ({
                id: i.id,
                class: i.className,
                type: i.type,
                name: i.name,
                value: i.value,
                placeholder: i.placeholder
            }));
        });

        const html = await page.content();
        const fs = require('fs');
        fs.writeFileSync('calendar-dump.html', html);
        console.log('Saved HTML to calendar-dump.html');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

debug();
