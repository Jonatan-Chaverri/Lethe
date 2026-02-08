const TWO_POW_128 = 0x100000000000000000000000000000000n;

export interface FormattedNumber {
	high: string;
	low: string;
}

export function format_number(n: bigint): FormattedNumber {
	return {
		high: (n / TWO_POW_128).toString(),
		low: (n % TWO_POW_128).toString(),
	};
}

export function wbtcToWei(amount: number): bigint {
	return BigInt(Math.floor(amount * 100_000_000));
}

export function weiToWbtc(amount: bigint): number {
	return Number(amount) / 100_000_000;
}

/** Converts an array of decimal number strings to a comma-separated string of hex felts (0x-prefixed). */
export function arrayToFeltHex(array: string[]): string[] {
	const feltHexArray = array.map((decimalStr) => {
		const cleaned = decimalStr.replace(/[\r\n]/g, "");
		return `0x${BigInt(cleaned).toString(16)}`;
	});
	const notFeltHexArray = feltHexArray.filter((felt) => felt.length > 65);
	if (notFeltHexArray.length > 0) {
		throw new Error(`Invalid felt hex array: ${notFeltHexArray.join(", ")}`);
	}
	return feltHexArray;
}

export function normalizeAddress(addr: string): string {
	const normalized = addr.toLowerCase().replace(/^0x/, '').replace(/^0+/, '');
	return normalized || '0';
};

export function isSameAddress(addr1: string, addr2: string): boolean {
	return normalizeAddress(addr1) === normalizeAddress(addr2);
};