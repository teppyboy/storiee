class RemoteVideo {
	url: string;
	width: number;
	height: number;
	constructor(url: string, width: number, height: number) {
		this.url = url;
		this.width = width;
		this.height = height;
	}
}

export { RemoteVideo };
