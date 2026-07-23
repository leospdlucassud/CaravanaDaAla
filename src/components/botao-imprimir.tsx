"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BotaoImprimir() {
  return (
    <Button onClick={() => window.print()} className="min-h-11">
      <Printer className="size-4" aria-hidden="true" />
      Imprimir ou salvar em PDF
    </Button>
  );
}
