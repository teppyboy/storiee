"use client";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import React, { ChangeEvent, useState } from "react";
import { CheckedState } from "@radix-ui/react-checkbox";

export default function StoryDownloadForm({ onDownloadClicked }) {
	const [storyUrl, setStoryUrl] = useState("");
	const [downloadMethod, setDownloadMethod] = useState("html");
	const [acceptToS, setAcceptToS] = useState(false);
	function handleDownload() {
		console.log("Download button clicked");
		onDownloadClicked(storyUrl, downloadMethod, acceptToS);
	}
	function handleDownloadMethodChange(option: string) {
		console.log(option);
		setDownloadMethod(option);
	}
	function handleStoryUrlChange(e: ChangeEvent<HTMLInputElement>) {
		setStoryUrl(e.target.value);
		console.log(e.target.value);
	}
	function handleAcceptToSChange(checked: CheckedState) {
		console.log(checked.valueOf() as boolean);
		setAcceptToS(checked.valueOf() as boolean);
	}
	return (
		<Card className="w">
			<CardHeader>
				<CardTitle>Story Downloader</CardTitle>
				<CardDescription>
					Easily download any public Facebook stories.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
					}}
				>
					<div className="grid w-full items-center gap-4">
						<div className="flex flex-col space-y-1.5">
							<Label htmlFor="url">Story URL</Label>
							<Input
								id="story-url"
								placeholder="URL of the story you want to download"
								onChange={(e) => handleStoryUrlChange(e)}
							/>
						</div>
						<div className="flex flex-col space-y-1.5">
							<div>
								<Label htmlFor="method">Method</Label>
								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Button className="m-0 p-0 pl-1 opacity-75" variant="link">
											(Which one should I use?)
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogDescription>
												By default HTML is the recommended method, but if you
												are having problems with it, you can try the Intercept
												method.
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogAction>OK</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</div>
							<Select onValueChange={handleDownloadMethodChange}>
								<SelectTrigger id="method">
									<SelectValue defaultValue="html" placeholder="Select" />
								</SelectTrigger>
								<SelectContent position="popper">
									<SelectItem value="html">HTML</SelectItem>
									<SelectItem value="intercept">Intercept</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<div className="grid gap-1.5 leading-none">
								<div className="flex items-center space-x-2">
									<Checkbox
										onCheckedChange={handleAcceptToSChange}
										id="terms"
									/>
									<Label
										className="peer-disabled:cursor-not-allowed"
										htmlFor="terms"
									>
										Accept terms and conditions
									</Label>
								</div>
								<p className="text-sm text-muted-foreground">
									You agree to our Terms of Service and Privacy Policy.
								</p>
							</div>
						</div>
					</div>
				</form>
			</CardContent>
			<CardFooter className="flex justify-right">
				<Button onClick={handleDownload}>Download</Button>
			</CardFooter>
		</Card>
	);
}
