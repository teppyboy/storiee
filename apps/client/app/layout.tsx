import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google";
import { cn } from "../lib/utils";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import Header from "./header";
import Footer from "./footer";

export const fontSans = FontSans({
	subsets: ["latin"],
	variable: "--font-sans",
});

export const metadata: Metadata = {
	title: "Storiee",
	description: "How do I frontend?",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={cn(
					"font-sans antialiased bg-background text-foreground",
					fontSans.variable,
				)}
			>
				<Header />
				{children}
				<Toaster />
				<Footer />
			</body>
		</html>
	);
}
