import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-mint-50">
      <header className="border-b border-mint-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/dashboard" className="text-xl font-bold text-mint-800">
            SplitMint
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-mint-700">
              Dashboard
            </Link>
            <span className="text-sm text-gray-500">{session.user?.email}</span>
            <Link
              href="/api/auth/signout"
              className="text-sm text-gray-500 hover:text-red-600"
            >
              Log out
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
