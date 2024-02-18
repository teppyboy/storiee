import * as fs from "node:fs";
import { Browser, BrowserContext, Page, chromium, devices } from "playwright";
import logger from "../logger.js";
import { sleep } from "../utils.js";
import FacebookStory from "./story.js";
import FacebookVideo from "./video.js";

class Facebook {
	story: FacebookStory;
	video: FacebookVideo;
	#browser: Browser | undefined;
	#browserChannel: string;
	contexts: BrowserContext[] = [];
	#pageCreationInterval: NodeJS.Timeout | undefined;
	#pages: Page[] = [];
	constructor(browser: Browser | undefined = undefined) {
		this.story = new FacebookStory(this);
		this.video = new FacebookVideo(this);
		this.#browser = browser;
		this.#browserChannel = process.env.BROWSER_CHANNEL || "chrome";
		if (this.#browser) {
			logger.debug("Creating setInterval to create new pages...");
			this.#enableAutoPageCreation();
		}
		fs.mkdirSync("data/cookies/fb/", { recursive: true });
	}
	#enableAutoPageCreation() {
		if (this.#pageCreationInterval) {
			clearInterval(this.#pageCreationInterval);
			this.#pages = [];
		}
		let prevPageLen = -1;
		this.#pageCreationInterval = setInterval(async () => {
			// Hardcoding to 4 for now
			if (this.#pages.length < 4) {
				if (!this.#browser) {
					clearInterval(this.#pageCreationInterval);
					return;
				}
				if (this.contexts.length === 0) {
					return;
				}
				logger.debug(
					`Creating new page. Current page count: ${this.#pages.length}`,
				);
				const context =
					this.contexts[Math.floor(Math.random() * this.contexts.length)];
				// if (prevPageLen === this.#pages.length) {
				// 	logger.debug("Previous page length is same as current.");
				// 	return;
				// }
				prevPageLen = this.#pages.length;
				const page = await context.newPage();
				this.#pages.push(page);
			}
		}, 250);
	}
	setBrowser(browser: Browser) {
		this.#browser = browser;
		this.#enableAutoPageCreation();
	}
	async loadCookies() {
		if (!this.#browser) {
			throw new Error("Browser is not initialized.");
		}
		for (const file of fs.readdirSync("data/cookies/fb/")) {
			logger.debug(`Loading cookie file: ${file}`);
			const path = `data/cookies/fb/${file}`;
			const cookie = fs.readFileSync(path, "utf8");
			const context = await this.#browser.newContext(
				{...devices["Desktop Edge"]}
			);
			context.addCookies(JSON.parse(cookie));
			const page = await context.newPage();
			await page.goto("https://www.facebook.com/");
			if (await this.isAccountLoggedOut(page)) {
				logger.warn(`Account in ${file} is logged out.`);
				continue;
			}
			page.close();
			this.contexts.push(context);
		}
	}
	async getPage() {
		let page: Page;
		const maybePage = this.#pages.shift();
		if (!maybePage) {
			if (!this.#browser) {
				throw new Error("Browser is not initialized.");
			}
			const context =
				this.contexts[Math.floor(Math.random() * this.contexts.length)];
			page = await context.newPage();
		} else {
			page = maybePage;
		}
		return page;
	}
	async addAccount() {
		logger.info("Adding account...");
		const browser = await chromium.launch({
			headless: false,
			channel: this.#browserChannel,
		});
		const context = await browser.newContext(
			{...devices["Desktop Edge"]}
		)
		const page = await context.newPage();
		await page.goto("https://www.facebook.com/login/");
		let url = new URL(page.url());
		while (url.pathname !== "/") {
			if (url.pathname.startsWith("/checkpoint")) {
				// The account is locked, we can't continue.
				logger.error("Checkpoint detected, KEKW.");
				throw new Error("Account is locked, can't continue.");
			}
			await sleep(1000);
			url = new URL(page.url());
		}
		logger.info("Saving cookies...");
		const cookies = await context.cookies();
		const fileName = new Date().getTime();
		fs.writeFileSync(
			`data/cookies/fb/${fileName}.json`,
			JSON.stringify(cookies, null, 4),
		);
		await browser.close();
		logger.info(`Account added successfully to ${fileName}.json`);
	}
	async isAccountLoggedOut(page: Page) {
		try {
			return await page.$(".UIPage_LoggedOut");
		} catch (e) {
			logger.warn(`Error while getting logged out element: ${e}`);
			return true;
		}
	}
	async openPage(cookieFile: string) {
		logger.info(`Using cookie file: ${cookieFile}`);
		if (!fs.existsSync(`data/cookies/fb/${cookieFile}`)) {
			throw new Error("Cookie file does not exist.");
		}
		logger.info("Launching browser with specified cookie file...");
		const browser = await chromium.launch({
			headless: false,
			channel: this.#browserChannel,
		});
		const context = await browser.newContext(
			{...devices["Desktop Edge"]}
		)
		context.addCookies(
			JSON.parse(
				fs.readFileSync(`data/cookies/fb/${cookieFile}`, "utf8"),
			),
		);
		await context.newPage();
		while (true) {
			await sleep(1000);
		}
	}
	async reloginAccount(cookieFile: string) {
		logger.info(`Validating account with cookie file: ${cookieFile}`);
		if (!fs.existsSync(`data/cookies/fb/${cookieFile}`)) {
			throw new Error("Cookie file does not exist.");
		}
		logger.info("Launching browser with specified cookie file...");
		const browser = await chromium.launch({
			headless: false,
			channel: this.#browserChannel,
		});
		const context = await browser.newContext(
			{...devices["Desktop Edge"]}
		)
		context.addCookies(
			JSON.parse(
				fs.readFileSync(`data/cookies/fb/${cookieFile}`, "utf8"),
			),
		);
		const page = await context.newPage();
		await page.goto("https://www.facebook.com/");
		let url = new URL(page.url());
		if (!await this.isAccountLoggedOut(page)) {
			logger.info("Account is already logged in.");
			return;
		}
		logger.warn("Account is logged out, please login again...");
		while (await this.isAccountLoggedOut(page)) {
			await sleep(1000);
		}
		while (url.pathname !== "/") {
			if (url.pathname.startsWith("/checkpoint")) {
				// The account is locked, we can't continue.
				logger.error("Checkpoint detected, KEKW.");
				throw new Error("Account is locked, can't continue.");
			}
			await sleep(1000);
			url = new URL(page.url());
		}
		logger.info("Saving cookies...");
		const cookies = await context.cookies();
		fs.writeFileSync(
			`data/cookies/fb/${cookieFile}`,
			JSON.stringify(cookies, null, 4),
		);
		await browser.close();
		logger.info(`Account added successfully to ${cookieFile}`);
	}
}

export default Facebook;
