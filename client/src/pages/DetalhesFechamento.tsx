import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useSearchParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, DollarSign, Package, CheckCircle, Clock } from "lucide-react";

interface Pedido {
  id: number;
  cliente: string;
  sabor: string;
  tamanho: string;
  valor: number;
  status: string;
  itens: string[];
  imagemUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DetalhesFechamento {
  data: string;
  fechamento: any;
  resumo: {
    totalPedidos: number;
    pedidosEntregues: number;
    faturamentoTotal: number;
    tempoMedioPreparo: number;
  };
  pedidosPorStatus: Record<string, Pedido[]>;
  pedidosPorSabor: Record<string, Pedido[]>;
  pedidos: Pedido[];
}

const statusCores: Record<string, string> = {
  "pendente": "#FF6B6B",
  "em-preparo": "#FFA500",
  "pronto": "#4CAF50",
  "entregue": "#2D5016",
};

const statusLabels: Record<string, string> = {
  "pendente": "Pendente",
  "em-preparo": "Em Preparo",
  "pronto": "Pronto",
  "entregue": "Entregue",
};

export default function DetalhesFechamento() {
  const [, navigate] = useLocation();
  const [searchParams] = useSearchParams();
  const data = searchParams.get("data") || "";
  const [detalhes, setDetalhes] = useState<DetalhesFechamento | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroSabor, setFiltroSabor] = useState<string>("todos");

  const detalhesFechamentoQuery = trpc.caixa.obterDetalhesFechamento.useQuery(
    { data },
    { enabled: !!data }
  );

  useEffect(() => {
    if (detalhesFechamentoQuery.data) {
      setDetalhes(detalhesFechamentoQuery.data as DetalhesFechamento);
    }
  }, [detalhesFechamentoQuery.data]);

  if (detalhesFechamentoQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando detalhes...</p>
      </div>
    );
  }

  if (!detalhes) {
    return (
      <div className="min-h-screen bg-white p-8">
        <Button
          onClick={() => navigate("/historico")}
          variant="outline"
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Voltar
        </Button>
        <Card className="p-12 text-center">
          <p className="text-muted-foreground text-lg">Nenhum detalhe disponível</p>
        </Card>
      </div>
    );
  }

  const pedidosFiltrados = detalhes.pedidos.filter(p => {
    const statusMatch = filtroStatus === "todos" || p.status === filtroStatus;
    const saborMatch = filtroSabor === "todos" || p.sabor === filtroSabor;
    return statusMatch && saborMatch;
  });

  const sabores = Object.keys(detalhes.pedidosPorSabor);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2D5016] to-[#1A3A0A] text-white p-8">
        <div className="container mx-auto">
          <Button
            onClick={() => navigate("/historico")}
            variant="ghost"
            className="mb-4 text-white hover:bg-white/20 flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            Voltar
          </Button>
          <h1 className="text-4xl font-bold">📋 Detalhes do Fechamento</h1>
          <p className="text-white/80 mt-2">
            {new Date(detalhes.data).toLocaleDateString("pt-BR", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 border-l-4 border-[#2D5016]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Faturamento</p>
                <p className="text-3xl font-bold text-[#2D5016] mt-2">
                  R$ {detalhes.resumo.faturamentoTotal.toFixed(2)}
                </p>
              </div>
              <DollarSign size={32} className="text-[#2D5016] opacity-20" />
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-[#F4A460]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total de Pedidos</p>
                <p className="text-3xl font-bold text-[#F4A460] mt-2">
                  {detalhes.resumo.totalPedidos}
                </p>
              </div>
              <Package size={32} className="text-[#F4A460] opacity-20" />
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Entregues</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {detalhes.resumo.pedidosEntregues}
                </p>
              </div>
              <CheckCircle size={32} className="text-green-600 opacity-20" />
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-blue-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Tempo Médio</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {detalhes.resumo.tempoMedioPreparo}m
                </p>
              </div>
              <Clock size={32} className="text-blue-600 opacity-20" />
            </div>
          </Card>
        </div>

        {/* Observações */}
        {detalhes.fechamento?.observacoes && (
          <Card className="p-6 mb-8 bg-blue-50 border-l-4 border-blue-600">
            <h3 className="font-bold text-blue-900 mb-2">Observações do Fechamento</h3>
            <p className="text-blue-800">{detalhes.fechamento.observacoes}</p>
          </Card>
        )}

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div>
            <label className="block text-sm font-medium mb-2">Filtrar por Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg"
            >
              <option value="todos">Todos os Status</option>
              <option value="pendente">Pendente</option>
              <option value="em-preparo">Em Preparo</option>
              <option value="pronto">Pronto</option>
              <option value="entregue">Entregue</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Filtrar por Sabor</label>
            <select
              value={filtroSabor}
              onChange={(e) => setFiltroSabor(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg"
            >
              <option value="todos">Todos os Sabores</option>
              {sabores.map((sabor) => (
                <option key={sabor} value={sabor}>
                  {sabor}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabela de Pedidos */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-bold text-[#2D5016] mb-4">
            Pedidos ({pedidosFiltrados.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-[#2D5016]">Cliente</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#2D5016]">Sabor</th>
                  <th className="text-center py-3 px-4 font-semibold text-[#2D5016]">Tamanho</th>
                  <th className="text-center py-3 px-4 font-semibold text-[#2D5016]">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#2D5016]">Valor</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#2D5016]">Complementos</th>
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map((pedido) => (
                  <tr key={pedido.id} className="border-b border-border hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{pedido.cliente}</td>
                    <td className="py-3 px-4">{pedido.sabor}</td>
                    <td className="py-3 px-4 text-center">{pedido.tamanho}ml</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className="px-3 py-1 rounded-full text-white text-xs font-semibold"
                        style={{ backgroundColor: statusCores[pedido.status] }}
                      >
                        {statusLabels[pedido.status]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">R$ {pedido.valor.toFixed(2)}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {pedido.itens.length > 0 ? pedido.itens.join(", ") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pedidosFiltrados.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum pedido encontrado com os filtros selecionados
            </div>
          )}
        </Card>

        {/* Resumo por Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Object.entries(detalhes.pedidosPorStatus).map(([status, pedidos]) => (
            <Card key={status} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">{statusLabels[status]}</p>
                  <p className="text-3xl font-bold mt-2" style={{ color: statusCores[status] }}>
                    {pedidos.length}
                  </p>
                </div>
                <div
                  className="w-12 h-12 rounded-full opacity-20"
                  style={{ backgroundColor: statusCores[status] }}
                />
              </div>
            </Card>
          ))}
        </div>

        {/* Top Sabores */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-[#2D5016] mb-4">Sabores Mais Vendidos</h2>
          <div className="space-y-3">
            {Object.entries(detalhes.pedidosPorSabor)
              .sort(([, a], [, b]) => b.length - a.length)
              .map(([sabor, pedidos]) => (
                <div key={sabor} className="flex items-center justify-between pb-3 border-b">
                  <span className="font-medium">{sabor}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">{pedidos.length} pedidos</span>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#2D5016] h-2 rounded-full"
                        style={{
                          width: `${(pedidos.length / detalhes.resumo.totalPedidos) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
