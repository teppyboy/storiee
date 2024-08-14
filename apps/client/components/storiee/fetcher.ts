const fetcher = async (url: string | URL | Request) => {
	const res = await fetch(url);

	// If the status code is not in the range 200-299,
	// we still try to parse and throw it.
	if (!res.ok) {
		const jsonRsp = await res.json();
		const error = new Error(jsonRsp.message);
		// Attach extra info to the error object.
		error.message = jsonRsp.data;
		// How do I ignore these typing thingy :D
		error.error = jsonRsp.message;
		error.code = res.status;
		throw error;
	}
	return res.json();
};

export default fetcher;
