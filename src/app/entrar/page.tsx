import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { usuarioAtual } from "@/lib/autorizacao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaDeEntrada({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const jaLogado = await usuarioAtual();
  if (jaLogado) redirect("/");

  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Caravana ao Templo</CardTitle>
          <CardDescription>
            Digite seu e-mail. Enviamos um link de acesso — sem senha para
            decorar.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                Não conseguimos entrar com esse link. Ele pode ter expirado ou já
                ter sido usado. Peça um novo abaixo.
              </AlertDescription>
            </Alert>
          ) : null}

          <form
            action={async (dadosDoFormulario) => {
              "use server";
              const email = String(dadosDoFormulario.get("email") ?? "").trim();
              await signIn("resend", { email, redirectTo: "/" });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                placeholder="voce@exemplo.com"
                className="h-12 text-base"
              />
            </div>

            <Button type="submit" className="h-12 w-full text-base">
              Receber link de acesso
            </Button>
          </form>

          <p className="text-muted-foreground mt-6 text-sm">
            O acesso é restrito a quem foi cadastrado pelo administrador. Se o
            seu e-mail não estiver liberado, fale com o responsável pela
            caravana.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
