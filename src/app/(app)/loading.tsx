import { Carregando } from "@/components/carregando";

// Next mostra isto automaticamente enquanto a próxima tela do app carrega os
// dados. Vale para todas as rotas dentro de (app).
export default function CarregandoDoApp() {
  return <Carregando />;
}
