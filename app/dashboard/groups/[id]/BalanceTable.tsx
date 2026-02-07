"use client";

type Directional = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
};

type Participant = {
  id: string;
  name: string;
  color: string | null;
};

export function BalanceTable({
  directional,
  participants,
}: {
  directional: Directional[];
  participants: Participant[];
}) {
  if (directional.length === 0) {
    return (
      <div className="card text-center text-gray-500">
        No balances to show. Add expenses to see who owes whom.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-mint-200 bg-mint-50/50">
            <th className="px-3 py-2 text-left font-medium text-gray-700">From</th>
            <th className="px-3 py-2 text-left font-medium text-gray-700">To</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Amount</th>
          </tr>
        </thead>
        <tbody>
          {directional.map((row) => (
            <tr key={`${row.fromId}-${row.toId}-${row.amount}`} className="border-b border-mint-100">
              <td className="px-3 py-2">
                <span className="font-medium text-red-700">{row.fromName}</span>
              </td>
              <td className="px-3 py-2">
                <span className="font-medium text-green-700">{row.toName}</span>
              </td>
              <td className="px-3 py-2 text-right font-medium">
                ${row.amount.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
