import { trpc } from "@/lib/trpc";
import { CheckCircle, Clock, Flame, RefreshCw } from "lucide-react";

const statusConfig = {
  pendente: {
    titulo: "Aguardando",
    cor: "border-amber-300 bg-amber-50",
    etiqueta: "bg-amber-500",
    icone: Clock,
  },
  "em-preparo": {
    titulo: "Em preparo",
    cor: "border-orange-300 bg-orange-50",
    etiqueta: "bg-orange-500",
    icone: Flame,
  },
  pronto: {
    titulo: "Pronto",
    cor: "border-green-400 bg-green-50",
    etiqueta: "bg-green-600",
    icone: CheckCircle,
  },
} as const;

const formaPagamento = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao: "Cartão",
} as const;

export default function PainelPedidos() {
  const pedidosQuery = trpc.pedidos.painelPublico.useQuery(undefined, {
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });
  const pedidos = pedidosQuery.data ?? [];

  return (
    <main className="min-h-screen bg-[#F3F7F0] p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col gap-3 rounded-2xl bg-[#2D5016] px-6 py-5 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#F4C27A]">World Guaraná</p>
            <h1 className="text-2xl font-bold sm:text-4xl">Acompanhe seu pedido</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/80">
            <RefreshCw size={16} className={pedidosQuery.isFetching ? "animate-spin" : ""} />
            Atualização automática
          </div>
        </header>

        {pedidosQuery.isLoading ? (
          <div className="grid min-h-[50vh] place-items-center text-lg text-muted-foreground">
            Carregando pedidos...
          </div>
        ) : pedidosQuery.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
            Não foi possível carregar os pedidos. A tela tentará novamente automaticamente.
          </div>
        ) : pedidos.length === 0 ? (
          <div className="grid min-h-[50vh] place-items-center rounded-2xl border-2 border-dashed border-[#2D5016]/20 bg-white p-8 text-center">
            <div>
              <Clock className="mx-auto mb-3 text-[#2D5016]" size={42} />
              <h2 className="text-2xl font-bold text-[#2D5016]">Nenhum pedido em andamento</h2>
              <p className="mt-2 text-muted-foreground">Os novos pedidos aparecerão aqui automaticamente.</p>
            </div>
          </div>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {pedidos.map(pedido => {
              const config = statusConfig[pedido.status as keyof typeof statusConfig] ?? statusConfig.pendente;
              const Icone = config.icone;
              return (
                <article key={pedido.id} className={`overflow-hidden rounded-2xl border-2 shadow-sm ${config.cor}`}>
                  <div className="flex items-center justify-between gap-3 border-b border-black/10 px-5 py-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Pedido #{pedido.id}
                      </p>
                      <h2 className="text-2xl font-bold text-[#1D3510]">{pedido.cliente}</h2>
                    </div>
                    <span className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-white ${config.etiqueta}`}>
                      <Icone size={17} />
                      {config.titulo}
                    </span>
                  </div>

                  <div className="space-y-3 p-5">
                    {pedido.copos.length > 0 ? pedido.copos.map((copo, index) => (
                      <div key={`${pedido.id}-${index}`} className="rounded-xl bg-white/90 p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-bold text-[#2D5016]">{copo.quantidade}x {copo.sabor}</p>
                          <span className="rounded-md bg-[#2D5016]/10 px-2 py-1 text-sm font-semibold text-[#2D5016]">
                            {copo.tamanho}ml
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          <strong className="text-foreground">Complementos:</strong>{" "}
                          {copo.complementos.length ? copo.complementos.join(", ") : "Nenhum"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          <strong className="text-foreground">Coberturas:</strong>{" "}
                          {copo.coberturas.length ? copo.coberturas.join(", ") : "Nenhuma"}
                        </p>
                      </div>
                    )) : (
                      <div className="rounded-xl bg-white/90 p-4 shadow-sm">
                        <p className="font-bold text-[#2D5016]">{pedido.quantidade}x {pedido.sabor}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{pedido.tamanho}ml</p>
                        {pedido.itens.length > 0 && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            <strong className="text-foreground">Complementos:</strong> {pedido.itens.join(", ")}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between border-t border-black/10 pt-3 text-sm">
                      <span className="text-muted-foreground">Pagamento</span>
                      <span className="font-semibold">{formaPagamento[pedido.formaPagamento]}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
