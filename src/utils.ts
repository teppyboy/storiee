const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function getValue(input: object, key: string): unknown {
	if (Array.isArray(input)) {
		for (const x of input) {
			if (typeof x === "object" && x != null) {
				const result = getValue(x, key);
				if (result != null) {
					return result;
				}
			}
		}
	} else {
		for (const [currentKey, value] of Object.entries(input)) {
			if (currentKey === key) {
				return value;
			}
			if (
				Array.isArray(value) ||
				(typeof value === "object" && value != null)
			) {
				const result = getValue(value, key);
				if (result != null) {
					return result;
				}
			}
		}
	}
	return null;
}

export { sleep, getValue };
