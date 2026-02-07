import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-b from-mint-50 to-mint-100 px-4">
      <h1 className="text-4xl font-bold text-mint-800">
        SplitMint — Your Gateway to Karbon
      </h1>
      <p className="max-w-md text-center text-gray-600">
        Split expenses with friends. Create groups, add expenses, see who owes whom, and settle up with smart suggestions.
      </p>
      <div className="flex gap-4">
        <Link href="/login" className="btn-primary">
          Log in
        </Link>
        <Link href="/register" className="btn-secondary">
          Register
        </Link>
      </div>
    </div>
  );
}
