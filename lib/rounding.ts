/**
 * Consistent rounding for uneven splits.
 * Total of shares must equal expense amount; remainder goes to payer (first in list) or largest share.
 */
export function roundShares(
  totalAmount: number,
  rawShares: number[],
  payerIndex: number
): number[] {
  const sum = rawShares.reduce((a, b) => a + b, 0);
  if (sum === 0) return rawShares.map(() => 0);

  const scale = totalAmount / sum;
  const scaled = rawShares.map((s) => Math.round(s * scale * 100) / 100);
  let current = scaled.reduce((a, b) => a + b, 0);
  const diff = Math.round((totalAmount - current) * 100) / 100;

  if (diff === 0) return scaled;
  const out = [...scaled];
  out[payerIndex] = Math.round((out[payerIndex] + diff) * 100) / 100;
  return out;
}

export function roundToTwo(n: number): number {
  return Math.round(n * 100) / 100;
}
