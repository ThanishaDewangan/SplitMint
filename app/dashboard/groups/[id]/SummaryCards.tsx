"use client";

export function SummaryCards({
  totalSpent,
  owedToUser,
  userOwes,
}: {
  totalSpent: number;
  owedToUser: number;
  userOwes: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="card border-mint-200 bg-mint-50/50">
        <p className="text-sm font-medium text-gray-500">Total spent (group)</p>
        <p className="text-2xl font-bold text-mint-800">
          ${totalSpent.toFixed(2)}
        </p>
      </div>
      <div className="card border-green-200 bg-green-50/50">
        <p className="text-sm font-medium text-gray-500">Owed to you</p>
        <p className="text-2xl font-bold text-green-700">
          ${owedToUser.toFixed(2)}
        </p>
      </div>
      <div className="card border-red-200 bg-red-50/50">
        <p className="text-sm font-medium text-gray-500">You owe</p>
        <p className="text-2xl font-bold text-red-700">
          ${userOwes.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
