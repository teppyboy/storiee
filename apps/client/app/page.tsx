import { api } from 'libs';
import StoryDownloadForm from './form';
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
import { ChangeEvent, useId } from 'react';

const ServerComponent = (searchParams) => { 
	const something = searchParams.something
	console.log(something) //You get your user data here
	return (
		<div />
	)
}

export default async function Home() {
	return (
		<main className="flex flex-col items-center justify-between p-8">
			<br />
			<div>
				<ServerComponent />
				<StoryDownloadForm />
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
