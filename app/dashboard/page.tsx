import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const groups = await prisma.group.findMany({
    where: { primaryUserId: session.user.id },
    include: {
      participants: true,
      expenses: { include: { shares: true, payer: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-mint-800">Your groups</h1>
        <Link href="/dashboard/groups/new" className="btn-primary">
          New group
        </Link>
      </div>
      {groups.length === 0 ? (
        <div className="card text-center text-gray-500">
          <p>No groups yet. Create one to start splitting expenses.</p>
          <Link href="/dashboard/groups/new" className="mt-2 inline-block text-mint-600 hover:underline">
            Create group
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => {
            const totalSpent = g.expenses.reduce((s, e) => s + e.amount, 0);
            return (
              <Link
                key={g.id}
                href={`/dashboard/groups/${g.id}`}
                className="card block hover:border-mint-400"
              >
                <h2 className="font-semibold text-mint-800">{g.name}</h2>
                <p className="text-sm text-gray-500">
                  {g.participants.length} participant{g.participants.length !== 1 ? "s" : ""}
                </p>
                <p className="mt-2 text-sm font-medium text-gray-700">
                  Total spent: ${totalSpent.toFixed(2)}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
