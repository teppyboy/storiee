"use client";
import { StoryResult } from "@/components/storiee/story-result";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import fetcher from "@/components/storiee/fetcher";
import useSWR from "swr";

type StoryDownloadResultProps = {
	storyUrl: string;
	method: string;
	removeResult: () => void;
};

export default function StoryDownloadResult({
	storyUrl,
	method,
	removeResult,
}: StoryDownloadResultProps) {
	// Smartest way to handle the download :nerd:
	console.log("Downloading story", storyUrl, method);
	const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080";
	const { data, error, isLoading } = useSWR(
		`${apiUrl}/api/v1/facebook/story/url/${encodeURIComponent(
			storyUrl,
		)}?method=${method}`,
		fetcher,
		{
			revalidateOnFocus: false,
			revalidateOnMount: true,
			revalidateOnReconnect: false,
			refreshWhenOffline: false,
			refreshWhenHidden: false,
			refreshInterval: 0,
		},
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
			<Card className="w mt-4">
				<CardHeader>
					<div className="flex flex-row">
						<CardTitle>Result</CardTitle>
						{removeResultButton}
					</div>
				</CardHeader>
				<CardContent>
					An error occurred while downloading the video information:
					<br />
					<pre>
						<code>{error.message}</code>
					</pre>
					<br />
					Error code: <code>{error.code}</code> | <code>{error.error}</code>
				</CardContent>
			</Card>
		);
	}
	if (isLoading) {
		return (
			<Card className="w mt-4">
				<CardHeader>
					<CardTitle>Downloading...</CardTitle>
				</CardHeader>
				<CardContent className="text-opacity-80">
					The process will take a few seconds, please wait.
					<br />
					If you are using "Intercept" method then it'll take a bit longer.
				</CardContent>
			</Card>
		);
	}
	return (
		<StoryResult
			data={data}
			storyUrl={storyUrl}
			removeResultButton={removeResultButton}
		/>
	);
}
