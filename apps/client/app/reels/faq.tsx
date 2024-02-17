import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQ() {
	return (
		<div className="my-4">
			<h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-4xl">
				FAQ
			</h1>
			<div className="flex">
				<Accordion type="single" collapsible>
					<AccordionItem value="item-4">
						<AccordionTrigger className="text-left">
							Why there isn't an "Audio only" button on the story I wanted to
							download?
						</AccordionTrigger>
						<AccordionContent>
							Because the story you wanted to download doesn't have any audio at
							all :moyai:
						</AccordionContent>
					</AccordionItem>
					<AccordionItem value="item-5">
						<AccordionTrigger className="text-left">
							Can it download stories with pictures only?
						</AccordionTrigger>
						<AccordionContent>
							Currently it doesn't but I may implement it in the future.
						</AccordionContent>
					</AccordionItem>
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
					<AccordionItem value="item-3">
						<AccordionTrigger>How do I report bugs?</AccordionTrigger>
						<AccordionContent>
							You can either create a new issue on GitHub or DM me on Discord,
							my account is <code>tretrauit</code> and I'll gladly help you when
							I'm free.
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>
		</div>
	);
}
