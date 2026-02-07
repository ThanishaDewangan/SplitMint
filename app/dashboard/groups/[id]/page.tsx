import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  computeNetBalances,
  computeDirectionalOwed,
  suggestSettlements,
} from "@/lib/balance-engine";
import { GroupActions } from "./GroupActions";
import { ParticipantList } from "./ParticipantList";
import { SummaryCards } from "./SummaryCards";
import { BalanceTable } from "./BalanceTable";
import { SettlementSuggestions } from "./SettlementSuggestions";
import { ExpenseHistory } from "./ExpenseHistory";
import { MintSensePanel } from "./MintSensePanel";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const { id } = await params;

  const group = await prisma.group.findFirst({
    where: { id, primaryUserId: session.user.id },
    include: {
      participants: true,
      expenses: {
        include: { payer: true, shares: { include: { participant: true } } },
        orderBy: { date: "desc" },
      },
    },
  });
  if (!group) notFound();

  const participantList = group.participants.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
  }));
  const expenseData = group.expenses.map((e) => ({
    payerId: e.payerId,
    amount: e.amount,
    shares: e.shares.map((s) => ({ participantId: s.participantId, amount: s.amount })),
  }));
  const balances = computeNetBalances(participantList, expenseData);
  const directional = computeDirectionalOwed(participantList, balances);
  const settlements = suggestSettlements(
    participantList,
    balances.map((b) => ({ ...b }))
  );

  const primaryParticipant = group.participants.find((p) => p.userId === session.user.id);
  const myBalance = primaryParticipant
    ? balances.find((b) => b.participantId === primaryParticipant.id)?.netBalance ?? 0
    : 0;
  const totalSpent = group.expenses.reduce((s, e) => s + e.amount, 0);
  const owedToMe = balances
    .filter((b) => b.participantId !== primaryParticipant?.id && b.netBalance > 0)
    .reduce((s, b) => s + b.netBalance, 0);
  const iOwe = myBalance < 0 ? -myBalance : 0;
  const owedToUser = myBalance > 0 ? myBalance : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-mint-800">{group.name}</h1>
          <p className="text-sm text-gray-500">Group dashboard</p>
        </div>
        <GroupActions groupId={id} groupName={group.name} />
      </div>

      <SummaryCards
        totalSpent={totalSpent}
        owedToUser={owedToUser}
        userOwes={iOwe}
      />

      <section>
        <h2 className="mb-3 text-lg font-semibold text-mint-800">Participants</h2>
        <ParticipantList
          groupId={id}
          participants={group.participants}
          primaryUserId={session.user.id}
          canAdd={group.participants.length < 4}
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-mint-800">Balances</h2>
        <BalanceTable directional={directional} participants={group.participants} />
        <SettlementSuggestions settlements={settlements} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-mint-800">MintSense (AI)</h2>
        <MintSensePanel
          groupId={id}
          groupName={group.name}
          participantNames={group.participants.map((p) => p.name)}
          settlements={settlements}
          expenses={group.expenses.map((e) => ({
            description: e.description,
            amount: e.amount,
            date: e.date.toISOString(),
            payerName: e.payer.name,
            shares: e.shares.map((s) => ({ name: s.participant.name, amount: s.amount })),
          }))}
        />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-mint-800">Recent expenses</h2>
          <Link
            href={`/dashboard/groups/${id}/expenses/new`}
            className="btn-primary text-sm"
          >
            Add expense
          </Link>
        </div>
        <ExpenseHistory
          groupId={id}
          expenses={group.expenses.slice(0, 10)}
          participants={group.participants}
          currentUserParticipantId={primaryParticipant?.id ?? null}
        />
        <Link
          href={`/dashboard/groups/${id}/expenses`}
          className="mt-2 inline-block text-sm text-mint-600 hover:underline"
        >
          View all & filter →
        </Link>
      </section>
    </div>
  );
}
