export type ParticipantBalance = {
  participantId: string;
  name: string;
  color?: string | null;
  netBalance: number; // positive = owed to them, negative = they owe
};

export type DirectionalOwed = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
};

export type SettlementStep = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
};

/**
 * Compute net balance per participant from expenses and shares.
 * Net = (sum of what others owe this participant) - (sum of what this participant owes).
 * Equivalently: (sum of shares they paid for others) - (sum of their own shares).
 */
export function computeNetBalances(
  participantList: { id: string; name: string; color?: string | null }[],
  expenses: {
    payerId: string;
    amount: number;
    shares: { participantId: string; amount: number }[];
  }[]
): ParticipantBalance[] {
  const netByParticipant: Record<string, number> = {};
  participantList.forEach((p) => (netByParticipant[p.id] = 0));

  for (const exp of expenses) {
    const paid = exp.amount;
    for (const sh of exp.shares) {
      netByParticipant[sh.participantId] = (netByParticipant[sh.participantId] ?? 0) - sh.amount;
    }
    netByParticipant[exp.payerId] = (netByParticipant[exp.payerId] ?? 0) + paid;
  }

  return participantList.map((p) => ({
    participantId: p.id,
    name: p.name,
    color: p.color,
    netBalance: Math.round((netByParticipant[p.id] ?? 0) * 100) / 100,
  }));
}

/**
 * Who owes whom: for each (debtor, creditor) with amount > 0.
 */
export function computeDirectionalOwed(
  participantList: { id: string; name: string }[],
  balances: ParticipantBalance[]
): DirectionalOwed[] {
  const debtors = balances.filter((b) => b.netBalance < -0.001).map((b) => ({ ...b, netBalance: b.netBalance }));
  const creditors = balances.filter((b) => b.netBalance > 0.001).map((b) => ({ ...b, netBalance: b.netBalance }));
  const list: DirectionalOwed[] = [];
  let di = 0;
  let ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const d = debtors[di]!;
    const c = creditors[ci]!;
    const amount = Math.min(-d.netBalance, c.netBalance);
    if (amount > 0.001) {
      list.push({
        fromId: d.participantId,
        fromName: d.name,
        toId: c.participantId,
        toName: c.name,
        amount: Math.round(amount * 100) / 100,
      });
    }
    if (-d.netBalance <= c.netBalance) {
      di++;
      c.netBalance += d.netBalance;
      if (c.netBalance < 0.001) ci++;
    } else {
      d.netBalance += amount;
      ci++;
      if (d.netBalance > -0.001) di++;
    }
  }
  return list;
}

/**
 * Minimal settlement suggestions: greedy.
 * Repeatedly pick a debtor and a creditor, suggest one payment, reduce balances.
 */
export function suggestSettlements(
  participantList: { id: string; name: string }[],
  balances: ParticipantBalance[]
): SettlementStep[] {
  const steps: SettlementStep[] = [];
  const debtors = balances
    .filter((b) => b.netBalance < -0.001)
    .map((b) => ({ ...b, netBalance: b.netBalance }))
    .sort((a, b) => a.netBalance - b.netBalance);
  const creditors = balances
    .filter((b) => b.netBalance > 0.001)
    .map((b) => ({ ...b, netBalance: b.netBalance }))
    .sort((a, b) => b.netBalance - a.netBalance);

  let di = 0;
  let ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const d = debtors[di]!;
    const c = creditors[ci]!;
    const amount = Math.min(-d.netBalance, c.netBalance);
    if (amount < 0.001) {
      if (-d.netBalance < 0.001) di++;
      if (c.netBalance < 0.001) ci++;
      continue;
    }
    steps.push({
      fromId: d.participantId,
      fromName: d.name,
      toId: c.participantId,
      toName: c.name,
      amount: Math.round(amount * 100) / 100,
    });
    d.netBalance += amount;
    c.netBalance -= amount;
    if (d.netBalance > -0.001) di++;
    if (c.netBalance < 0.001) ci++;
  }
  return steps;
}
