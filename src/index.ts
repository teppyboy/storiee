import puppeteer from 'puppeteer';
import Facebook from "./facebook/index.js";
import logger from "./logger.js";
import * as constants from "./constants.js";
import { sleep } from "./utils.js";
import * as fs from "node:fs";

console.log(`Storiee v${constants.VERSION}`);
logger.info("Initializing Storiee...");
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
	process.exit(1);
}

const pages: puppeteer.Page[] = [];
logger.info("Initializing browser...");
// Launch the browser and open a new blank page
const browser = await puppeteer.launch({ headless: true, defaultViewport: {
	width: 1920,
	height: 1080,
	deviceScaleFactor: 1,
}});
logger.debug("Creating setInterval to create new pages...");
setInterval(async () => {
	// Hardcoding to 4 for now
	while (pages.length < 4) {
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
	return page;
}
await sleep(1000);
// DEBUGGING PURPOSES ONLY PLS REMOVE WHEN PUSH TO GH
if (!process.env.SEGS_URL) {
	logger.error("SEGS_URL not set, please set it in your environment variables.");
	process.exit(1);
}
const SEGS_URL = process.env.SEGS_URL;
logger.debug("SEGS_URL: %s", SEGS_URL);
const videoAndAudios = await facebook.story.getVideosAndAudioUrls(await getPage(), facebook.getRandomCookie(), SEGS_URL);

logger.debug("Video & Audio: %o", videoAndAudios);

await browser.close();
