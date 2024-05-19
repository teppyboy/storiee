"use client";
import { StoryResult } from "@/components/storiee/story-result";
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
	// biome-ignore lint/suspicious/noExplicitAny: it's just a fetch so any is fine
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
			<Card className="w mt-4">
				<CardHeader>
					<div className="flex flex-row">
						<CardTitle>Result</CardTitle>
						{removeResultButton}
					</div>
				</CardHeader>
				<CardContent>Failed to download story information.</CardContent>
			</Card>
		);
	}
	if (isLoading) {
		return (
			<Card className="w mt-4">
				<CardHeader>
					<CardTitle>Parsing...</CardTitle>
				</CardHeader>
				<CardContent className="text-opacity-80">
					The process will take a few seconds, please wait.
				</CardContent>
			</Card>
		);
	}
	return (
		<StoryResult
			data={data}
			storyUrl={undefined}
			removeResultButton={removeResultButton}
		/>
	);
}
