import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Building2, Check, LogOut, Plus, RefreshCw, Save, UserRound, X } from "lucide-react";
import { toast } from "sonner";

const dataInput = (value: Date | string | null) => {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
};

const gerarSlug = (texto: string) => texto
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type EmpresaPainel = NonNullable<ReturnType<typeof trpc.empresas.listar.useQuery>["data"]>[number];
type SolicitacaoPainel = NonNullable<ReturnType<typeof trpc.cadastro.listar.useQuery>["data"]>[number];

function SolicitacaoCard({
  solicitacao,
  processando,
  onAprovar,
  onRecusar,
}: {
  solicitacao: SolicitacaoPainel;
  processando: boolean;
  onAprovar: (dados: { id: number; slug: string; plano: "basico" | "profissional" | "premium"; valorMensalidade: number; diasTeste: number; assinaturaAte: string | null }) => void;
  onRecusar: (id: number) => void;
}) {
  const [slug, setSlug] = useState(gerarSlug(solicitacao.estabelecimento));
  const [plano, setPlano] = useState<"basico" | "profissional" | "premium">("basico");
  const [mensalidade, setMensalidade] = useState(0);
  const [diasTeste, setDiasTeste] = useState(7);
  const [assinaturaAte, setAssinaturaAte] = useState("");

  return (
    <Card className="border-[#F4A460] bg-[#FFF9F0] p-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row">
        <div>
          <h3 className="text-lg font-bold text-[#2D5016]">{solicitacao.estabelecimento}</h3>
          <p className="text-sm">{solicitacao.responsavel} · @{solicitacao.username}</p>
          <p className="text-sm text-muted-foreground">{solicitacao.telefone}{solicitacao.email ? ` · ${solicitacao.email}` : ""}</p>
          <p className="mt-1 text-xs text-muted-foreground">Solicitado em {new Date(solicitacao.createdAt).toLocaleString("pt-BR")}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div><Label>Identificador</Label><Input className="mt-1" value={slug} onChange={e => setSlug(gerarSlug(e.target.value))} /></div>
        <div><Label>Plano</Label><Select value={plano} onValueChange={v => setPlano(v as typeof plano)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="basico">Básico</SelectItem><SelectItem value="profissional">Profissional</SelectItem><SelectItem value="premium">Premium</SelectItem></SelectContent></Select></div>
        <div><Label>Mensalidade (R$)</Label><Input className="mt-1" type="number" min={0} value={mensalidade} onChange={e => setMensalidade(Number(e.target.value))} /></div>
        <div><Label>Dias de teste</Label><Input className="mt-1" type="number" min={0} max={90} value={diasTeste} onChange={e => setDiasTeste(Number(e.target.value))} /></div>
        <div><Label>Vencimento</Label><Input className="mt-1" type="date" value={assinaturaAte} onChange={e => setAssinaturaAte(e.target.value)} /></div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="destructive" disabled={processando} onClick={() => onRecusar(solicitacao.id)}><X size={16} className="mr-2" />Recusar</Button>
        <Button className="bg-[#2D5016]" disabled={processando || slug.length < 2} onClick={() => onAprovar({ id: solicitacao.id, slug, plano, valorMensalidade: mensalidade, diasTeste, assinaturaAte: assinaturaAte || null })}><Check size={16} className="mr-2" />Aprovar e cadastrar</Button>
      </div>
    </Card>
  );
}

function EmpresaCard({
  empresa,
  salvando,
  onSalvar,
}: {
  empresa: EmpresaPainel;
  salvando: boolean;
  onSalvar: (dados: {
    id: number;
    plano: EmpresaPainel["plano"];
    assinaturaStatus: EmpresaPainel["assinaturaStatus"];
    valorMensalidade: number;
    testeAte: string | null;
    assinaturaAte: string | null;
  }) => void;
}) {
  const [plano, setPlano] = useState(empresa.plano);
  const [situacao, setSituacao] = useState(empresa.assinaturaStatus);
  const [mensalidade, setMensalidade] = useState(empresa.valorMensalidade);
  const [testeAte, setTesteAte] = useState(dataInput(empresa.testeAte));
  const [assinaturaAte, setAssinaturaAte] = useState(dataInput(empresa.assinaturaAte));

  return (
    <Card className="p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#2D5016]/10 p-3 text-[#2D5016]"><Building2 /></div>
          <div><h2 className="text-lg font-bold">{empresa.nome}</h2><p className="text-sm text-muted-foreground">#{empresa.id} · {empresa.slug}</p></div>
        </div>
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-5">
          <div><Label>Plano</Label><Select value={plano} onValueChange={v => setPlano(v as typeof plano)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="basico">Básico</SelectItem><SelectItem value="profissional">Profissional</SelectItem><SelectItem value="premium">Premium</SelectItem></SelectContent></Select></div>
          <div><Label>Situação</Label><Select value={situacao} onValueChange={v => setSituacao(v as typeof situacao)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="teste">Em teste</SelectItem><SelectItem value="ativa">Ativa</SelectItem><SelectItem value="atrasada">Atrasada</SelectItem><SelectItem value="suspensa">Suspensa</SelectItem></SelectContent></Select></div>
          <div><Label>Mensalidade (R$)</Label><Input className="mt-1" type="number" min={0} step={1} value={mensalidade} onChange={e => setMensalidade(Number(e.target.value))} /></div>
          <div><Label>Teste até</Label><Input className="mt-1" type="date" value={testeAte} onChange={e => setTesteAte(e.target.value)} /></div>
          <div><Label>Assinatura até</Label><Input className="mt-1" type="date" value={assinaturaAte} onChange={e => setAssinaturaAte(e.target.value)} /></div>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button className="bg-[#2D5016]" disabled={salvando} onClick={() => onSalvar({
          id: empresa.id,
          plano,
          assinaturaStatus: situacao,
          valorMensalidade: mensalidade,
          testeAte: testeAte || null,
          assinaturaAte: assinaturaAte || null,
        })}>
          <Save size={16} className="mr-2" />{salvando ? "Salvando..." : "Salvar"}
        </Button>
      </div>
      <div className="mt-5 border-t pt-4">
        <p className="mb-2 text-sm font-bold text-[#2D5016]">Contas vinculadas</p>
        <div className="grid gap-2 md:grid-cols-2">
          {empresa.contas.map(conta => (
            <div key={conta.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <div className="flex items-center gap-2"><UserRound size={16} /><span><strong>{conta.name}</strong> · @{conta.username}</span></div>
              <span className={conta.active ? "text-green-700" : "text-red-600"}>{conta.role === "admin" ? "Administrador" : "Usuário"} · {conta.active ? "Ativa" : "Inativa"}</span>
            </div>
          ))}
          {empresa.contas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada.</p>}
        </div>
      </div>
    </Card>
  );
}

export default function Empresas() {
  const { logout } = useAuth();
  const utils = trpc.useUtils();
  const painel = trpc.empresas.painel.useQuery(undefined, {
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
  const empresas = {
    data: painel.data?.empresas,
    isLoading: painel.isLoading,
    isError: painel.isError,
    error: painel.error,
  };
  const solicitacoes = {
    data: painel.data?.solicitacoes,
    isLoading: painel.isLoading,
    isError: painel.isError,
    error: painel.error,
  };
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [plano, setPlano] = useState<"basico" | "profissional" | "premium">("basico");
  const [valorMensalidade, setValorMensalidade] = useState(0);
  const [diasTeste, setDiasTeste] = useState(7);
  const [adminNome, setAdminNome] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [protocoloBusca, setProtocoloBusca] = useState("");
  const localizar = trpc.cadastro.obter.useQuery(
    { id: Number(protocoloBusca) || 0 },
    { enabled: false, retry: false }
  );

  const criar = trpc.empresas.criar.useMutation({
    onSuccess: async () => {
      setNome(""); setSlug(""); setPlano("basico"); setValorMensalidade(0); setDiasTeste(7);
      setAdminNome(""); setAdminUsername(""); setAdminPassword("");
      await utils.empresas.painel.invalidate();
      toast.success("Estabelecimento criado");
    },
    onError: error => toast.error(error.message),
  });
  const atualizar = trpc.empresas.atualizar.useMutation({
    onSuccess: async () => {
      await utils.empresas.painel.invalidate();
      toast.success("Assinatura atualizada");
    },
    onError: error => toast.error(error.message),
  });
  const aprovar = trpc.cadastro.aprovar.useMutation({
    onSuccess: async () => {
      await utils.empresas.painel.invalidate();
      toast.success("Cliente aprovado e cadastrado");
    },
    onError: error => toast.error(error.message),
  });
  const recusar = trpc.cadastro.recusar.useMutation({
    onSuccess: async () => {
      await utils.empresas.painel.invalidate();
      toast.success("Solicitação recusada");
    },
    onError: error => toast.error(error.message),
  });
  const pendentesDaLista = solicitacoes.data?.filter(item => item.status === "pendente") ?? [];
  const localizada = localizar.data?.status === "pendente" ? localizar.data : null;
  const pendentes = localizada && !pendentesDaLista.some(item => item.id === localizada.id)
    ? [localizada, ...pendentesDaLista]
    : pendentesDaLista;

  return (
    <main className="min-h-screen bg-[#F7FAF5] p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C85A54]">Administração da plataforma</p>
            <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold text-[#2D5016]">
              Estabelecimentos e assinaturas
              {pendentes.length > 0 && <span className="flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-sm text-white"><Bell size={15} />{pendentes.length}</span>}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={async () => { await painel.refetch(); toast.success("Solicitações atualizadas"); }}>
              <RefreshCw size={17} className={`mr-2 ${painel.isFetching ? "animate-spin" : ""}`} />Buscar solicitações
            </Button>
            <Button variant="outline" onClick={() => logout()}><LogOut size={17} className="mr-2" />Sair</Button>
          </div>
        </div>

        <section className="mb-7">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-[#2D5016]"><Bell size={20} />Solicitações de primeiro acesso</h2>
          <Card className="mb-3 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label>Localizar pelo protocolo</Label>
                <Input className="mt-1" type="number" min={1} placeholder="Ex.: 1" value={protocoloBusca} onChange={e => setProtocoloBusca(e.target.value)} />
              </div>
              <Button variant="outline" disabled={!Number(protocoloBusca) || localizar.isFetching} onClick={() => localizar.refetch()}>
                {localizar.isFetching ? "Localizando..." : "Localizar protocolo"}
              </Button>
            </div>
            {localizar.isError && <p className="mt-2 text-sm text-red-600">{localizar.error.message}</p>}
            {localizar.data && localizar.data.status !== "pendente" && (
              <p className="mt-2 text-sm text-muted-foreground">O protocolo #{localizar.data.id} está com situação: {localizar.data.status}.</p>
            )}
          </Card>
          <div className="grid gap-3">
            {solicitacoes.isLoading && <Card className="p-5 text-muted-foreground">Verificando novas solicitações...</Card>}
            {solicitacoes.isError && <Card className="border-red-200 bg-red-50 p-5 text-red-700">Erro ao carregar solicitações: {solicitacoes.error.message}</Card>}
            {pendentes.map(solicitacao => <SolicitacaoCard key={solicitacao.id} solicitacao={solicitacao} processando={aprovar.isPending || recusar.isPending} onAprovar={dados => aprovar.mutate(dados)} onRecusar={id => recusar.mutate({ id })} />)}
            {!solicitacoes.isLoading && pendentes.length === 0 && <Card className="p-5 text-sm text-muted-foreground">Nenhuma solicitação pendente.</Card>}
          </div>
        </section>

        <Card className="p-5 md:p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-[#2D5016]"><Plus size={20} />Novo estabelecimento</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div><Label>Nome do estabelecimento</Label><Input className="mt-2" value={nome} onChange={e => { setNome(e.target.value); if (!slug) setSlug(gerarSlug(e.target.value)); }} /></div>
            <div><Label>Identificador</Label><Input className="mt-2" value={slug} onChange={e => setSlug(gerarSlug(e.target.value))} placeholder="nome-da-loja" /></div>
            <div><Label>Plano</Label><Select value={plano} onValueChange={v => setPlano(v as typeof plano)}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="basico">Básico</SelectItem><SelectItem value="profissional">Profissional</SelectItem><SelectItem value="premium">Premium</SelectItem></SelectContent></Select></div>
            <div><Label>Mensalidade (R$)</Label><Input className="mt-2" type="number" min={0} step={1} value={valorMensalidade} onChange={e => setValorMensalidade(Number(e.target.value))} /></div>
            <div><Label>Dias de teste</Label><Input className="mt-2" type="number" min={0} max={90} value={diasTeste} onChange={e => setDiasTeste(Number(e.target.value))} /></div>
            <div><Label>Nome do administrador</Label><Input className="mt-2" value={adminNome} onChange={e => setAdminNome(e.target.value)} /></div>
            <div><Label>Usuário do administrador</Label><Input className="mt-2" value={adminUsername} onChange={e => setAdminUsername(e.target.value)} /></div>
            <div><Label>Senha inicial</Label><Input className="mt-2" type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} /></div>
          </div>
          <Button
            className="mt-5 bg-[#2D5016]"
            disabled={criar.isPending || nome.length < 2 || slug.length < 2 || adminNome.length < 2 || adminUsername.length < 3 || adminPassword.length < 6}
            onClick={() => criar.mutate({ nome, slug, plano, valorMensalidade, diasTeste, adminNome, adminUsername, adminPassword })}
          >
            {criar.isPending ? "Criando..." : "Cadastrar estabelecimento"}
          </Button>
        </Card>

        <div className="mt-7 grid gap-4">
          {empresas.isLoading && <Card className="p-8 text-center text-muted-foreground">Carregando estabelecimentos e contas...</Card>}
          {empresas.isError && <Card className="border-red-200 bg-red-50 p-8 text-center text-red-700">Não foi possível carregar as contas: {empresas.error.message}</Card>}
          {empresas.data?.map(empresa => <EmpresaCard key={empresa.id} empresa={empresa} salvando={atualizar.isPending} onSalvar={dados => atualizar.mutate(dados)} />)}
          {empresas.data?.length === 0 && <Card className="p-8 text-center text-muted-foreground">Nenhum estabelecimento cadastrado.</Card>}
        </div>
      </div>
    </main>
  );
}
