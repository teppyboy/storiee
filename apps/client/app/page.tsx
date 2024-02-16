"use client";
import { useToast } from "@/components/ui/use-toast";
import { useRef, useState } from "react";
import StoryDownloadForm from "./client/form";
import FAQ from "./faq";
import StoryDownloadResult from "./client/result";

export default function Home() {
	const [results, setResults] = useState([]);
	const resultsRef = useRef([]);
	resultsRef.current = results;
	// UI
	const { toast } = useToast();
	const mapping = {};
	function removeResult(index: number) {
		const resultsCopy = resultsRef.current.slice();
		console.log(resultsCopy);
		console.log(index);
		for (let i = index; i < results.length - 1; i++) {
			console.log("Moving", i + 1, "to", i);
			resultsCopy[i] = results[i + 1];
		}
		resultsCopy.pop();
		setResults(resultsCopy);
		resultsRef.current = results;
	}
	function handleDownload(storyUrl: string, downloadMethod: string) {
		const key = Math.random().toString(36);
		console.log("Downloading story", storyUrl, downloadMethod);
		// const key = `${storyUrl}-${downloadMethod}`;
		const result = (
			<StoryDownloadResult key={key} storyUrl={storyUrl} method={downloadMethod} removeResult={() => removeResult(results.length)} />
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
