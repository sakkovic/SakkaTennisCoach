"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { signInAction, type SignInState } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signInAction, {});

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <Field id="email" label="Email" required>
        <Input id="email" name="email" type="email" autoComplete="username" required defaultValue={state.email} />
      </Field>
      <Field id="password" label="Password" required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state.error && (
        <p role="alert" className="rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" loading={pending} icon={<LogIn aria-hidden className="size-5" />}>
        Sign in
      </Button>
    </form>
  );
}
