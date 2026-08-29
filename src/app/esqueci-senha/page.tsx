import Link from "next/link";
import { requestPasswordReset } from "@/actions/auth";
import { AuthCard, AuthInput, AuthButton } from "@/components/AuthCard";

export default async function EsqueciSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; enviado?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthCard>
      <div>
        <h1 className="font-display font-bold text-2xl">Recuperar senha</h1>
        <p className="text-ink-2 text-sm mt-1">
          Vamos te mandar um link por email pra você criar uma senha nova.
        </p>
      </div>
      {params.enviado ? (
        <p className="text-good text-sm">
          Se esse email tiver uma conta no sistema, o link de redefinição já foi
          enviado. Confira sua caixa de entrada (e o spam).
        </p>
      ) : (
        <form action={requestPasswordReset} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-wide text-muted font-semibold">
              Email
            </label>
            <AuthInput type="email" name="email" required autoComplete="email" />
          </div>
          {params.error && <p className="text-critical text-sm">{params.error}</p>}
          <AuthButton>Enviar link</AuthButton>
        </form>
      )}
      <Link href="/login" className="text-sm text-accent-ink hover:underline text-center">
        Voltar pro login
      </Link>
    </AuthCard>
  );
}
