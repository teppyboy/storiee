import * as fs from "node:fs";
import "@bogeychan/elysia-polyfills/node/index.js";
import { Elysia, t } from "elysia";
import puppeteer from "puppeteer";
import * as constants from "./constants.js";
import Facebook from "./facebook/index.js";
import logger from "./logger.js";
import { sleep } from "./utils.js";

console.log(`Storiee Server - v${constants.VERSION}`);
const facebook = new Facebook();

// Create a data directory if it doesn't exist
fs.mkdirSync("data/cookies/", { recursive: true });

for (const arg of process.argv) {
	if (arg === "add-account") {
		try {
			await facebook.addAccount();
		} catch (e) {
			logger.error(`Failed to add account: ${e}`);
			process.exit(1);
		}
		process.exit(0);
	}
}

logger.info("Initializing components...");
// Load cookies
logger.info("Loading cookies...");
facebook.loadCookies();
if (facebook.cookies.length > 0) {
	logger.info(`Loaded ${facebook.cookies.length} cookies`);
} else {
	logger.error("No cookies loaded.");
	logger.error(
		"Please login to your account to load cookies with the 'add-account' command",
	);
	logger.error(
		"Keep in mind using 'add-account' will require you to run Chrome without headless mode",
	);
	process.exit(1);
}

const pages: puppeteer.Page[] = [];
logger.info("Initializing browser...");
// Launch the browser and open a new blank page
const browser = await puppeteer.launch({
	headless: process.env.HEADLESS !== "false" ? true : false,
	defaultViewport: {
		width: 1920,
		height: 1080,
		deviceScaleFactor: 1,
	},
});
logger.debug("Creating setInterval to create new pages...");
setInterval(async () => {
	// Hardcoding to 4 for now
	if (pages.length < 4) {
		logger.debug(`Creating new page. Current page count: ${pages.length}`);
		const page = await browser.newPage();
		pages.push(page);
	}
}, 100);

async function getPage() {
	let page: puppeteer.Page;
	const maybePage = pages.shift();
	if (!maybePage) {
		page = await browser.newPage();
	} else {
		page = maybePage;
	}
	const cookie = facebook.getRandomCookie();
	await page.setCookie(...(cookie as unknown as puppeteer.CookieParam[]));
	return page;
}
// Let the browser start up
await sleep(1000);

// Start the server
logger.info("Starting server...");
new Elysia()
	.get("/", () => "Storiee server is running correctly.")
	// API v1
	.get(
		"/api/v1/facebook/story/url",
		async ({ set, query }) => {
			try {
				return {
					message: "OK",
					data: await facebook.story.getVideosAndAudioUrls(
						await getPage(),
						query.url,
						query.method ? query.method : "html",
					),
				};
			} catch (e) {
				set.status = 500;
				return {
					error: "Internal server error",
					message: e,
				};
			}
		},
		{
			query: t.Object({
				url: t.String(),
				method: t.Optional(t.String()),
			}),
		},
	)
	.onError(({ code }) => {
		if (code === "NOT_FOUND")
			return {
				error: "Not found",
				message: "The requested resource was not found.",
			};
	})
	.listen(8080);

// await browser.close();
