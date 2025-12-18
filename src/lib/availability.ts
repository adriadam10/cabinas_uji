import puppeteer from 'puppeteer';
import { checkCachedOccupancy, updateOccupiedCache } from './availability-cache';
import { browserService } from './browser-service';

interface AvailabilitySlot {
    start: string;
    end: string;
    status: 'Available' | 'Occupied' | 'Closed' | 'Unknown';
}

function parseTime(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m; // Minutes from midnight
}

function formatTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function checkOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
    return Math.max(start1, start2) < Math.min(end1, end2);
}

function parseMonthYear(text: string): { month: number, year: number } {
    const parts = text.split(' ');
    // e.g. "Dec 2025"
    if (parts.length < 2) return { month: -1, year: -1 };

    // Month name to index
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months.findIndex(m => parts[0].startsWith(m));
    const year = parseInt(parts[1]);

    return { month, year };
}

export async function checkAvailability(originalUrl: string, dateStr?: string, reqStart?: string, reqEnd?: string): Promise<{ status: string, slots: AvailabilitySlot[] }> {

    // Default to today if no date provided
    if (!dateStr) {
        dateStr = new Date().toISOString().split('T')[0];
    }

    // If request has time range, check 'Occupied Cache' first
    if (reqStart && reqEnd) {
        const rStart = parseTime(reqStart);
        const rEnd = parseTime(reqEnd);

        const blocker = checkCachedOccupancy(originalUrl, dateStr, rStart, rEnd);
        if (blocker) {
            return {
                status: 'Occupied', // Or blocker.status
                slots: [] // We don't need to return all slots if we just block
            };
        }
        // If no blocker found, we MUST scrape (because time might be newly occupied)
    }

    // 2. Perform Scraping
    let targetUrl = originalUrl;
    if (originalUrl.includes('uresolver')) {
        try {
            const urlObj = new URL(originalUrl);
            const params = new URLSearchParams(urlObj.search);
            const newParams = new URLSearchParams();
            ['mmsId', 'itemId', 'userId', 'pickUpLibraryId', 'institutionCode'].forEach(key => {
                const val = params.get(key);
                if (val) newParams.set(`pageBean.${key}`, val);
            });
            newParams.set('locale', 'en');
            targetUrl = `https://cataleg.uji.es/view/calendar/Calendar.html?${newParams.toString()}`;
        } catch (e) {
            console.error("Error converting URL", e);
        }
    }

    let browser;
    let page;
    try {
        browser = await browserService.getBrowser();

        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 1024 });

        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 45000 });

        try {
            await page.waitForSelector('.dv-appointment', { timeout: 10000 });
        } catch (e) { }

        const today = new Date().toISOString().split('T')[0];
        const isToday = dateStr === today;

        let targetLeft = await page.evaluate((isToday) => {
            if (isToday) {
                const el = document.querySelector('.day-cell-today') as HTMLElement;
                return el ? el.style.left : '';
            }
            return '';
        }, isToday);

        if (targetLeft === '' || (dateStr && !isToday)) {
            // Need to navigate calendar
            if (dateStr) {
                console.log(`Navigating to date: ${dateStr}`);
                const targetDate = new Date(dateStr);
                const targetDay = targetDate.getDate();
                const targetMonth = targetDate.getMonth();
                const targetYear = targetDate.getFullYear();

                try {
                    // 1. Navigate Month
                    // We need to wait for mini-calendar to be visible? It seems always there.
                    // Selector based on debug output (classes exist)

                    let currentMonthText = await page.$eval('.datePickerMonth', el => (el as HTMLElement).innerText);
                    let { month: currentMonth, year: currentYear } = parseMonthYear(currentMonthText);

                    // Safety break
                    let attempts = 0;
                    while ((currentYear !== targetYear || currentMonth !== targetMonth) && attempts < 24) {
                        attempts++;

                        const isTargetFuture = (targetYear > currentYear) || (targetYear === currentYear && targetMonth > currentMonth);

                        if (isTargetFuture) {
                            const nextBtn = await page.$('.datePickerNextButton');
                            if (nextBtn) await nextBtn.click();
                        } else {
                            const prevBtn = await page.$('.datePickerPreviousButton');
                            if (prevBtn) await prevBtn.click();
                        }

                        // Wait for update
                        await new Promise(r => setTimeout(r, 200));
                        currentMonthText = await page.$eval('.datePickerMonth', el => (el as HTMLElement).innerText);
                        const parsed = parseMonthYear(currentMonthText);
                        currentMonth = parsed.month;
                        currentYear = parsed.year;
                    }

                    // 2. Select Day
                    // Find ALL .datePickerDay elements
                    // Filter out filler days (.datePickerDayIsFiller)
                    // Click the one with correct text

                    await page.evaluate((day) => {
                        const days = Array.from(document.querySelectorAll('.datePickerDay'));
                        for (const d of days) {
                            if (d.classList.contains('datePickerDayIsFiller')) continue;
                            if ((d as HTMLElement).innerText === String(day)) {
                                (d as HTMLElement).click();
                                break;
                            }
                        }
                    }, targetDay);

                    // Wait for main calendar to refresh
                    await new Promise(r => setTimeout(r, 1000)); // Give it a sec to redraw

                    // Re-evaluate targetLeft after navigation
                    targetLeft = await page.evaluate((dateStr) => {
                        // We need to find the column for our date.
                        // But if we clicked a day, the view should ideally shift to include it?
                        // The GWT calendar usually switches to Week View including that date?
                        // Let's assume it puts the selected date as "today" or in view.

                        // We can look for the header text that matches our date?
                        // e.g. "Thu, Dec 18"

                        const dayCells = Array.from(document.querySelectorAll('.day-cell, .day-cell-today, .day-cell-weekend'));
                        // Format target date as "Ddd, Mmm D" or similar?
                        // The header format is like "Thu, Dec 18"

                        // Let's try to match loosely by Day number
                        const targetD = new Date(dateStr).getDate();

                        for (const cell of dayCells) {
                            const text = (cell as HTMLElement).innerText; // "Thu, Dec 18"
                            // extracting day number
                            // split by space, last part
                            const parts = text.split(' ');
                            const num = parseInt(parts[parts.length - 1]);
                            if (num === targetD) {
                                return (cell as HTMLElement).style.left;
                            }
                        }
                        return '';
                    }, dateStr);

                } catch (e) {
                    console.error("Error navigating calendar", e);
                }
            }

            if (targetLeft === '') {
                return { status: 'Unknown (Date not found)', slots: [] };
            }
        }

        const appointments = await page.evaluate((targetLeft) => {
            const els = document.querySelectorAll('.dv-appointment');
            const data: any[] = [];
            els.forEach((el: any) => {
                const elLeft = parseFloat(el.style.left);
                const targetLeftVal = parseFloat(targetLeft);
                if (Math.abs(elLeft - targetLeftVal) < 2) {
                    const title = el.querySelector('.header .header')?.getAttribute('title') || el.innerText;
                    data.push(title);
                }
            });
            return data;
        }, targetLeft);

        const busySlots: { start: number, end: number, status: string, raw: string }[] = [];

        for (const appt of appointments) {
            const timeMatch = appt.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
            if (timeMatch) {
                const s = parseTime(timeMatch[1]);
                const e = parseTime(timeMatch[2]);

                let st = 'Occupied';
                if (appt.toLowerCase().includes('closed')) st = 'Closed';

                busySlots.push({
                    start: s,
                    end: e,
                    status: st,
                    raw: appt
                });
            }
        }

        // 3. Update Cache with NEW occupied slots
        // This overwrites previous cache for this day, which is fine as it's a fresher snapshot
        if (targetLeft !== '') {
            updateOccupiedCache(originalUrl, dateStr, busySlots);
        }

        // Check overlap for current request
        let status = 'Available';
        if (reqStart && reqEnd) {
            const rStart = parseTime(reqStart);
            const rEnd = parseTime(reqEnd);

            for (const slot of busySlots) {
                if (checkOverlap(rStart, rEnd, slot.start, slot.end)) {
                    status = 'Occupied'; // or slot.status
                    break;
                }
            }
        } else {
            if (busySlots.length > 0) status = 'Partial';
        }

        return {
            status: status,
            slots: busySlots.map(s => ({
                start: formatTime(s.start),
                end: formatTime(s.end),
                status: s.status as any
            }))
        };

    } catch (e) {
        console.error("Puppeteer error", e);
        return { status: 'Error', slots: [] };
    } finally {
        if (page) await page.close().catch(e => console.error("Error closing page", e));
        // We do NOT close the browser here, as it is shared
    }
}
