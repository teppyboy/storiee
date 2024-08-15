import * as fs from "node:fs";
import { JSDOM } from "jsdom";
import logger from "../logger.js";
import { findValue, getValue, getValueAll, sleep } from "../utils.js";
import { RemoteVideo } from "./classes.js";
import type Facebook from "./index.js";

class FacebookStory {
	#facebook: Facebook;
	constructor(facebook: Facebook) {
		this.#facebook = facebook;
	}
	/**
	@deprecated This method is less reliable and may not work in the future.
	*/
	async getStoryInfoByIntercept(url: string) {
		const page = await this.#facebook.getPage();
		// Variables
		let storyCount = 1;
		const stories: [
			{
				unified:
					| {
							browser_native_sd_url: string;
							browser_native_hd_url: string;
					  }
					| undefined;
				muted: RemoteVideo[];
				audio: string | null;
			},
		] = [
			{
				unified: undefined,
				muted: [],
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
		async function returnToFirstStory() {
			let prevBtn = await page.$$('[aria-label="Previous card"]');
			while (prevBtn.length > 0) {
				logger.debug("Clicking previous button...");
				try {
					await page.bringToFront();
					await prevBtn[0].click();
					await sleep(10);
				} catch (e) {
					logger.error(`Failed to click previous button: ${e}`);
				}
				prevBtn = await page.$$('[aria-label="Previous card"]');
			}
		}
		{
			await returnToFirstStory();
			let nextBtn = await page.$$('[aria-label="Next card"]');
			while (nextBtn.length > 0) {
				logger.debug("Clicking next button...");
				await page.bringToFront();
				await nextBtn[0].click();
				stories.push({
					unified: undefined,
					muted: [],
					audio: null,
				});
				storyCount++;
				await sleep(10);
				nextBtn = await page.$$('[aria-label="Next card"]');
			}
			await returnToFirstStory();
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
					return Number.parseInt(value);
				}
			}
		}
		page.on("request", (interceptedRequest) => {
			const url = new URL(interceptedRequest.url());
			// logger.debug("Intercepting request: %s", interceptedRequest.url());
			if (url.pathname.endsWith(".mp4")) {
				url.searchParams.delete("bytestart");
				const fileName = url.pathname.split("/").pop() as string;
				const byteEnd = Number.parseInt(
					url.searchParams.get("byteend") as string,
				);
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
				const efg = Buffer.from(
					url.searchParams.get("efg") as string,
					"base64",
				).toString("utf-8");
				const isVideo =
					efg.includes("video") || efg.includes("vp9") || efg.includes("avc");
				const isAudio = efg.includes("audio");
				let width = 0;
				let height = 0;
				const efgJson = JSON.parse(efg);
				if (efgJson.vencode_tag.endsWith("p")) {
					// In mobile we do 720x1280 instead of 1280x720 most of the time.
					// The format is {"vencode_tag":"dash_vp9-basic-gen2_720p"}
					try {
						width = Number.parseInt(
							(
								(efgJson.vencode_tag.split("_") as string[]).pop() as string
							).split("p")[0],
						);
						height = (width / 9) * 16;
					} catch (e) {
						logger.error(`Failed to parse width and height: ${e}`);
					}
				}
				logger.debug(`EFG: ${efg}`);
				logger.debug(`Is video: ${isVideo}`);
				logger.debug(`Is audio: ${isAudio}`);
				const urlStr = url.toString();
				if (!findValue(stories, urlStr)) {
					if (isVideo) {
						stories[storyIdx].muted.push(
							new RemoteVideo(urlStr, width, height, 0, false, null),
						);
					} else if (isAudio) {
						stories[storyIdx].audio = urlStr;
					}
				}
			}
		});

		await page.reload();
		await viewStory();

		await sleep(750);
		let nextBtn = await page.$$('[aria-label="Next card"]');
		while (nextBtn.length > 0) {
			logger.debug("Clicking next button...");
			await page.bringToFront();
			storyIdx++;
			await nextBtn[0].click();
			await sleep(750);
			nextBtn = await page.$$('[aria-label="Next card"]');
		}
		// Cleanup
		await page.close();

		// Fix variables
		if (storyCount > 1) {
			// biome-ignore lint/suspicious/noExplicitAny: Resolution is a complicated object.
			const resolutions: any = {};
			const story0Videos = structuredClone(stories[0].muted);
			for (const video of stories[0].muted) {
				if (!resolutions[video.width]) {
					resolutions[video.width] = [];
				}
				const filteredVideo = story0Videos.splice(0, 1)[0];
				resolutions[video.width].push(filteredVideo);
			}
			stories[0].muted = [];
			logger.debug("Story [0] videos: %o", stories[0].muted);
			let maxStory = storyCount;
			let count = 0;
			for (const [storyIdx, story] of stories.entries()) {
				if (story.muted.length > 0) {
					count++;
				}
				if (story.audio) {
					count++;
				}
				if (count === 8) {
					maxStory = storyIdx;
					break;
				}
			}
			logger.debug("Resolutions: %o", resolutions);
			logger.debug(`Max story: ${maxStory}`);
			logger.debug("Reordering videos...");
			try {
				for (const [_, res] of Object.entries(resolutions)) {
					// Resolution is an array of video
					// Watafak TypeShit
					// biome-ignore lint/suspicious/noExplicitAny: Bypass the TypeScript type checker
					const resolution: RemoteVideo[] = res as any;
					if (resolution == null) {
						continue;
					}
					logger.debug("Resolution: %o", resolution);
					if (resolution.length > 1) {
						for (const [i, story] of stories.entries()) {
							if (i === 0) {
								continue;
							}
							if (story.muted.length > 0) {
								logger.debug("Array before: %o", resolution);
								const element = resolution.splice(1, 1)[0];
								story.muted.unshift(element);
								logger.debug("Array after: %o", resolution);
								if (resolution.length === 1) {
									break;
								}
							}
						}
					}
					logger.debug("Resolution (after): %o", resolution);
					stories[0].muted.unshift(...resolution);
				}
			} catch (e) {
				logger.error(`Failed to reorder videos: ${e}`);
			}
			// Remove empty last story.
			if (
				stories[stories.length - 1].muted.length === 0 &&
				stories[stories.length - 1].audio === null
			) {
				stories.pop();
			}
		}
		for (const story of stories) {
			for (const video of story.muted) {
				try {
					const bandwidth = getBandwidth(
						(video.url.split("/").pop() as string).split("?").shift() as string,
					) as number;
					// logger.debug(bandwidth);
					video.bandwidth = bandwidth;
					logger.debug(`Bandwidth: ${video.bandwidth}`);
				} catch (e) {
					logger.error(`Failed to get bandwidth: ${e}`);
				}
			}
		}
		// Finally return
		return { stories };
	}
	/**
	 * Gets the Facebook story information.
	 *
	 * There are two methods here:
	 * 1. `html` - HTML parsing: This method is faster and more reliable as it can produce better
	 * results such as video with audio URLs and also the video resolution. But it may break in the
	 * future if Facebook changes their JSON structure.
	 *
	 * 2. `intercept` (*deprecated*) - Request interception: This method is slower and deprecated
	 * because it's less reliable and may not work in the future. It's also more complex to implement
	 * and doesn't work with Chromium.
	 *
	 * @param url
	 * @param method
	 * @returns
	 */
	async getStoryInfo(
		url: string,
		method = "html",
	): Promise<{
		stories: {
			unified:
				| {
						browser_native_sd_url: string;
						browser_native_hd_url: string;
				  }
				| undefined;
			muted: RemoteVideo[];
			audio: string | null;
		}[];
	}> {
		try {
			const urlObj = new URL(url);
			if (urlObj.hostname !== "www.facebook.com") {
				throw new URIError(
					"Invalid URL, only Facebook Stories/Posts URLs are allowed.",
				);
			}
			if (
				!["/stories/", "/story.php/"].some((word) =>
					urlObj.pathname.startsWith(word),
				) &&
				!urlObj.pathname.includes("/posts/")
			) {
				throw new URIError(
					"Invalid URL, only Facebook Stories/Posts URLs are allowed.",
				);
			}
		} catch (e) {
			throw new URIError(
				"Invalid URL, only Facebook Stories/Posts URLs are allowed.",
			);
		}
		logger.debug("Story URL: %s", url);
		switch (method) {
			case "html": {
				const page = await this.#facebook.getPage();
				await page.goto(url);
				const source = await page.content();
				// We don't need to wait for the page to close
				page.close().catch((e) => logger.error(`Failed to close page: ${e}`));
				return this.getStoryInfoFromHTML(source);
			}
			case "intercept": {
				return this.getStoryInfoByIntercept(url);
			}
			default:
				throw new TypeError("Invalid method.");
		}
	}
	getStoryInfoFromHTML(source: string) {
		const dom = new JSDOM(source);
		const stories: [
			{
				unified: {
					browser_native_sd_url: string;
					browser_native_hd_url: string;
				};
				muted: RemoteVideo[];
				audio: string | null;
				thumbnail: string | null;
			},
		] = [
			{
				unified: {
					browser_native_sd_url: "",
					browser_native_hd_url: "",
				},
				muted: [],
				audio: null,
				thumbnail: null,
			},
		];
		const thumbnails: string[] = [];
		// const document = page.mainFrame.window.document;
		const document = dom.window.document;
		for (const script of document.querySelectorAll("script")) {
			const length = Number(script.getAttribute("data-content-len"));
			if (script.innerHTML.length !== length) {
				logger.debug(
					"Mismatch length (expected / innerHTML.length): %d / %d",
					length,
					script.innerHTML.length,
				);
				continue;
			}
			try {
				const data = JSON.parse(script.innerHTML);
				// Parse unified stories (videos with audio)
				// biome-ignore lint/suspicious/noExplicitAny: facebook.com is a mess.
				const attachmentsArr: any = getValueAll(data, "attachments");
				if (attachmentsArr.length > 0) {
					logger.debug(`Attachment length: ${attachmentsArr.length}`);
					if (logger.level === "debug") {
						fs.writeFileSync(`debug/story_${length}_1.json`, script.innerHTML);
					}
					for (const [i, attachments] of attachmentsArr.entries()) {
						logger.debug(`Attachments ${i}: %o`, attachments);
						// Post parsing
						if (attachments.length === 1) {
							const subAttachments = getValue(
								attachments[0],
								"all_subattachments",
								// biome-ignore lint/suspicious/noExplicitAny: I want TypeScript to stfu
							) as any;
							if (subAttachments) {
								logger.debug("Subattachments detected.");
								// This is not actually a story, but a post.
								// Parse videos with audio
								let videoIdx = -1;
								for (const [_, node] of subAttachments.nodes.entries()) {
									switch (node.media.__typename) {
										case "Photo":
											// Parse photos
											logger.debug("Photo not supported yet.");
											break;
										case "Video": {
											videoIdx += 1;
											if (!stories[videoIdx]) {
												stories[videoIdx] = {
													unified: {
														browser_native_sd_url: "",
														browser_native_hd_url: "",
													},
													muted: [],
													audio: null,
													thumbnail: null,
												};
											}
											const videoGridRenderer = node.media.video_grid_renderer;
											try {
												stories[videoIdx].thumbnail =
													videoGridRenderer.preferred_thumbnail.image.uri;
											} catch (e) {
												logger.warn(`Failed to parse thumbnail: ${e}`);
												stories[videoIdx].thumbnail =
													node.media.viewer_image.uri;
											}
											const video = videoGridRenderer.video;
											stories[videoIdx].unified = {
												browser_native_sd_url: video.browser_native_sd_url,
												browser_native_hd_url: video.browser_native_hd_url,
											};
										}
									}
								}
								continue;
							}
						}
						// End of post parsing
						if (!stories[i]) {
							stories[i] = {
								unified: {
									browser_native_sd_url: "",
									browser_native_hd_url: "",
								},
								muted: [],
								audio: null,
								thumbnail: null,
							};
						}
						try {
							stories[i].unified = {
								browser_native_sd_url:
									attachments[0].media.browser_native_sd_url,
								browser_native_hd_url:
									attachments[0].media.browser_native_hd_url,
							};
						} catch (e) {
							logger.warn(`Failed to parse unified story: ${e}`);
							continue;
						}
						// Parse thumbnails
						try {
							thumbnails[i] =
								attachments[0].media.preferred_thumbnail.image.uri;
						} catch (e) {
							logger.warn(`Failed to parse thumbnail: ${e}`);
						}
					}
				}
				// Parse segmented stories (videos without audio, audio)
				// biome-ignore lint/suspicious/noExplicitAny: I would do typing correctly if I understood.
				const videoDashes: any = getValue(
					data,
					"all_video_dash_prefetch_representations",
				);
				if (videoDashes) {
					if (logger.level === "debug") {
						fs.writeFileSync(`debug/story_${length}_2.json`, script.innerHTML);
					}
					for (const [i, videoDash] of videoDashes.entries()) {
						for (const representation of videoDash.representations) {
							if (!stories[i]) {
								stories[i] = {
									unified: {
										browser_native_sd_url: "",
										browser_native_hd_url: "",
									},
									muted: [],
									audio: null,
									thumbnail: null,
								};
							}
							if (representation.mime_type.includes("video")) {
								const video = new RemoteVideo(
									representation.base_url,
									representation.width,
									representation.height,
									representation.bandwidth,
									false,
									thumbnails[i] || null,
								);
								stories[i].muted.push(video);
							} else {
								stories[i].audio = representation.base_url;
							}
						}
					}
				}
			} catch (e) {
				logger.debug("Failed to parse script innerHTML: %s", e);
			}
		}
		// Deduplicate
		for (const story of stories) {
			const newMutedVideos = [];
			for (const video of story.muted) {
				if (!findValue(newMutedVideos, video.url)) {
					newMutedVideos.push(video);
				}
			}
			story.muted = newMutedVideos;
		}
		// Remove first story if it's empty
		if (stories[0].unified.browser_native_sd_url === "") {
			stories.shift();
		}
		// Remove empty stories
		const filteredStories = stories.filter(
			(e) =>
				e.unified.browser_native_sd_url !== "" &&
				e.muted.length > 0 &&
				e.audio !== null,
		);
		return { stories: filteredStories };
	}
}

export default FacebookStory;
