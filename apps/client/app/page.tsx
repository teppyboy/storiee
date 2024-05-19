"use client";
import { useToast } from "@/components/ui/use-toast";
import { useRef, useState } from "react";
import { set, z } from "zod";
import StoryDownloadForm from "./facebook/story/form";
import FAQ from "./facebook/story/faq";
import StoryDownloadResult from "./facebook/story/result";

export default function Home() {
	const zUrl = z.string().url();
	const [results, setResults] = useState([]);
	const resultsRef = useRef([]);
	resultsRef.current = results;
	// UI
	const { toast } = useToast();
	// Shut up TS.
	const [trackResults, setTrackResults] = useState({});
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const trackResultsRef = useRef({} as any);
	trackResultsRef.current = trackResults;
	function removeResult(key: string) {
		const resultsCopy = resultsRef.current.slice();
		const curTrackResults = trackResultsRef.current;
		const index = curTrackResults[key];
		console.log(`Index of ${key} is ${index}`);
		console.log(`Current track results: ${curTrackResults}`);
		console.log(`Current results: ${resultsCopy}`);
		for (let i = 0; i < resultsCopy.length; i++) {
			console.log(`Index: ${i}`);
			if (index === resultsCopy.length - 1 - i) {
				resultsCopy.splice(i, 1);
			}
			console.log(curTrackResults);
		}
		for (const [idx, trkRslt] of Object.entries(curTrackResults)) {
			const trackResult = trkRslt as number;
			console.log(`Index: ${idx}, trackResult: ${trackResult}`);
			if (trackResult > index) {
				curTrackResults[idx] = trackResult - 1;
			}
		}
		setResults(resultsCopy);
	}
	function handleDownload(
		storyUrl: string,
		downloadMethod: string,
		acceptTos: boolean,
	) {
		const urlParseResult = zUrl.safeParse(storyUrl);
		if (urlParseResult.success === false) {
			toast({
				title: "Invalid URL",
				description: "The URL you entered is not valid.",
				duration: 5000,
				variant: "destructive",
			});
			return;
		}
		if (acceptTos === false) {
			toast({
				title: "Terms of Service",
				description:
					"You must accept the terms of service to download stories.",
				duration: 5000,
				variant: "destructive",
			});
			return;
		}
		const key = Math.random().toString(36);
		console.log(`Unique key: ${key}`);
		const curTrackResults = structuredClone(trackResultsRef.current);
		curTrackResults[key] = results.length;
		setTrackResults(curTrackResults);
		console.log("Current track results: %o", curTrackResults);
		console.log("Downloading story", storyUrl, downloadMethod);
		const result = (
			<StoryDownloadResult
				key={key}
				storyUrl={storyUrl}
				method={downloadMethod}
				removeResult={() => removeResult(key)}
			/>
		);
		const resultsCopy = results.slice();
		// Suppress the warning about the never type
		resultsCopy.unshift(result as unknown as never);
		console.log(resultsCopy);
		setResults(resultsCopy);
	}
	return (
		<main className="flex flex-col items-center justify-between p-8">
			<br />
			<div>
				<StoryDownloadForm onDownloadClicked={handleDownload} />
			</div>
			{results}
			<FAQ />
		</main>
	);
}
