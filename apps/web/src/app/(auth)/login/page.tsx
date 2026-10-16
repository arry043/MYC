"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";

import { formatAuthError, isValidEmail, sanitizeRedirectUrl } from "@myc/utils";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldError, Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = sanitizeRedirectUrl(searchParams.get("next"), "/dashboard");
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(
    urlError ? formatAuthError(urlError) : null,
  );
  const [emailError, setEmailError] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setEmailError(null);
    setUnconfirmedEmail(null);

    if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setFormError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (
          error.message.toLowerCase().includes("email not confirmed") ||
          error.code === "email_not_confirmed"
        ) {
          setUnconfirmedEmail(email);
          setFormError("Please verify your email address before signing in.");
        } else {
          setFormError(formatAuthError(error));
        }
        setLoading(false);
        return;
      }

      // If user signed in but email is somehow not confirmed, redirect to verify-email
      if (data.user && !data.user.email_confirmed_at) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        router.refresh();
        return;
      }

      router.push(next);
      router.refresh();
    } catch (err) {
      setFormError(formatAuthError(err));
      setLoading(false);
    }
  };

  return (
    <Card className="gap-6 shadow-floating">
      <CardHeader className="flex-col items-center gap-1.5 text-center">
        <CardTitle className="type-h2">Welcome back</CardTitle>
        <CardDescription>Sign in to continue your consistency journey.</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-5">
        {formError && (
          <Alert tone="destructive">
            <AlertTitle>Sign in failed</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{formError}</p>
              {unconfirmedEmail && (
                <Link
                  href={`/verify-email?email=${encodeURIComponent(unconfirmedEmail)}`}
                  className="inline-block font-semibold text-primary underline underline-offset-4"
                >
                  Go to email verification &rarr;
                </Link>
              )}
            </AlertDescription>
          </Alert>
        )}

        <GoogleSignInButton next={next} />

        <div className="relative flex items-center justify-center">
          <Separator />
          <span className="absolute bg-card px-3 text-xs tracking-wider text-muted-foreground/80 uppercase">
            or with email
          </span>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <Field>
            <Label htmlFor="login-email">Email address</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              aria-invalid={Boolean(emailError)}
            />
            {emailError && <FieldError>{emailError}</FieldError>}
          </Field>

          <Field>
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">Password</Label>
              <Link
                href="/forgot-password"
                className="type-small text-muted-foreground transition-colors hover:text-foreground"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </Field>

          <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
            Sign in
          </Button>
        </form>

        <p className="text-center type-small text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href={
              next && next !== "/dashboard" ? `/signup?next=${encodeURIComponent(next)}` : "/signup"
            }
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card className="gap-6 shadow-floating">
          <CardHeader className="flex-col items-center gap-1.5 text-center">
            <CardTitle className="type-h2">Welcome back</CardTitle>
            <CardDescription>Loading sign in...</CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
