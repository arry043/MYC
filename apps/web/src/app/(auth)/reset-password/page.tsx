"use client";

import { CheckCircle2Icon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { formatAuthError, validatePassword } from "@myc/utils";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldHint, Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(Boolean(session));
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPasswordError(null);

    const validation = validatePassword(password);
    if (!validation.valid) {
      setPasswordError(validation.message ?? "Password is invalid.");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(formatAuthError(updateError));
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
      toast({
        title: "Password updated",
        description: "Your password has been successfully updated.",
        tone: "success",
      });
    } catch (err) {
      setError(formatAuthError(err));
      setLoading(false);
    }
  };

  return (
    <Card className="gap-6 shadow-floating">
      <CardHeader className="flex-col items-center gap-3 text-center">
        <div className="grid size-12 place-content-center rounded-2xl bg-primary-soft text-primary-soft-foreground shadow-sm">
          <ShieldCheckIcon className="size-6" />
        </div>
        <div className="grid gap-1">
          <CardTitle className="type-h2">Set new password</CardTitle>
          <CardDescription>Choose a new password for your MYC account.</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="grid gap-5">
        {hasSession === false && !success && (
          <Alert tone="warning">
            <AlertTitle>Session not detected</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                Your password recovery session may have expired. If updating fails, please request a
                new link.
              </p>
              <Link
                href="/forgot-password"
                className="inline-block font-semibold text-primary underline underline-offset-4"
              >
                Request a new reset link &rarr;
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert tone="destructive">
            <AlertTitle>Update failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success ? (
          <div className="grid gap-4 text-center">
            <div className="mx-auto grid size-12 place-content-center rounded-full bg-success-soft text-success">
              <CheckCircle2Icon className="size-6" />
            </div>
            <div className="grid gap-1">
              <p className="type-label">Your password is secure</p>
              <p className="type-small text-muted-foreground">
                You can now access your account with your new password.
              </p>
            </div>
            <Button
              size="lg"
              className="mt-2 w-full"
              onClick={() => {
                router.push("/dashboard");
                router.refresh();
              }}
            >
              Continue to Dashboard
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <Field>
              <Label htmlFor="reset-new-password">New password</Label>
              <Input
                id="reset-new-password"
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
              <Label htmlFor="reset-confirm-password">Confirm new password</Label>
              <Input
                id="reset-confirm-password"
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

            <Button type="submit" size="lg" loading={loading} className="w-full">
              Update password
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
