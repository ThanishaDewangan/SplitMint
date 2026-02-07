"use client";

type Step = {
  fromName: string;
  toName: string;
  amount: number;
};

export function SettlementSuggestions({ settlements }: { settlements: Step[] }) {
  if (settlements.length === 0) return null;

  return (
    <div className="mt-3 card border-mint-300 bg-mint-50/30">
      <h3 className="mb-2 text-sm font-semibold text-mint-800">
        Suggested settlements (minimal steps)
      </h3>
      <ul className="space-y-1 text-sm">
        {settlements.map((s, i) => (
          <li key={i} className="text-gray-700">
            <span className="font-medium text-red-600">{s.fromName}</span>
            {" → "}
            <span className="font-medium text-green-600">{s.toName}</span>
            {" "}
            <span className="font-medium">${s.amount.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
