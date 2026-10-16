"use client";

import { ArrowLeftIcon, KeyRoundIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { isValidEmail } from "@myc/utils";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldError, Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);

    if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();
      const origin = window.location.origin;
      const callbackUrl = new URL("/auth/callback", origin);
      callbackUrl.searchParams.set("type", "recovery");
      callbackUrl.searchParams.set("next", "/reset-password");

      // Regardless of success or failure, we show the same message to prevent account enumeration
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: callbackUrl.toString(),
      });

      setSubmitted(true);
      setLoading(false);
    } catch {
      // Still show the generic success notice to avoid enumeration
      setSubmitted(true);
      setLoading(false);
    }
  };

  return (
    <Card className="gap-6 shadow-floating">
      <CardHeader className="flex-col items-center gap-3 text-center">
        <div className="grid size-12 place-content-center rounded-2xl bg-primary-soft text-primary-soft-foreground shadow-sm">
          <KeyRoundIcon className="size-6" />
        </div>
        <div className="grid gap-1">
          <CardTitle className="type-h2">Reset your password</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send recovery instructions.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="grid gap-5">
        {submitted ? (
          <div className="grid gap-4">
            <Alert tone="info">
              <AlertTitle>Check your inbox</AlertTitle>
              <AlertDescription>
                If an account exists for{" "}
                <span className="font-semibold text-foreground">{email}</span>, we&apos;ve sent a
                link to reset your password.
              </AlertDescription>
            </Alert>
            <Link href="/login">
              <Button variant="secondary" size="lg" className="w-full">
                <ArrowLeftIcon className="size-4" />
                Return to sign in
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <Field>
              <Label htmlFor="forgot-email">Email address</Label>
              <Input
                id="forgot-email"
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

            <Button type="submit" size="lg" loading={loading} className="w-full">
              Send reset link
            </Button>

            <Link href="/login" className="text-center">
              <span className="type-small text-muted-foreground hover:text-foreground">
                &larr; Back to sign in
              </span>
            </Link>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
