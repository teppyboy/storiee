"use client";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useSWR from "swr";

export default function StoryDownloadResult({ storyHtml, removeResult }) {
	// Smartest way to handle the download :nerd:
	console.log("Parsing story HTML...");
	const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080";
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const fetcher = (...args: any[]) =>
		fetch(...args, {
			method: "POST",
			body: btoa(storyHtml),
		}).then((r) => r.json());
	const { data, error, isLoading } = useSWR(
		`${apiUrl}/api/v1/facebook/story/html`,
		fetcher,
	);
	function handleRemoveResult() {
		removeResult();
	}
	const removeResultButton = (
		<div
			className="w-full flex justify-end m-0 p-0"
			id={Math.random().toString(36)}
		>
			<Button
				variant="outline"
				className="text-1.5xl"
				onClick={handleRemoveResult}
			>
				X
			</Button>
		</div>
	);
	if (error) {
		return (
			<div>
				<Card className="w mt-4">
					<CardHeader>
						<div className="flex flex-row">
							<CardTitle>Result</CardTitle>
							{removeResultButton}
						</div>
					</CardHeader>
					<CardContent>Failed to download story information.</CardContent>
				</Card>
			</div>
		);
	}
	if (isLoading) {
		return (
			<div>
				<Card className="w mt-4">
					<CardHeader>
						<CardTitle>Downloading story information...</CardTitle>
					</CardHeader>
					<CardContent className="text-opacity-80">
						The process will take a few seconds, please wait.
						<br />
						<br />
						If you are using "Intercept" method then it'll take a bit longer.
					</CardContent>
				</Card>
			</div>
		);
	}
	// Data parsing time
	if (data.error) {
		return (
			<div>
				<Card className="w mt-4">
					<CardHeader>
						<div className="flex flex-row">
							<CardTitle>Result</CardTitle>
							{removeResultButton}
						</div>
					</CardHeader>
					<CardContent>
						An error occurred while downloading the story information:{" "}
						<code>{data.message}</code>
						<br />
						Error code: <code>{data.error}</code>
					</CardContent>
				</Card>
			</div>
		);
	}
	const storyData = data.data;
	if (storyData.stories.length === 0) {
		return (
			<div>
				<Card className="w mt-4">
					<CardHeader>
						<div className="flex flex-row">
							<CardTitle>Result</CardTitle>
							{removeResultButton}
						</div>
					</CardHeader>
					<CardContent>
						Successfully fetch story information, but there isn't any video
						stories in the URL you provided.
					</CardContent>
				</Card>
			</div>
		);
	}
	const tabsTriggers = [];
	const tabsContents = [];
	for (const [i, story] of storyData.stories.entries()) {
		const videoButtons = [];
		const audios = [];
		if (story.audio) {
			audios.push(
				<Button onClick={() => window.open(story.audio, "_blank")}>
					Audio only
				</Button>,
			);
		}
		for (const video of story.videos.muted) {
			videoButtons.push(
				<Button
					className="mr-2 mb-2"
					onClick={() => window.open(video.url, "_blank")}
				>
					{video.height}x{video.width}
				</Button>,
			);
		}
		tabsTriggers.push(
			<TabsTrigger value={i.toString()}>Story {i + 1}</TabsTrigger>,
		);
		if (story.videos.length === 0) {
			tabsContents.push(
				<TabsContent value={i.toString()}>
					<div>The story is probably not a video story.</div>
				</TabsContent>,
			);
		} else {
			if (story.videos.unified.browser_native_hd_url) {
				tabsContents.push(
					<TabsContent value={i.toString()}>
						<div className="my-2">
							<h4 className="mb-2">Videos with audio</h4>
							<Button
								className="mr-2"
								onClick={() =>
									window.open(
										story.videos.unified.browser_native_sd_url,
										"_blank",
									)
								}
							>
								SD
							</Button>
							<Button
								onClick={() =>
									window.open(
										story.videos.unified.browser_native_hd_url,
										"_blank",
									)
								}
							>
								HD
							</Button>
						</div>
						<div>
							<h4 className="mb-2">Videos WITHOUT audio</h4>
							{videoButtons}
							{audios}
						</div>
					</TabsContent>,
				);
			}
		}
	}
	// Render story information
	return (
		<Card className="w mt-4">
			<CardHeader>
				<div className="flex flex-row">
					<CardTitle>Result</CardTitle>
					{removeResultButton}
				</div>
				<CardDescription className="text-wrap">
					Successfully fetch story information, click the story you want to
					download.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue="account" className="w">
					<TabsList>{tabsTriggers}</TabsList>
					{tabsContents}
				</Tabs>
			</CardContent>
			<CardFooter>
				Like this project? Consider supporting me on Patreon or Ko-fi!
			</CardFooter>
		</Card>
	);
}
