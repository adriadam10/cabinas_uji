import puppeteer, { Browser } from 'puppeteer';

class BrowserService {
    private browser: Browser | null = null;
    private isLaunching: boolean = false;
    private launchPromise: Promise<Browser> | null = null;

    async getBrowser(): Promise<Browser> {
        if (this.browser && this.browser.isConnected()) {
            return this.browser;
        }

        // Handle race conditions where multiple requests try to launch at once
        if (this.isLaunching && this.launchPromise) {
            return this.launchPromise;
        }

        this.isLaunching = true;
        this.launchPromise = this.launchBrowser();

        try {
            this.browser = await this.launchPromise;
            return this.browser;
        } finally {
            this.isLaunching = false;
            this.launchPromise = null;
        }
    }

    private async launchBrowser(): Promise<Browser> {
        console.log('Launching new browser instance...');
        const browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Critical for Docker
                '--window-size=1280,1024'
            ]
        });

        browser.on('disconnected', () => {
            console.log('Browser disconnected');
            this.browser = null;
        });

        return browser;
    }

    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

// Export a singleton instance
export const browserService = new BrowserService();
