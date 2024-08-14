"use client";
import { useToast } from "@/components/ui/use-toast";
import { useRef, useState } from "react";
import { z } from "zod";
import VideoDownloadForm from "./form";
import FAQ from "../story/faq";
import VideoDownloadResult from "./result";

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
		videoUrl: string,
		downloadMethod: string,
		acceptTos: boolean,
	) {
		const urlParseResult = zUrl.safeParse(videoUrl);
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
				description: "You must accept the terms of service to download videos.",
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
		console.log("Downloading story", videoUrl, downloadMethod);
		const result = (
			<VideoDownloadResult
				key={key}
				videoUrl={videoUrl}
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
				<VideoDownloadForm onDownloadClicked={handleDownload} />
			</div>
			{results}
			<FAQ />
		</main>
	);
}
