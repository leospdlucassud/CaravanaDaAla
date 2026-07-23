import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Verifique seu e-mail" };

export default function PaginaVerifiqueSeuEmail() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <MailCheck className="text-primary mx-auto size-12" aria-hidden="true" />
          <CardTitle className="mt-4 text-2xl">Link enviado</CardTitle>
          <CardDescription>
            Abra seu e-mail e clique no link para entrar. Ele vale por pouco
            tempo — se demorar, é só pedir outro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="h-12 w-full text-base">
            <Link href="/entrar">Voltar</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
