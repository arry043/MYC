"use client";

import { MailIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { formatAuthError } from "@myc/utils";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");

  const [email, setEmail] = useState<string | null>(emailParam);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If email was not passed in query param, check if user session has it
  useEffect(() => {
    if (!email) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.email) {
          setEmail(user.email);
        }
      });
    }
  }, [email]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email) {
      setError("No email address found. Please try signing in again.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const origin = window.location.origin;
      const callbackUrl = new URL("/auth/callback", origin);
      callbackUrl.searchParams.set("next", "/dashboard");

      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: callbackUrl.toString(),
        },
      });

      if (resendError) {
        setError(formatAuthError(resendError));
        setLoading(false);
        return;
      }

      setResendSuccess(true);
      setCooldown(60);
      setLoading(false);
      toast({
        title: "Verification email sent",
        description: `We've sent a new verification link to ${email}.`,
        tone: "success",
      });
    } catch (err) {
      setError(formatAuthError(err));
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "local" });
    router.push("/login");
    router.refresh();
  };

  return (
    <Card className="gap-6 shadow-floating">
      <CardHeader className="flex-col items-center gap-3 text-center">
        <div className="grid size-12 place-content-center rounded-2xl bg-primary-soft text-primary-soft-foreground shadow-sm">
          <MailIcon className="size-6" />
        </div>
        <div className="grid gap-1">
          <CardTitle className="type-h2">Verify your email</CardTitle>
          <CardDescription>
            {email ? (
              <>
                We sent a confirmation link to{" "}
                <span className="font-semibold text-foreground">{email}</span>.
              </>
            ) : (
              "Please check your inbox to confirm your email address."
            )}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="grid gap-5">
        {error && (
          <Alert tone="destructive">
            <AlertTitle>Could not resend email</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {resendSuccess && (
          <Alert tone="success">
            <AlertTitle>Link sent</AlertTitle>
            <AlertDescription>
              A new verification link has been sent. Please check your inbox and spam folder.
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-xl border border-border/80 bg-secondary/50 p-4 text-center type-small text-muted-foreground">
          Click the link in the email to activate your account and start your MYC consistency
          journey.
        </div>

        <div className="grid gap-2.5">
          <Button
            variant="default"
            size="lg"
            className="w-full"
            loading={loading}
            disabled={cooldown > 0}
            onClick={handleResend}
          >
            {cooldown > 0 ? `Resend email in ${cooldown}s` : "Resend verification email"}
          </Button>

          <Button variant="ghost" size="default" className="w-full" onClick={handleSignOut}>
            Use a different account
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <Card className="gap-6 shadow-floating">
          <CardHeader className="flex-col items-center gap-1.5 text-center">
            <CardTitle className="type-h2">Verify your email</CardTitle>
            <CardDescription>Loading verification status...</CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
