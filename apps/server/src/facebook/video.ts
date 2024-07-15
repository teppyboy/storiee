import * as fs from "node:fs";
import { JSDOM } from "jsdom";
import logger from "../logger.js";
import { findValue, getValue, getValueAll, sleep } from "../utils.js";
import { RemoteVideo } from "./classes.js";
import Facebook from "./index.js";

class FacebookVideo {
	#facebook: Facebook;
	constructor(facebook: Facebook) {
		this.#facebook = facebook;
	}
	/**
	@deprecated This method is less reliable and may not work in the future.
	*/
	async getVideoInfoByIntercept(url: string) {
		const page = await this.#facebook.getPage();
		// Variables
		const video: {
			unified:
				| undefined
				| {
						browser_native_sd_url: string | null;
						browser_native_hd_url: string | null;
				  };
			muted: RemoteVideo[];
			audio: string | null;
		} = {
			unified: undefined,
			muted: [],
			audio: null,
		};

		async function viewVideo() {
			logger.debug("Viewing video...");
			const viewVideoBtn = page.locator("[role=presentation]").first();
			if (viewVideoBtn) {
				await viewVideoBtn.click({ force: true });
			}
		}

		logger.debug("Enabling request interception...");
		// Fix TypeScript being annoying
		const videoBandwidths = {
			data: "",
		};
		function getBandwidth(fileName: string): number | undefined {
			// logger.debug(`File name: ${fileName}`);
			for (const line of videoBandwidths.data.split(";")) {
				// logger.debug(`Line: ${line}`);
				const [key, value] = line.split("=", 2);
				// logger.debug(`Key: ${key}`);
				// logger.debug(`Value: ${value}`);
				if (key === fileName) {
					return parseInt(value);
				}
			}
		}
		let currentHeight: number | null = null;
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
					videoBandwidths.data += `${fileName}=${byteEnd};`;
				} else {
					if (byteEnd > currentBandwidth) {
						videoBandwidths.data = videoBandwidths.data.replace(
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
						width = parseInt(
							(
								(efgJson.vencode_tag.split("_") as string[]).pop() as string
							).split("p")[0],
						);
						height = (width / 9) * 16;
					} catch (e) {
						logger.warn(`Failed to parse width and height: ${e}`);
						if (currentHeight) {
							height = currentHeight;
							width = (height / 16) * 9;
						}
					}
				}
				logger.debug(`EFG: ${efg}`);
				logger.debug(`Is video: ${isVideo}`);
				logger.debug(`Is audio: ${isAudio}`);
				const urlStr = url.toString();
				if (!findValue(video, urlStr)) {
					if (isVideo) {
						video.muted.push(
							new RemoteVideo(urlStr, width, height, 0, false, null),
						);
					} else if (isAudio) {
						video.audio = urlStr;
					}
				}
			}
		});

		await page.goto(url);
		await sleep(10);
		await viewVideo();
		// Change resolution
		await page.locator("[aria-label=Settings]").first()?.click();
		await sleep(10);
		// biome-ignore lint/suspicious/noImplicitAnyLet: elm is ElementHandleForTag<"div">
		let parentElement;
		for (const element of await page.locator("div").all()) {
			if ((await element.innerHTML()) === "Quality") {
				// Yeah exactly 5 times.
				parentElement = await element.evaluate(
					(e) =>
						e.parentElement?.parentElement?.parentElement?.parentElement
							?.parentElement,
				);
				await element.evaluate((e) => e.parentElement?.click());
				break;
			}
		}
		await sleep(10);
		logger.debug(`Parent element: ${parentElement}`);
		if (parentElement) {
			try {
				logger.debug(
					`Parent element first child: ${parentElement.children[0]}`,
				);
				const qualityElement =
					parentElement.children[0].children[0].children[1];
				logger.debug(`Quality element: ${qualityElement}`);
				if (qualityElement) {
					for (let i = 1; i < (qualityElement.children.length as number); i++) {
						// It SHOULD work.
						const qualityBtn = qualityElement.children[i].children[0];
						currentHeight = parseInt(
							qualityBtn.children[1].innerHTML.slice(0, -1),
						);
						(qualityBtn as HTMLElement).click();
						await sleep(10);
					}
				} else {
					logger.warn("Failed to get quality element.");
				}
			} catch (e) {
				logger.warn(`Failed to change resolution: ${e}`);
			}
		}
		// Cleanup
		await page.close();

		// Fix variables
		for (const vid of video.muted) {
			try {
				const bandwidth = getBandwidth(
					(vid.url.split("/").pop() as string).split("?").shift() as string,
				) as number;
				// logger.debug(bandwidth);
				vid.bandwidth = bandwidth;
				logger.debug(`Bandwidth: ${vid.bandwidth}`);
			} catch (e) {
				logger.error(`Failed to get bandwidth: ${e}`);
			}
		}
		// Finally return
		return { video };
	}
	/**
	 * Gets the video/reel information from the URL.
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
	 * `browser_native_sd_url` & `browser_native_hd_url` will be null if video is a video, otherwise 
	 * it's a reel.
	 * 
	 * @param url
	 * @param method
	 * @returns object
	 */
	async getVideoInfo(
		url: string,
		method = "html",
	): Promise<{
		video: {
			unified:
				| undefined
				| {
						browser_native_sd_url: string | null;
						browser_native_hd_url: string | null;
				  };
			muted: RemoteVideo[];
			audio: string | null;
		};
	}> {
		logger.debug("Video URL: %s", url);
		switch (method) {
			case "html": {
				const page = await this.#facebook.getPage();
				await page.goto(url);
				const source = await page.content();
				await page.close();
				return this.getVideoInfoFromHTML(source);
			}
			case "intercept": {
				return await this.getVideoInfoByIntercept(url);
			}
			default:
				throw new Error("Invalid method.");
		}
	}
	getVideoInfoFromHTML(source: string) {
		const dom = new JSDOM(source);
		const video: {
			unified: {
				browser_native_sd_url: string | null;
				browser_native_hd_url: string | null;
			};
			muted: RemoteVideo[];
			audio: string | null;
			thumbnail: string | null;
		} = {
			unified: {
				browser_native_sd_url: null,
				browser_native_hd_url: null,
			},
			muted: [],
			audio: null,
			thumbnail: null,
		};
		// const document = page.mainFrame.window.document;
		const document = dom.window.document;
		scriptLoop: for (const script of document.querySelectorAll("script")) {
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
				// biome-ignore lint/suspicious/noExplicitAny: Playback info by Facebook
				const playbackVideo: any = getValue(data, "playback_video");
				if (playbackVideo) {
					logger.debug("Playback video: %o", playbackVideo);
					video.unified = {
						browser_native_sd_url: playbackVideo.browser_native_sd_url,
						browser_native_hd_url: playbackVideo.browser_native_hd_url,
					};
					// Parse thumbnail
					try {
						logger.debug(
							`Thumbnail: ${playbackVideo.preferred_thumbnail.image.uri}`,
						);
						video.thumbnail = playbackVideo.preferred_thumbnail.image.uri;
					} catch (e) {
						logger.warn(`Failed to parse thumbnail: ${e}`);
					}
				}
				// Parse segmented video (video without audio, audio)
				// biome-ignore lint/suspicious/noExplicitAny: Complex object here
				const videoDashes: any = getValue(
					data,
					"all_video_dash_prefetch_representations",
				);
				if (videoDashes) {
					// Used for debugging only :skull:
					if (logger.level === "debug") {
						fs.writeFileSync(`debug/${length}_2.json`, script.innerHTML);
					}
					for (const [i, videoDash] of videoDashes.entries()) {
						logger.debug("Video dash: %o", videoDash);
						for (const representation of videoDash.representations) {
							logger.debug("Representation: %o", representation);
							if (representation.mime_type.includes("video")) {
								const vid = new RemoteVideo(
									representation.base_url,
									representation.width,
									representation.height,
									representation.bandwidth,
									false,
									null,
								);
								video.muted.push(vid);
							} else {
								logger.debug(
									"Found audio, breaking (URL: %s)",
									representation.base_url,
								);
								video.audio = representation.base_url;
								break scriptLoop;
							}
						}
					}
					break;
				}
			} catch (e) {
				logger.debug("Failed to parse script innerHTML: %s", e);
			}
		}
		// Deduplicate
		const newMutedVideos: RemoteVideo[] = [];
		for (const vid of video.muted) {
			if (!findValue(newMutedVideos, vid.url)) {
				newMutedVideos.push(vid);
			}
		}
		video.muted = newMutedVideos;
		return { video };
	}
}

export default FacebookVideo;
