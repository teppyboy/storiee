import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";

export default function Home() {
	return (
		<main className="flex flex-col items-center justify-between p-8">
			<br></br>
			<div>
				<Card className="w">
					<CardHeader>
						<CardTitle>Story Downloader</CardTitle>
						<CardDescription>
							Easily download any public Facebook stories.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form>
							<div className="grid w-full items-center gap-4">
								<div className="flex flex-col space-y-1.5">
									<Label htmlFor="url">Story URL</Label>
									<Input
										id="name"
										placeholder="URL of the story you want to download"
									/>
								</div>
								<div className="flex flex-col space-y-1.5">
									<Label htmlFor="method">Method</Label>
									<Select>
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
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button variant="link">Which one should I use?</Button>
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
								<div className="flex items-center space-x-2">
									<Checkbox id="terms" />
									<Label htmlFor="terms">Accept terms and conditions</Label>
								</div>
							</div>
						</form>
					</CardContent>
					<CardFooter className="flex justify-right">
						<Button>Download</Button>
					</CardFooter>
				</Card>
			</div>
			<div className="my-4">
				<h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-4xl">
					FAQ
				</h1>
			</div>
			<div className="flex">
				<Accordion type="single" collapsible>
					<AccordionItem value="item-1">
						<AccordionTrigger>Is it safe?</AccordionTrigger>
						<AccordionContent>
							Yes, this project is open source and you can check the code on
							GitHub.
						</AccordionContent>
					</AccordionItem>
					<AccordionItem value="item-2">
						<AccordionTrigger>How much data do we collect?</AccordionTrigger>
						<AccordionContent>
							For now, nothing. We don't store any data from you.
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>
		</main>
	);
}
