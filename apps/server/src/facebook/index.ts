import * as fs from "node:fs";
import {
	type Browser,
	type BrowserContext,
	type Page,
	chromium,
	devices,
} from "playwright";
import logger from "../logger.js";
import { sleep } from "../utils.js";
import { Account } from "./classes.js";
import FacebookStory from "./story.js";
import FacebookVideo from "./video.js";

const COOKIE_PATH = "data/cookies/fb";
const ACCOUNT_PATH = "data/accounts/fb";

class Facebook {
	story: FacebookStory;
	video: FacebookVideo;
	#browser: Browser | undefined;
	#browserChannel: string;
	contexts: {
		context: BrowserContext;
		cookieFile: string;
		account: Account | null;
	}[] = [];
	constructor(browser: Browser | undefined = undefined) {
		this.story = new FacebookStory(this);
		this.video = new FacebookVideo(this);
		this.#browser = browser;
		this.#browserChannel = process.env.BROWSER_CHANNEL || "chrome";
		fs.mkdirSync(COOKIE_PATH, { recursive: true });
		fs.mkdirSync(ACCOUNT_PATH, { recursive: true });
	}
	setBrowser(browser: Browser) {
		this.#browser = browser;
	}
	async loadCookies() {
		if (!this.#browser) {
			throw new Error("Browser is not initialized.");
		}
		for (const file of fs.readdirSync(COOKIE_PATH)) {
			logger.debug(`Loading cookie file: ${file}`);
			const cookie = fs.readFileSync(`${COOKIE_PATH}/${file}`, "utf8");
			let account: Account | null = null;
			if (fs.existsSync(`${ACCOUNT_PATH}/${file}`)) {
				account = JSON.parse(
					fs.readFileSync(`${ACCOUNT_PATH}/${file}`, "utf8"),
				);
			}
			const context = await this.#browser.newContext({
				...devices["Desktop Edge"],
			});
			context.addCookies(JSON.parse(cookie));
			const page = await context.newPage();
			await page.goto("https://www.facebook.com/");
			if (await this.isAccountCheckpoint(page)) {
				logger.warn(`Account in ${file} is locked (checkpoint), ignoring...`);
				page.close();
				continue;
			}
			if (await this.isAccountLoggedOut(page)) {
				logger.warn(`Account in ${file} is logged out, re-logging in...`);
				try {
					await this.reloginAccount(page, {
						context,
						cookieFile: file,
						account: account,
					});
				} catch (e) {
					logger.error(`Failed to re-login account: ${e}`);
					page.close();
					continue;
				}
			}
			page.close();
			this.contexts.push({
				context: context,
				cookieFile: file,
				account: account,
			});
		}
	}
	async getPage() {
		if (!this.#browser) {
			throw new Error("Browser is not initialized.");
		}
		const contextData =
			this.contexts[Math.floor(Math.random() * this.contexts.length)];
		const page = await contextData.context.newPage();
		if (await this.isAccountLoggedOut(page)) {
			logger.warn(
				`Account in ${contextData.cookieFile} is logged out, trying to re-login...`,
			);
			await this.reloginAccount(page, contextData);
		}
		return page;
	}
	async isAccountCheckpoint(page: Page) {
		const url = new URL(page.url());
		if (url.pathname.startsWith("/checkpoint")) {
			// The account is locked, we can't continue.
			logger.error("Checkpoint detected, KEKW.");
			return true;
		}
		return false;
	}
	async isAccountLoggedOut(page: Page) {
		try {
			return await page.$(".UIPage_LoggedOut");
		} catch (e) {
			logger.warn(`Error while getting logged out element: ${e}`);
			return true;
		}
	}
	async reloginAccount(
		page: Page,
		contextData: {
			context: BrowserContext;
			cookieFile: string;
			account: Account | null;
		},
	) {
		const loginButton = await page.$('a[href^="/login"]');
		if (!loginButton) {
			throw new Error("Login button not found.");
		}
		await loginButton.click();
		const passwordInput = page.locator("#pass:not([disabled])");
		while (await this.isAccountLoggedOut(page)) {
			await sleep(1000);
			if ((await passwordInput.all()).length > 0) {
				logger.warn("Password is required for this relogin.");
				if (!contextData.account) {
					throw new Error("Account data is required for relogin.");
				}
				await passwordInput.focus();
				await passwordInput.pressSequentially(contextData.account.password, {
					delay: 50,
				});
				await sleep(250);
				await page.locator('[name="login"]:not([id])').click();
				await sleep(3000);
			}
		}
		await this.#saveLoginCookies(
			page,
			contextData.context,
			contextData.cookieFile,
		);
	}
	async addAccount() {
		logger.info("Adding account...");
		const browser = await chromium.launch({
			headless: false,
			channel: this.#browserChannel,
		});
		const context = await browser.newContext({ ...devices["Desktop Edge"] });
		const page = await context.newPage();
		await page.goto("https://www.facebook.com/login/");
		const fileName = new Date().getTime().toString();
		await this.#saveLoginCookies(page, context, fileName);
		await browser.close();
		logger.info(`Account added successfully to ${fileName}.json`);
	}
	async #saveLoginCookies(
		page: Page,
		context: BrowserContext,
		cookieFile: string,
	) {
		let url = new URL(page.url());
		while (url.pathname !== "/") {
			if (url.pathname.startsWith("/checkpoint")) {
				// The account is locked, we can't continue.
				logger.error("Checkpoint detected, KEKW.");
				throw new Error("Account is locked, can't continue.");
			}
			await sleep(250);
			url = new URL(page.url());
		}
		logger.info("Saving cookies...");
		const cookies = await context.cookies();
		fs.writeFileSync(
			`data/cookies/fb/${cookieFile}`,
			JSON.stringify(cookies, null, 4),
		);
	}
	// Headful functions.
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
		const context = await browser.newContext({ ...devices["Desktop Edge"] });
		context.addCookies(
			JSON.parse(fs.readFileSync(`data/cookies/fb/${cookieFile}`, "utf8")),
		);
		logger.warn("Please use Ctrl + C to close the browser manually.");
		await context.newPage();
		try {
			while (true) {
				await sleep(1000);
			}
		} catch (e) {
			logger.info("Saving cookies...");
			const cookies = await context.cookies();
			fs.writeFileSync(
				`data/cookies/fb/${cookieFile}`,
				JSON.stringify(cookies, null, 4),
			);
		}
	}
	async reloginAccountHeadful(cookieFile: string) {
		logger.info(`Validating account with cookie file: ${cookieFile}`);
		if (!fs.existsSync(`data/cookies/fb/${cookieFile}`)) {
			throw new Error("Cookie file does not exist.");
		}
		logger.info("Launching browser with specified cookie file...");
		const browser = await chromium.launch({
			headless: false,
			channel: this.#browserChannel,
		});
		const context = await browser.newContext({ ...devices["Desktop Edge"] });
		context.addCookies(
			JSON.parse(fs.readFileSync(`data/cookies/fb/${cookieFile}`, "utf8")),
		);
		const page = await context.newPage();
		await page.goto("https://www.facebook.com/");
		if (!(await this.isAccountLoggedOut(page))) {
			logger.info("Account is already logged in.");
			return;
		}
		logger.warn("Account is logged out, please login again manually...");
		while (await this.isAccountLoggedOut(page)) {
			await sleep(1000);
		}
		await this.#saveLoginCookies(page, context, cookieFile);
		await browser.close();
		logger.info(`Account added successfully to ${cookieFile}`);
	}
}

export default Facebook;
