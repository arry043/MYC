"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";

import { formatAuthError, isValidEmail, sanitizeRedirectUrl, validatePassword } from "@myc/utils";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldHint, Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = sanitizeRedirectUrl(searchParams.get("next"), "/dashboard");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setEmailError(null);
    setPasswordError(null);

    if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setPasswordError(passwordValidation.message ?? "Password is invalid.");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();
      const origin = window.location.origin;
      const callbackUrl = new URL("/auth/callback", origin);
      if (next) {
        callbackUrl.searchParams.set("next", next);
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: callbackUrl.toString(),
        },
      });

      if (error) {
        setFormError(formatAuthError(error));
        setLoading(false);
        return;
      }

      // If email confirmation is required and user has no confirmed timestamp:
      if (data.user && !data.user.email_confirmed_at) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        router.refresh();
        return;
      }

      // If already confirmed (or confirmations disabled):
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
        <CardTitle className="type-h2">Begin consistency</CardTitle>
        <CardDescription>Create your single account for web, mobile and widget.</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-5">
        {formError && (
          <Alert tone="destructive">
            <AlertTitle>Sign up failed</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
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
            <Label htmlFor="signup-email">Email address</Label>
            <Input
              id="signup-email"
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
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              aria-invalid={Boolean(passwordError)}
            />
            <FieldHint>At least 8 characters.</FieldHint>
          </Field>

          <Field>
            <Label htmlFor="signup-confirm-password">Confirm password</Label>
            <Input
              id="signup-confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              aria-invalid={Boolean(passwordError)}
            />
            {passwordError && <FieldError>{passwordError}</FieldError>}
          </Field>

          <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
            Create account
          </Button>
        </form>

        <p className="text-center type-small text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={
              next && next !== "/dashboard" ? `/login?next=${encodeURIComponent(next)}` : "/login"
            }
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <Card className="gap-6 shadow-floating">
          <CardHeader className="flex-col items-center gap-1.5 text-center">
            <CardTitle className="type-h2">Begin consistency</CardTitle>
            <CardDescription>Loading registration...</CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
