import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Building2, Plus } from "lucide-react";
import { toast } from "sonner";

const dataInput = (value: Date | string | null) => {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
};

export default function Empresas() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const empresas = trpc.empresas.listar.useQuery();
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [plano, setPlano] = useState<"basico" | "profissional" | "premium">("basico");
  const [diasTeste, setDiasTeste] = useState(7);
  const [adminNome, setAdminNome] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const criar = trpc.empresas.criar.useMutation({
    onSuccess: async () => {
      setNome(""); setSlug(""); setPlano("basico"); setDiasTeste(7);
      setAdminNome(""); setAdminUsername(""); setAdminPassword("");
      await utils.empresas.listar.invalidate();
      toast.success("Estabelecimento criado");
    },
    onError: error => toast.error(error.message),
  });
  const atualizar = trpc.empresas.atualizar.useMutation({
    onSuccess: async () => {
      await utils.empresas.listar.invalidate();
      toast.success("Assinatura atualizada");
    },
    onError: error => toast.error(error.message),
  });

  const gerarSlug = (texto: string) => texto
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    <main className="min-h-screen bg-[#F7FAF5] p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C85A54]">Administração da plataforma</p>
            <h1 className="mt-1 text-3xl font-bold text-[#2D5016]">Estabelecimentos e assinaturas</h1>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}><ArrowLeft size={17} className="mr-2" />Voltar</Button>
        </div>

        <Card className="p-5 md:p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-[#2D5016]"><Plus size={20} />Novo estabelecimento</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div><Label>Nome do estabelecimento</Label><Input className="mt-2" value={nome} onChange={e => { setNome(e.target.value); if (!slug) setSlug(gerarSlug(e.target.value)); }} /></div>
            <div><Label>Identificador</Label><Input className="mt-2" value={slug} onChange={e => setSlug(gerarSlug(e.target.value))} placeholder="nome-da-loja" /></div>
            <div><Label>Plano</Label><Select value={plano} onValueChange={v => setPlano(v as typeof plano)}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="basico">Básico</SelectItem><SelectItem value="profissional">Profissional</SelectItem><SelectItem value="premium">Premium</SelectItem></SelectContent></Select></div>
            <div><Label>Dias de teste</Label><Input className="mt-2" type="number" min={0} max={90} value={diasTeste} onChange={e => setDiasTeste(Number(e.target.value))} /></div>
            <div><Label>Nome do administrador</Label><Input className="mt-2" value={adminNome} onChange={e => setAdminNome(e.target.value)} /></div>
            <div><Label>Usuário do administrador</Label><Input className="mt-2" value={adminUsername} onChange={e => setAdminUsername(e.target.value)} /></div>
            <div><Label>Senha inicial</Label><Input className="mt-2" type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} /></div>
          </div>
          <Button
            className="mt-5 bg-[#2D5016]"
            disabled={criar.isPending || nome.length < 2 || slug.length < 2 || adminNome.length < 2 || adminUsername.length < 3 || adminPassword.length < 6}
            onClick={() => criar.mutate({ nome, slug, plano, diasTeste, adminNome, adminUsername, adminPassword })}
          >
            {criar.isPending ? "Criando..." : "Cadastrar estabelecimento"}
          </Button>
        </Card>

        <div className="mt-7 grid gap-4">
          {empresas.data?.map(empresa => (
            <Card key={empresa.id} className="p-5">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-[#2D5016]/10 p-3 text-[#2D5016]"><Building2 /></div>
                  <div><h2 className="text-lg font-bold">{empresa.nome}</h2><p className="text-sm text-muted-foreground">#{empresa.id} · {empresa.slug}</p></div>
                </div>
                <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-4">
                  <div><Label>Plano</Label><Select value={empresa.plano} onValueChange={plano => atualizar.mutate({ id: empresa.id, plano: plano as typeof empresa.plano })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="basico">Básico</SelectItem><SelectItem value="profissional">Profissional</SelectItem><SelectItem value="premium">Premium</SelectItem></SelectContent></Select></div>
                  <div><Label>Situação</Label><Select value={empresa.assinaturaStatus} onValueChange={assinaturaStatus => atualizar.mutate({ id: empresa.id, assinaturaStatus: assinaturaStatus as typeof empresa.assinaturaStatus })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="teste">Em teste</SelectItem><SelectItem value="ativa">Ativa</SelectItem><SelectItem value="atrasada">Atrasada</SelectItem><SelectItem value="suspensa">Suspensa</SelectItem></SelectContent></Select></div>
                  <div><Label>Teste até</Label><Input className="mt-1" type="date" defaultValue={dataInput(empresa.testeAte)} onBlur={e => atualizar.mutate({ id: empresa.id, testeAte: e.target.value || null })} /></div>
                  <div><Label>Assinatura até</Label><Input className="mt-1" type="date" defaultValue={dataInput(empresa.assinaturaAte)} onBlur={e => atualizar.mutate({ id: empresa.id, assinaturaAte: e.target.value || null })} /></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
