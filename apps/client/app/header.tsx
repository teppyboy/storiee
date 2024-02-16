import { Button } from "@/components/ui/button";

export default function Header() {
	return (
		<header className="sticky top-0 z-50 p-4 flex flex-row bg-slate-100">
			<h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-4xl mr-4">
				Storiee
			</h1>
			<div className="w-full flex justify-end">
				<Button variant="link" className="text-1.5xl">
					Pricing
				</Button>
				<Button variant="link" className="text-1.5xl">
					Products
				</Button>
			</div>
		</header>
	);
}
