import { Button } from "@/components/ui/button";

export default function Header() {
	return (
		<header className="sticky top-0 z-50 p-4 flex flex-row bg-slate-100">
			<a
				href="/"
				className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-4xl mr-4"
			>
				Storiee
			</a>
			<div className="w-full flex justify-end">
				<Button variant="link" className="text-1.5xl">
					Reels
				</Button>
				<Button variant="link" className="text-1.5xl">
					Video
				</Button>
				<Button variant="link" className="text-1.5xl">
					Story
				</Button>
			</div>
		</header>
	);
}
