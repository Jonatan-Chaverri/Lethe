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
