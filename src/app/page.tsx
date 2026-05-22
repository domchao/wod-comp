import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LoginForm } from "./_components/LoginForm";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { next } = await searchParams;
    const nextPath = typeof next === "string" && next.startsWith("/") ? next : "/dashboard";
    redirect(nextPath);
  }

  const { next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") ? next : undefined;

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <LoginForm next={nextPath} />
    </main>
  );
}
