import { updatePassword } from "@/actions/auth";
import { AuthCard, AuthInput, AuthButton } from "@/components/AuthCard";

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthCard>
      <div>
        <h1 className="font-display font-bold text-2xl">Nova senha</h1>
        <p className="text-ink-2 text-sm mt-1">Escolha uma senha com pelo menos 8 caracteres.</p>
      </div>
      <form action={updatePassword} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-muted font-semibold">
            Nova senha
          </label>
          <AuthInput type="password" name="password" required minLength={8} autoComplete="new-password" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-muted font-semibold">
            Confirmar senha
          </label>
          <AuthInput type="password" name="confirm" required minLength={8} autoComplete="new-password" />
        </div>
        {params.error && <p className="text-critical text-sm">{params.error}</p>}
        <AuthButton>Salvar nova senha</AuthButton>
      </form>
    </AuthCard>
  );
}
