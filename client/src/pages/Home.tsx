import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { gerarTXTRelatorio } from "@/lib/txt-generator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Clock, Flame, CheckCircle, Truck, Lock, Upload, FileText, LogOut, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

/**
 * Design: Modernismo Minimalista com Toques Tropicais
 * - Verde Guaraná (#2D5016) como cor primária
 * - Amarelo Ouro (#F4A460) para destaque
 * - Vermelho Terracota (#C85A54) para CTAs
 * - Tipografia: Poppins para títulos, Inter para corpo
 * - Layout assimétrico com cards flutuantes
 */

const sabores = [
  "Tradicional",
  "Abacate",
  "Abacaxi",
  "Açaí",
  "Azulão",
  "Banana",
  "Baunilha",
  "Cajá",
  "Chocolate Branco",
  "Chocolate",
  "Cupuaçu",
  "Farinha Láctea",
  "Goiaba",
  "Graviola",
  "Leite Condensado",
  "Maracujá",
  "Milho Verde",
  "Morango",
  "Ovomaltine",
];

const complementos = [
  "Ovomaltine",
  "Farinha Láctea",
  "Gotas de Chocolate",
  "Granola",
  "Jujuba",
  "Flocos",
  "Choco Power Ball",
  "Disqueti",
  "Amendoim",
  "Amendoim Colorido",
];

type StatusPedido = "pendente" | "em-preparo" | "pronto" | "entregue";

interface Pedido {
  id: number;
  cliente: string;
  tamanho: string;
  sabor: string;
  itens?: string[];
  valor: number;
  status: StatusPedido;
  encerrado: number;
  imagemUrl?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export default function Home() {
  const { user } = useAuth();
  const [cliente, setCliente] = useState("");
  const [tamanho, setTamanho] = useState("500");
  const [sabor, setSabor] = useState("Tradicional");
  const [complementosSelecionados, setComplementosSelecionados] = useState<string[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [uploadingIds, setUploadingIds] = useState<number[]>([]);
  
  // Filtros e busca
  const [buscaCliente, setBuscaCliente] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusPedido | "todos">("todos");
  const [filtroSabor, setFiltroSabor] = useState("todos");
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split("T")[0]);
  const [observacoesFechamento, setObservacoesFechamento] = useState("");
  const [mostrarFechamento, setMostrarFechamento] = useState(false);
  const [, navigate] = useLocation();

  // tRPC queries e mutations
  const listarPedidosQuery = trpc.pedidos.listar.useQuery();
  const criarPedidoMutation = trpc.pedidos.criar.useMutation();
  const atualizarStatusMutation = trpc.pedidos.atualizarStatus.useMutation();
  const deletarPedidoMutation = trpc.pedidos.deletar.useMutation();
  const uploadImagemMutation = trpc.pedidos.uploadImagem.useMutation();
  const gerarPDFQuery = trpc.caixa.gerarPDF.useQuery({ data: dataSelecionada }, { enabled: false });
  const fecharCaixaMutation = trpc.caixa.fechar.useMutation();

  // Carregar pedidos ao montar o componente
  useEffect(() => {
    if (listarPedidosQuery.data) {
      setPedidos(listarPedidosQuery.data as Pedido[]);
    }
  }, [listarPedidosQuery.data]);

  const valor = tamanho === "700" ? 25 : tamanho === "500" ? 20 : 15;

  const handleComplementoChange = (complemento: string, checked: boolean) => {
    if (checked) {
      setComplementosSelecionados([...complementosSelecionados, complemento]);
    } else {
      setComplementosSelecionados(
        complementosSelecionados.filter((c) => c !== complemento)
      );
    }
  };

  const salvarPedido = async () => {
    if (!cliente.trim()) {
      toast.error("Por favor, insira o nome do cliente");
      return;
    }

    try {
      const novoPedido = await criarPedidoMutation.mutateAsync({
        cliente,
        tamanho,
        sabor,
        valor,
        itens: complementosSelecionados,
      });

      if (novoPedido) {
        setPedidos([...pedidos, { ...novoPedido, itens: complementosSelecionados } as Pedido]);
        setCliente("");
        setComplementosSelecionados([]);
        setSabor("Tradicional");
        setTamanho("500");
        toast.success(`Pedido de ${cliente} salvo com sucesso!`);
      }
    } catch (error) {
      toast.error("Erro ao salvar pedido");
      console.error(error);
    }
  };

  const deletarPedido = async (id: number) => {
    try {
      await deletarPedidoMutation.mutateAsync({ id });
      setPedidos(pedidos.filter((p) => p.id !== id));
      toast.success("Pedido removido");
    } catch (error) {
      toast.error("Erro ao deletar pedido");
      console.error(error);
    }
  };

  const mudarStatus = async (id: number, statusAtual: StatusPedido) => {
    const statusSequencia: StatusPedido[] = ["pendente", "em-preparo", "pronto", "entregue"];
    const indiceAtual = statusSequencia.indexOf(statusAtual);
    const proximoStatus = statusSequencia[(indiceAtual + 1) % statusSequencia.length];

    try {
      const pedidoAtualizado = await atualizarStatusMutation.mutateAsync({
        id,
        status: proximoStatus,
      });

      if (pedidoAtualizado) {
        setPedidos(
          pedidos.map((p) =>
            p.id === id
              ? { ...p, status: proximoStatus, encerrado: proximoStatus === "entregue" ? 1 : 0 }
              : p
          )
        );
        toast.success(`Pedido atualizado para ${proximoStatus}`);
      }
    } catch (error) {
      toast.error("Erro ao atualizar status");
      console.error(error);
    }
  };

  const handleUploadImagem = async (e: React.ChangeEvent<HTMLInputElement>, pedidoId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIds([...uploadingIds, pedidoId]);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        try {
          const pedidoAtualizado = await uploadImagemMutation.mutateAsync({
            id: pedidoId,
            imagem: base64,
            mimeType: file.type,
          });

          if (pedidoAtualizado) {
            setPedidos(
              pedidos.map((p) =>
                p.id === pedidoId ? { ...p, imagemUrl: (pedidoAtualizado as any).imagemUrl } : p
              )
            );
            toast.success("Imagem enviada com sucesso!");
          }
        } catch (error) {
          toast.error("Erro ao fazer upload da imagem");
          console.error(error);
        } finally {
          setUploadingIds(prev => prev.filter(id => id !== pedidoId));
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Erro ao processar imagem");
      console.error(error);
      setUploadingIds(prev => prev.filter(id => id !== pedidoId));
    }
  };

  const gerarRelatorio = async () => {
    try {
      const dados = await trpc.caixa.gerarPDF.useQuery({ data: dataSelecionada }).refetch();
      if (dados.data) {
        gerarTXTRelatorio(dados.data);
        toast.success("Relatório gerado com sucesso!");
      }
    } catch (error) {
      toast.error("Erro ao gerar relatório");
      console.error(error);
    }
  };

  const fecharCaixa = async () => {
    try {
      await fecharCaixaMutation.mutateAsync({
        data: dataSelecionada,
        observacoes: observacoesFechamento,
      });
      toast.success("Caixa fechado com sucesso!");
      setMostrarFechamento(false);
      setObservacoesFechamento("");
    } catch (error) {
      toast.error("Erro ao fechar caixa");
      console.error(error);
    }
  };

  const getStatusInfo = (status: StatusPedido) => {
    const statusMap: Record<StatusPedido, { label: string; color: string; iconComponent: React.ReactNode; progress: number }> = {
      pendente: { label: "Pendente", color: "bg-yellow-100 text-yellow-800", iconComponent: <Clock size={14} />, progress: 25 },
      "em-preparo": { label: "Em Preparo", color: "bg-orange-100 text-orange-800", iconComponent: <Flame size={14} />, progress: 50 },
      pronto: { label: "Pronto", color: "bg-green-100 text-green-800", iconComponent: <CheckCircle size={14} />, progress: 75 },
      entregue: { label: "Entregue", color: "bg-blue-100 text-blue-800", iconComponent: <Truck size={14} />, progress: 100 },
    };
    return statusMap[status];
  };

  // Aplicar filtros
  const pedidosFiltrados = pedidos.filter((p) => {
    const matchCliente = p.cliente.toLowerCase().includes(buscaCliente.toLowerCase());
    const matchStatus = filtroStatus === "todos" || p.status === filtroStatus;
    const matchSabor = filtroSabor === "todos" || p.sabor === filtroSabor;
    return matchCliente && matchStatus && matchSabor;
  });

  const pedidosAtivos = pedidosFiltrados.filter(p => !p.encerrado);
  const pedidosEncerrados = pedidosFiltrados.filter(p => p.encerrado);

  const renderizarCard = (p: Pedido, index: number, isEncerrado: boolean) => (
    <Card
      key={p.id}
      className={`p-4 border transition-all duration-200 group ${
        isEncerrado
          ? "border-gray-300 bg-gray-50 opacity-75"
          : "border-border hover:border-[#F4A460] hover:shadow-md"
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="inline-block bg-[#2D5016] text-white text-xs font-bold px-2 py-1 rounded">
            #{index + 1}
          </div>
          <h3 className="text-lg font-bold text-foreground mt-2">
            {p.cliente}
          </h3>
        </div>
        <div className="flex gap-2">
          {isEncerrado && (
            <div className="text-green-600" title="Pedido encerrado">
              <Lock size={18} />
            </div>
          )}
          {!isEncerrado && (
            <button
              onClick={() => deletarPedido(p.id)}
              className="text-muted-foreground hover:text-[#C85A54] transition-colors opacity-0 group-hover:opacity-100"
              title="Deletar pedido"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Imagem do Pedido */}
      {p.imagemUrl && (
        <div className="mb-3 rounded-lg overflow-hidden">
          <img
            src={p.imagemUrl}
            alt="Pedido"
            className="w-full h-32 object-cover"
          />
        </div>
      )}

      {/* Upload de Imagem */}
      {!isEncerrado && (
        <div className="mb-3">
          <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-[#F4A460] rounded-lg cursor-pointer hover:bg-[#F4A460]/5 transition-colors">
            <Upload size={14} className="text-[#F4A460]" />
            <span className="text-xs text-muted-foreground">
              {uploadingIds.includes(p.id) ? "Enviando..." : "Adicionar foto"}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleUploadImagem(e, p.id)}
              disabled={uploadingIds.includes(p.id)}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Status Timeline */}
      <div className="mb-4 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground">PROGRESSO</span>
          <button
            onClick={() => mudarStatus(p.id, p.status)}
            disabled={isEncerrado}
            className={`text-xs font-bold px-2 py-1 rounded transition-all flex items-center gap-1 ${
              isEncerrado
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer hover:scale-105"
            } ${getStatusInfo(p.status).color}`}
          >
            {getStatusInfo(p.status).iconComponent}
            {getStatusInfo(p.status).label}
            {isEncerrado && <Lock size={12} />}
          </button>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-[#2D5016] to-[#F4A460] h-2 rounded-full transition-all duration-300"
            style={{ width: `${getStatusInfo(p.status).progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>Pendente</span>
          <span>Em Preparo</span>
          <span>Pronto</span>
          <span>Entregue</span>
        </div>
      </div>

      <div className="space-y-2 text-sm mb-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Sabor:</span>
          <span className="font-medium">{p.sabor}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tamanho:</span>
          <span className="font-medium">{p.tamanho}ml</span>
        </div>
        {(p.itens?.length ?? 0) > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Complementos:</span>
            <span className="font-medium">{p.itens?.length}</span>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-border flex justify-between items-center">
        <span className="text-muted-foreground text-sm">Total:</span>
        <span className="text-xl font-bold text-[#C85A54]">
          R$ {p.valor},00
        </span>
      </div>
    </Card>
  );

  if (listarPedidosQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando pedidos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section com Background */}
      <div className="relative w-full h-64 md:h-80 overflow-hidden">
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663566472000/72ZRcwoyRtrsjUn7Qyk5KS/guarana-hero-c2EBeLViRnzyL773eSYGnV.webp"
          alt="World Guaraná Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-[#2D5016] drop-shadow-lg">
              🥤 World Guaraná
            </h1>
            <p className="text-md md:text-lg text-[#2D5016] mt-2 drop-shadow-md">
              Sistema de gerenciamento de pedidos
            </p>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulário - Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card: Dados do Cliente */}
            <Card className="p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-bold text-[#2D5016] mb-4">
                Dados do Cliente
              </h2>
              <div className="space-y-3">
                <div>
                  <Label
                    htmlFor="cliente"
                    className="text-sm font-medium text-foreground"
                  >
                    Nome do Cliente
                  </Label>
                  <Input
                    id="cliente"
                    placeholder="Digite o nome do cliente"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    className="mt-2 border-border focus:ring-[#2D5016]"
                  />
                </div>
              </div>
            </Card>

            {/* Card: Tamanho */}
            <Card className="p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-bold text-[#2D5016] mb-4">Tamanho</h2>
              <Select value={tamanho} onValueChange={setTamanho}>
                <SelectTrigger className="border-border focus:ring-[#2D5016]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="400">400ml - R$ 15,00</SelectItem>
                  <SelectItem value="500">500ml - R$ 20,00</SelectItem>
                  <SelectItem value="700">700ml - R$ 25,00</SelectItem>
                </SelectContent>
              </Select>
            </Card>

            {/* Card: Sabor */}
            <Card className="p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-bold text-[#2D5016] mb-4">Sabor</h2>
              <Select value={sabor} onValueChange={setSabor}>
                <SelectTrigger className="border-border focus:ring-[#2D5016]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {sabores.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>

            {/* Card: Complementos */}
            <Card className="p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-bold text-[#2D5016] mb-4">
                Complementos
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {complementos.map((c) => (
                  <div key={c} className="flex items-center space-x-3">
                    <Checkbox
                      id={c}
                      checked={complementosSelecionados.includes(c)}
                      onCheckedChange={(checked) =>
                        handleComplementoChange(c, checked as boolean)
                      }
                      className="border-border"
                    />
                    <Label
                      htmlFor={c}
                      className="text-sm cursor-pointer font-normal text-foreground"
                    >
                      {c}
                    </Label>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Resumo e Ações - Coluna Lateral */}
          <div className="lg:col-span-1">
            {/* Card: Resumo do Pedido */}
            <Card className="p-6 border-2 border-[#2D5016] bg-gradient-to-br from-white to-[#F9F9F9] shadow-md sticky top-24">
              <h2 className="text-xl font-bold text-[#2D5016] mb-4">
                Resumo do Pedido
              </h2>

              <div className="space-y-3 mb-6 pb-6 border-b border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tamanho:</span>
                  <span className="font-medium">{tamanho}ml</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sabor:</span>
                  <span className="font-medium">{sabor}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Complementos:</span>
                  <span className="font-medium">
                    {complementosSelecionados.length}
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-baseline">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="text-3xl font-bold text-[#C85A54]">
                    R$ {valor},00
                  </span>
                </div>
              </div>

              <Button
                onClick={salvarPedido}
                disabled={criarPedidoMutation.isPending}
                className="w-full bg-[#2D5016] hover:bg-[#1A3A0A] text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                {criarPedidoMutation.isPending ? "Salvando..." : "Salvar Pedido"}
              </Button>
            </Card>
          </div>
        </div>

        {/* Seção: Filtros e Busca */}
        <div className="mt-12 pt-8 border-t border-border">
          <h2 className="text-2xl font-bold text-[#2D5016] mb-6">
            Filtros e Busca
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label className="text-sm font-medium mb-2 block">Buscar Cliente</Label>
              <Input
                placeholder="Digite o nome do cliente"
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                className="border-border"
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">Status</Label>
              <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as any)}>
                <SelectTrigger className="border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em-preparo">Em Preparo</SelectItem>
                  <SelectItem value="pronto">Pronto</SelectItem>
                  <SelectItem value="entregue">Entregue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Sabor</Label>
              <Select value={filtroSabor} onValueChange={setFiltroSabor}>
                <SelectTrigger className="border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="todos">Todos</SelectItem>
                  {sabores.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Data</Label>
              <Input
                type="date"
                value={dataSelecionada}
                onChange={(e) => setDataSelecionada(e.target.value)}
                className="border-border"
              />
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3 mb-6 flex-wrap">
            <Button
              onClick={gerarRelatorio}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <FileText size={18} />
              Gerar Relatório
            </Button>

            <Button
              onClick={() => navigate("/historico")}
              className="bg-[#2D5016] hover:bg-[#1A3A0A] text-white flex items-center gap-2"
            >
              <BarChart3 size={18} />
              Histórico
            </Button>

            <Button
              onClick={() => setMostrarFechamento(true)}
              className="bg-[#C85A54] hover:bg-[#A84A44] text-white flex items-center gap-2"
            >
              <LogOut size={18} />
              Fechar Caixa
            </Button>
          </div>
        </div>

        {/* Modal de Fechamento de Caixa */}
        {mostrarFechamento && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md p-6">
              <h2 className="text-2xl font-bold text-[#2D5016] mb-4">Fechar Caixa</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Data</Label>
                  <Input
                    type="date"
                    value={dataSelecionada}
                    disabled
                    className="border-border bg-gray-50"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Observações (opcional)</Label>
                  <textarea
                    value={observacoesFechamento}
                    onChange={(e) => setObservacoesFechamento(e.target.value)}
                    placeholder="Digite observações sobre o dia..."
                    className="w-full p-2 border border-border rounded-lg"
                    rows={4}
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p className="text-sm"><strong>Total de Pedidos:</strong> {pedidos.length}</p>
                  <p className="text-sm"><strong>Pedidos Entregues:</strong> {pedidos.filter(p => p.status === "entregue").length}</p>
                  <p className="text-sm"><strong>Faturamento:</strong> R$ {(pedidos.reduce((acc, p) => acc + p.valor, 0) / 100).toFixed(2)}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setMostrarFechamento(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={fecharCaixa}
                  disabled={fecharCaixaMutation.isPending}
                  className="flex-1 bg-[#2D5016] hover:bg-[#1A3A0A] text-white"
                >
                  {fecharCaixaMutation.isPending ? "Fechando..." : "Confirmar Fechamento"}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Seção: Pedidos em Andamento */}
        <div className="mt-12 pt-8 border-t border-border">
          <h2 className="text-2xl font-bold text-[#2D5016] mb-6">
            Pedidos em Andamento ({pedidosAtivos.length})
          </h2>

          {pedidosAtivos.length === 0 ? (
            <Card className="p-12 text-center border border-dashed border-border mb-12">
              <p className="text-muted-foreground text-lg">
                Nenhum pedido em andamento
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Preencha o formulário e clique em "Salvar Pedido" para começar
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
              {pedidosAtivos.map((p, index) => renderizarCard(p, index + 1, false))}
            </div>
          )}

          {/* Seção: Pedidos Encerrados */}
          {pedidosEncerrados.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border">
              <h2 className="text-2xl font-bold text-green-700 mb-6">
                ✓ Pedidos Entregues ({pedidosEncerrados.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pedidosEncerrados.map((p, index) => renderizarCard(p, pedidosAtivos.length + index + 1, true))}
              </div>
            </div>
          )}

          {/* Resumo Total */}
          {pedidos.length > 0 && (
            <Card className="mt-6 p-6 bg-gradient-to-r from-[#2D5016] to-[#1A3A0A] text-white border-0">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-white/80 text-sm">Total de Pedidos</p>
                  <p className="text-3xl font-bold">{pedidos.length}</p>
                </div>
                <div>
                  <p className="text-white/80 text-sm">Em Andamento</p>
                  <p className="text-3xl font-bold">{pedidosAtivos.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/80 text-sm">Faturamento</p>
                  <p className="text-3xl font-bold">
                    R$ {(pedidos.reduce((acc, p) => acc + p.valor, 0) / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 World Guaraná. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
