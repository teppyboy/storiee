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

function findValue(input: object, value: string): boolean {
	if (Array.isArray(input)) {
		for (const x of input) {
			if (typeof x === "object" && x != null) {
				const result = findValue(x, value);
				if (result) {
					return result;
				}
			} else if (typeof x === "string") {
				if (x === value) {
					return true;
				}
			}
		}
	} else {
		for (const [_, val] of Object.entries(input)) {
			if (val === value) {
				return true;
			}
			if (Array.isArray(val) || (typeof val === "object" && val != null)) {
				const result = findValue(val, value);
				if (result) {
					return result;
				}
			}
		}
	}
	return false;
}

export { sleep, getValue, findValue };
