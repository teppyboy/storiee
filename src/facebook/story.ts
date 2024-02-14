import { JSDOM } from "jsdom";
import puppeteer from "puppeteer";
import logger from "../logger.js";
import { findValue, getValue, sleep } from "../utils.js";
import { RemoteVideo } from "./classes.js";

class FacebookStory {
	/**
	 * Gets the video and audio URLs from a Facebook story.
	 *
	 * There are two methods to get the video and audio URLs:
	 * 1. `html` - HTML parsing: This method is faster and more reliable as it can produce
	 * better results such as video with audio URLs and also the video resolution. But it
	 * may break in the future if Facebook changes their JSON structure.
	 *
	 * 2. `intercept` - Request interception: This method is slower and less reliable as
	 * it can only produce video without audio URLs (along with the audio URL). This method
	 * is more reliable as it doesn't rely on parsing the HTML structure.
	 *
	 * @param page
	 * @param url
	 * @returns
	 */
	async getVideosAndAudioUrls(
		page: puppeteer.Page,
		url: string,
		method = "html",
	) {
		switch (method) {
			case "html": {
				await page.goto(url);
				const source = await page.content();
				return this.getVideosAndAudioUrlsFromHTML(source, url);
			}
			case "intercept": {
				// Variables
				let storyCount = 1;
				const stories: [
					{
						videos: RemoteVideo[];
						audio: string | null;
					},
				] = [
					{
						videos: [],
						audio: null,
					},
				];

				async function viewStory() {
					for (const span of await page.$$("span")) {
						const innerHTML = await page.evaluate((el) => el.innerHTML, span);
						// logger.debug("Span innerHTML: %s", innerHTML);
						if (innerHTML.includes("Click to view story")) {
							logger.debug("Clicking to view story...");
							// Detect how many stories we have first.
							// Assuming we have 2 stories then there'll be 4 URLs (2 videos, 2 audio).
							await span.evaluate((el) => el.parentElement?.click());
							break;
						}
					}
				}

				await page.goto(url);
				await viewStory();
				// Avoid conflict variable name
				{
					let nextBtn = await page.$$('[aria-label="Next card"]');
					while (nextBtn.length > 0) {
						logger.debug("Clicking next button...");
						await page.bringToFront();
						await nextBtn[0].click();
						stories.push({
							videos: [],
							audio: null,
						});
						storyCount++;
						await sleep(50);
						nextBtn = await page.$$('[aria-label="Next card"]');
					}
				}

				logger.debug(`Story count: ${storyCount}`);
				logger.debug("Enabling request interception...");
				let storyIdx = 0;
				// Fix TypeScript being annoying
				const storyBandwidths = {
					data: "",
				};
				// Goddamn debug
				function getBandwidth(fileName: string): number | undefined {
					// logger.debug(`File name: ${fileName}`);
					for (const line of storyBandwidths.data.split(";")) {
						// logger.debug(`Line: ${line}`);
						const [key, value] = line.split("=", 2);
						// logger.debug(`Key: ${key}`);
						// logger.debug(`Value: ${value}`);
						if (key === fileName) {
							return parseInt(value);
						}
					}
				}
				await page.setRequestInterception(true);
				page.on("request", (interceptedRequest) => {
					const url = new URL(interceptedRequest.url());
					// logger.debug("Intercepting request: %s", interceptedRequest.url());
					if (url.pathname.endsWith(".mp4")) {
						url.searchParams.delete("bytestart");
						const fileName = url.pathname.split("/").pop() as string;
						const byteEnd = parseInt(url.searchParams.get("byteend") as string);
						logger.debug(`Byte end: ${byteEnd}`);
						const currentBandwidth = getBandwidth(fileName);
						if (!currentBandwidth) {
							storyBandwidths.data += `${fileName}=${byteEnd};`;
						} else {
							if (byteEnd > currentBandwidth) {
								storyBandwidths.data = storyBandwidths.data.replace(
									`${fileName}=${currentBandwidth};`,
									`${fileName}=${byteEnd};`,
								);
							}
						}
						logger.debug(`Bandwidth: ${currentBandwidth}`);
						url.searchParams.delete("byteend");
						// It will not be null
						const efg = url.searchParams.get("efg") as string;
						const isVideo = Buffer.from(efg, "base64")
							.toString("utf-8")
							.includes("video");
						const isAudio = Buffer.from(efg, "base64")
							.toString("utf-8")
							.includes("audio");
						logger.debug(`EFG: ${efg}`);
						logger.debug(`Is video: ${isVideo}`);
						logger.debug(`Is audio: ${isAudio}`);
						const urlStr = url.toString();
						if (!findValue(stories, urlStr)) {
							if (isVideo) {
								stories[storyIdx].videos.push(
									new RemoteVideo(urlStr, 0, 0, 0, false),
								);
							} else if (isAudio) {
								stories[storyIdx].audio = urlStr;
							}
						}
					}
					interceptedRequest.continue();
				});

				await page.reload();
				await viewStory();

				await sleep(500);
				let nextBtn = await page.$$('[aria-label="Next card"]');
				while (nextBtn.length > 0) {
					logger.debug("Clicking next button...");
					await page.bringToFront();
					storyIdx++;
					await nextBtn[0].click();
					await sleep(500);
					nextBtn = await page.$$('[aria-label="Next card"]');
				}
				// Cleanup
				await page.close();

				// Fix variables
				if (storyCount > 1) {
					// Will re-enable this code when I'm smarter.
					// For now just remove all of the vids :)
					stories[0].videos.splice(0, storyCount);
					// logger.debug("Reordering videos...");
					// for (let i = 1; i < storyCount; i++) {
					// 	logger.debug("Array before: %o", stories[0].videos);
					// 	const element = stories[0].videos.splice(1, 1)[0];
					// 	logger.debug("Array after: %o", stories[0].videos);
					// 	stories[i].videos.unshift(element);
					// }
				}
				for (const story of stories) {
					for (const video of story.videos) {
						const bandwidth = getBandwidth(
							(video.url.split("/").pop() as string)
								.split("?")
								.shift() as string,
						) as number;
						// logger.debug(bandwidth);
						video.bandwidth = bandwidth;
						logger.debug(`Bandwidth: ${video.bandwidth}`);
					}
				}
				// Finally return
				return { stories };
			}
			default:
				throw new Error("Invalid method.");
		}
	}
	getVideosAndAudioUrlsFromHTML(source: string, url: string) {
		const dom = new JSDOM(source, {
			url: url,
			runScripts: "dangerously",
		});
		const stories: [
			{
				videos: {
					unified: {
						browser_native_sd_url: string;
						browser_native_hd_url: string;
					};
					muted: RemoteVideo[];
				};
				audio: string;
			},
		] = [
			{
				videos: {
					unified: {
						browser_native_sd_url: "",
						browser_native_hd_url: "",
					},
					muted: [],
				},
				audio: "",
			},
		];
		const videos: {
			unified: {
				browser_native_sd_url: string;
				browser_native_hd_url: string;
			};
			muted: RemoteVideo[];
		} = {
			unified: {
				browser_native_sd_url: "",
				browser_native_hd_url: "",
			},
			muted: [],
		};
		let audio = "";
		// const document = page.mainFrame.window.document;
		const document = dom.window.document;
		for (const script of document.querySelectorAll("script")) {
			const length = Number(script.getAttribute("data-content-len"));
			if (script.innerHTML.length !== length) {
				logger.debug("Mismatch length: %d", length);
				logger.debug("Script innerHTML length: %d", script.innerHTML.length);
			}
			try {
				const data = JSON.parse(script.innerHTML);
				// Parse unified stories (videos with audio)
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				const unifiedStories: any = getValue(data, "unified_stories");
				if (unifiedStories) {
					edgeForLoop: for (const edge of unifiedStories.edges) {
						for (const attachment of edge.node.attachments) {
							videos.unified = {
								browser_native_sd_url: attachment.media.browser_native_sd_url,
								browser_native_hd_url: attachment.media.browser_native_sd_url,
							};
							break edgeForLoop;
						}
					}
				}
				// Parse segmented stories (videos without audio, audio)
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				const videoDashes: any = getValue(
					data,
					"all_video_dash_prefetch_representations",
				);
				if (videoDashes) {
					for (const value of videoDashes) {
						for (const representation of value.representations) {
							if (representation.mime_type.includes("video")) {
								const video = new RemoteVideo(
									representation.base_url,
									representation.width,
									representation.height,
									representation.bandwidth,
									false,
								);
								videos.muted.push(video);
							} else {
								audio = representation.base_url;
							}
						}
					}
				}
			} catch (e) {
				logger.debug("Failed to parse script innerHTML: %s", e);
			}
		}
		return { videos, audio };
	}
}

export default FacebookStory;
