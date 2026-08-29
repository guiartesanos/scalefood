import Link from "next/link";
import { signIn } from "@/actions/auth";
import { AuthCard, AuthInput, AuthButton } from "@/components/AuthCard";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthCard>
      <div>
        <h1 className="font-display font-bold text-2xl">Entrar</h1>
        <p className="text-ink-2 text-sm mt-1">Sistema Aceleração</p>
      </div>
      <form action={signIn} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-muted font-semibold">
            Email
          </label>
          <AuthInput type="email" name="email" required autoComplete="email" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-muted font-semibold">
            Senha
          </label>
          <AuthInput
            type="password"
            name="password"
            required
            autoComplete="current-password"
          />
        </div>
        {params.error && (
          <p className="text-critical text-sm">{params.error}</p>
        )}
        <AuthButton>Entrar</AuthButton>
      </form>
      <Link href="/esqueci-senha" className="text-sm text-accent-ink hover:underline text-center">
        Esqueci minha senha
      </Link>
    </AuthCard>
  );
}
