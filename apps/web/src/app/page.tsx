import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { resolveAuthRouteDecision } from "@myc/utils";

import { BrandMark } from "@/components/shared/brand";
import { FadeIn } from "@/components/shared/motion";
import { buttonVariants } from "@/components/ui/button";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/app";
import { createClient } from "@/lib/supabase/server";

interface HomePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function HomeLandingView() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-page py-24">
      <FadeIn className="flex max-w-md flex-col items-center gap-6 text-center">
        <BrandMark className="size-14" />
        <div className="grid gap-3">
          <h1 className="type-display">{APP_NAME}</h1>
          <p className="type-h3 font-medium text-muted-foreground">{APP_DESCRIPTION}</p>
        </div>
        <p className="type-body text-muted-foreground">
          Don&apos;t rely on motivation. Build consistency.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
            Open MYC
            <ArrowRightIcon />
          </Link>
          <Link href="/login" className={buttonVariants({ variant: "secondary", size: "lg" })}>
            Sign in
          </Link>
        </div>
      </FadeIn>
    </main>
  );
}

async function HomeAuthCheck(props: HomePageProps) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const rawSearchParams = props.searchParams ? await props.searchParams : {};
    const searchParamsRecord: Record<string, string> = {};
    for (const [key, val] of Object.entries(rawSearchParams)) {
      if (typeof val === "string") {
        searchParamsRecord[key] = val;
      }
    }

    const decision = resolveAuthRouteDecision({
      pathname: "/",
      hasUser: true,
      isEmailVerified: Boolean(user.email_confirmed_at),
      searchParams: searchParamsRecord,
    });

    if (decision.action === "redirect") {
      redirect(decision.destination);
    }
  }

  return <HomeLandingView />;
}

export default function HomePage(props: HomePageProps) {
  return (
    <Suspense fallback={<HomeLandingView />}>
      <HomeAuthCheck {...props} />
    </Suspense>
  );
}
