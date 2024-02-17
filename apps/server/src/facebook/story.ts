import { JSDOM } from "jsdom";
import logger from "../logger.js";
import { findValue, getValue, getValueAll, sleep } from "../utils.js";
import { RemoteVideo } from "./classes.js";
import Facebook from "./index.js";

class FacebookStory {
	#facebook: Facebook;
	constructor(facebook: Facebook) {
		this.#facebook = facebook;
	}
	/**
	 * Gets the video and audio URLs from a Facebook story.
	 *
	 * There are two methods to get the video and audio URLs:
	 * 1. `html` - HTML parsing: This method is faster and more reliable as it can produce
	 * better results such as video with audio URLs and also the video resolution. But it
	 * may break in the future if Facebook changes their JSON structure.
	 *
	 * 2. `intercept` - Request interception: This method is slower but more reliable because
	 * it doesn't depend on the JSON structure entirely (it still does slightly for extra
	 * information such as video resolution). But beware that results may not be as good as
	 * the `html` method.
	 *
	 * @param page
	 * @param url
	 * @param method
	 * @returns
	 */
	async getVideosAndAudioUrls(url: string, method = "html") {
		const page = await this.#facebook.getPage();
		logger.debug("Story URL: %s", url);
		let storyUrl = url;
		if (storyUrl.startsWith("https:%2F%2Fwww.facebook.com")) {
			// The url is still encoded somehow.
			storyUrl = decodeURIComponent(url);
		}
		switch (method) {
			case "html": {
				await page.goto(storyUrl);
				const source = await page.content();
				await page.close();
				return this.getVideosAndAudioUrlsFromHTML(source);
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

				await page.goto(storyUrl);
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
							videos: [],
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
							return parseInt(value);
						}
					}
				}
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
						const efg = Buffer.from(
							url.searchParams.get("efg") as string,
							"base64",
						).toString("utf-8");
						const isVideo =
							efg.includes("video") ||
							efg.includes("vp9") ||
							efg.includes("avc");
						const isAudio = efg.includes("audio");
						let width = 0;
						let height = 0;
						const efgJson = JSON.parse(efg);
						if (efgJson.vencode_tag.endsWith("p")) {
							// In mobile we do 720x1280 instead of 1280x720 most of the time.
							// The format is {"vencode_tag":"dash_vp9-basic-gen2_720p"}
							try {
								width = parseInt(
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
								stories[storyIdx].videos.push(
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
					// Will re-enable this code when I'm smarter.
					// For now just remove all of the vids :)
					// stories[0].videos.splice(0, storyCount);
					// biome-ignore lint/suspicious/noExplicitAny: <explanation>
					const resolutions: any = {};
					const story0Videos = structuredClone(stories[0].videos);
					for (const video of stories[0].videos) {
						if (!resolutions[video.width]) {
							resolutions[video.width] = [];
						}
						const filteredVideo = story0Videos.splice(0, 1)[0];
						resolutions[video.width].push(filteredVideo);
					}
					stories[0].videos = [];
					logger.debug("Story [0] videos: %o", stories[0].videos);
					let maxStory = storyCount;
					let count = 0;
					for (const [storyIdx, story] of stories.entries()) {
						if (story.videos.length > 0) {
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
							// biome-ignore lint/suspicious/noExplicitAny: <explanation>
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
									if (story.videos.length > 0) {
										logger.debug("Array before: %o", resolution);
										const element = resolution.splice(1, 1)[0];
										story.videos.unshift(element);
										logger.debug("Array after: %o", resolution);
										if (resolution.length === 1) {
											break;
										}
									}
								}
							}
							logger.debug("Resolution (after): %o", resolution);
							stories[0].videos.unshift(...resolution);
						}
					} catch (e) {
						logger.error(`Failed to reorder videos: ${e}`);
					}
					// Remove empty last story.
					if (
						stories[stories.length - 1].videos.length === 0 &&
						stories[stories.length - 1].audio === null
					) {
						stories.pop();
					}
				}
				for (const story of stories) {
					for (const video of story.videos) {
						try {
							const bandwidth = getBandwidth(
								(video.url.split("/").pop() as string)
									.split("?")
									.shift() as string,
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
			default:
				throw new Error("Invalid method.");
		}
	}
	getVideosAndAudioUrlsFromHTML(source: string) {
		const dom = new JSDOM(source, {
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
				audio: string | null;
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
				audio: null,
			},
		];
		const thumbnails: string[] = [];
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
				const attachmentsArr: any = getValueAll(data, "attachments");
				if (attachmentsArr.length > 0) {
					logger.debug(`Attachment length: ${attachmentsArr.length}`);
					// fs.writeFileSync("a.json", script.innerHTML);
					for (const [i, attachments] of attachmentsArr.entries()) {
						logger.debug("Attachments: %o", attachments);
						logger.debug(`Index: ${i}`);
						if (!stories[i]) {
							stories[i] = {
								videos: {
									unified: {
										browser_native_sd_url: "",
										browser_native_hd_url: "",
									},
									muted: [],
								},
								audio: null,
							};
						}
						stories[i].videos.unified = {
							browser_native_sd_url: attachments[0].media.browser_native_sd_url,
							browser_native_hd_url: attachments[0].media.browser_native_hd_url,
						};
						// Parse thumbnails
						try {
							thumbnails[i] =
								attachments[0].media.preferred_thumbnail.image.url;
						} catch (e) {
							logger.warn(`Failed to parse thumbnail: ${e}`);
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
					for (const [i, videoDash] of videoDashes.entries()) {
						for (const representation of videoDash.representations) {
							if (!stories[i]) {
								stories[i] = {
									videos: {
										unified: {
											browser_native_sd_url: "",
											browser_native_hd_url: "",
										},
										muted: [],
									},
									audio: null,
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
								stories[i].videos.muted.push(video);
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
			for (const video of story.videos.muted) {
				if (!findValue(newMutedVideos, video.url)) {
					newMutedVideos.push(video);
				}
			}
			story.videos.muted = newMutedVideos;
		}
		// Remove first story if it's empty
		if (stories[0].videos.unified.browser_native_sd_url === "") {
			stories.shift();
		}
		return { stories };
	}
}

export default FacebookStory;
