import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ArrowLeft, TrendingUp, DollarSign, Package, CheckCircle, Clock } from "lucide-react";
import { useLocation } from "wouter";

interface Estatisticas {
  totalFaturamento: number;
  totalPedidos: number;
  totalEntregues: number;
  mediaPorDia: number;
  tempoMedioGeral: number;
  diasRegistrados: number;
  faturamentoPorDia: Array<{
    data: string;
    faturamento: number;
    pedidos: number;
    entregues: number;
  }>;
  fechamentos: Array<{
    id: number;
    data: string;
    totalPedidos: number;
    faturamentoTotal: number;
    pedidosEntregues: number;
    tempoMedioPreparo: number | null;
    observacoes: string | null;
  }>;
}

const CORES = ["#2D5016", "#F4A460", "#C85A54", "#4CAF50", "#FF9800"];

export default function Historico() {
  const [, navigate] = useLocation();
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
  const [filtroData, setFiltroData] = useState("");

  const estatisticasQuery = trpc.caixa.obterEstatisticas.useQuery();

  useEffect(() => {
    if (estatisticasQuery.data) {
      setEstatisticas(estatisticasQuery.data as Estatisticas);
    }
  }, [estatisticasQuery.data]);

  if (estatisticasQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando histórico...</p>
      </div>
    );
  }

  if (!estatisticas || estatisticas.diasRegistrados === 0) {
    return (
      <div className="min-h-screen bg-white p-8">
        <Button
          onClick={() => navigate("/")}
          variant="outline"
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Voltar
        </Button>
        <Card className="p-12 text-center">
          <p className="text-muted-foreground text-lg">Nenhum histórico disponível</p>
          <p className="text-sm text-muted-foreground mt-2">Comece a registrar fechamentos para ver o histórico</p>
        </Card>
      </div>
    );
  }

  const fechamentosFiltrados = filtroData
    ? estatisticas.fechamentos.filter(f => f.data.includes(filtroData))
    : estatisticas.fechamentos;

  const taxaEntrega = [
    { name: "Entregues", value: estatisticas.totalEntregues },
    { name: "Não Entregues", value: estatisticas.totalPedidos - estatisticas.totalEntregues },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2D5016] to-[#1A3A0A] text-white p-8">
        <div className="container mx-auto">
          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            className="mb-4 text-white hover:bg-white/20 flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            Voltar
          </Button>
          <h1 className="text-4xl font-bold">📊 Histórico de Vendas</h1>
          <p className="text-white/80 mt-2">Análise completa de faturamento e performance</p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="p-6 border-l-4 border-[#2D5016]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Faturamento Total</p>
                <p className="text-3xl font-bold text-[#2D5016] mt-2">
                  R$ {estatisticas.totalFaturamento.toFixed(2)}
                </p>
              </div>
              <DollarSign size={32} className="text-[#2D5016] opacity-20" />
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-[#F4A460]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Média por Dia</p>
                <p className="text-3xl font-bold text-[#F4A460] mt-2">
                  R$ {estatisticas.mediaPorDia.toFixed(2)}
                </p>
              </div>
              <TrendingUp size={32} className="text-[#F4A460] opacity-20" />
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-[#C85A54]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total de Pedidos</p>
                <p className="text-3xl font-bold text-[#C85A54] mt-2">
                  {estatisticas.totalPedidos}
                </p>
              </div>
              <Package size={32} className="text-[#C85A54] opacity-20" />
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Entregues</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {estatisticas.totalEntregues}
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
                  {estatisticas.tempoMedioGeral}m
                </p>
              </div>
              <Clock size={32} className="text-blue-600 opacity-20" />
            </div>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Gráfico de Faturamento por Dia */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-[#2D5016] mb-4">Faturamento por Dia</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={estatisticas.faturamentoPorDia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="faturamento"
                  stroke="#2D5016"
                  strokeWidth={2}
                  name="Faturamento (R$)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Gráfico de Pedidos por Dia */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-[#2D5016] mb-4">Pedidos por Dia</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={estatisticas.faturamentoPorDia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="pedidos" fill="#F4A460" name="Total" />
                <Bar dataKey="entregues" fill="#2D5016" name="Entregues" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Gráfico de Taxa de Entrega */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-[#2D5016] mb-4">Taxa de Entrega</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={taxaEntrega}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {taxaEntrega.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Resumo Geral */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-[#2D5016] mb-4">Resumo Geral</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-muted-foreground">Dias Registrados:</span>
                <span className="font-bold text-lg">{estatisticas.diasRegistrados}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-muted-foreground">Taxa de Entrega:</span>
                <span className="font-bold text-lg text-green-600">
                  {((estatisticas.totalEntregues / estatisticas.totalPedidos) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-muted-foreground">Média de Pedidos/Dia:</span>
                <span className="font-bold text-lg">
                  {(estatisticas.totalPedidos / estatisticas.diasRegistrados).toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tempo Médio de Preparo:</span>
                <span className="font-bold text-lg">{estatisticas.tempoMedioGeral} min</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabela de Fechamentos */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#2D5016]">Detalhes dos Fechamentos</h2>
            <input
              type="date"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-[#2D5016]">Data</th>
                  <th className="text-center py-3 px-4 font-semibold text-[#2D5016]">Pedidos</th>
                  <th className="text-center py-3 px-4 font-semibold text-[#2D5016]">Entregues</th>
                  <th className="text-right py-3 px-4 font-semibold text-[#2D5016]">Faturamento</th>
                  <th className="text-center py-3 px-4 font-semibold text-[#2D5016]">Tempo Médio</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#2D5016]">Observações</th>
                </tr>
              </thead>
              <tbody>
                {fechamentosFiltrados.map((fechamento) => (
                  <tr key={fechamento.id} className="border-b border-border hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => navigate(`/detalhes-fechamento?data=${fechamento.data}`)}>
                    <td className="py-3 px-4">{new Date(fechamento.data).toLocaleDateString("pt-BR")}</td>
                    <td className="py-3 px-4 text-center">{fechamento.totalPedidos}</td>
                    <td className="py-3 px-4 text-center text-green-600 font-semibold">{fechamento.pedidosEntregues}</td>
                    <td className="py-3 px-4 text-right font-semibold">R$ {fechamento.faturamentoTotal.toFixed(2)}</td>
                    <td className="py-3 px-4 text-center">{fechamento.tempoMedioPreparo || "-"} min</td>
                    <td className="py-3 px-4 text-muted-foreground">{fechamento.observacoes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
