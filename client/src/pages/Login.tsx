import { FormEvent, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { setSessionToken } from "@/lib/auth-session";

export default function Login({ plataforma = false }: { plataforma?: boolean }) {
  const [primeiroAcesso, setPrimeiroAcesso] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [estabelecimento, setEstabelecimento] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const utils = trpc.useUtils();
  const login = trpc.auth.login.useMutation({
    onSuccess: async result => {
      setSessionToken(result.token);
      utils.auth.me.setData(undefined, result.user);
      const vencimento = result.user.assinaturaStatus === "teste" ? result.user.testeAte : result.user.assinaturaAte;
      if (!plataforma && vencimento) {
        toast.info(
          `${result.user.assinaturaStatus === "teste" ? "Teste válido" : "Assinatura válida"} até ${new Date(vencimento).toLocaleDateString("pt-BR")}${
            result.user.valorMensalidade > 0
              ? ` · Mensalidade: ${result.user.valorMensalidade.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
              : ""
          }`
        );
      }
      await utils.auth.me.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const solicitar = trpc.cadastro.solicitar.useMutation({
    onSuccess: () => {
      toast.success("Solicitação enviada. Aguarde a aprovação para entrar.");
      setPrimeiroAcesso(false);
      setEstabelecimento(""); setResponsavel(""); setTelefone(""); setEmail(""); setPassword("");
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate({ username: username.trim(), password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7FAF5] p-4">
      <Card className={`w-full ${primeiroAcesso ? "max-w-2xl" : "max-w-sm"} p-7 shadow-lg`}>
        <div className="text-center mb-7">
          <div className="text-5xl mb-2">🥤</div>
          <h1 className="text-3xl font-bold text-[#2D5016]">{plataforma ? "Administração da Plataforma" : "World Guaraná"}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {plataforma ? "Acesso exclusivo do proprietário" : "Entre para acessar o sistema"}
          </p>
        </div>
        {primeiroAcesso && !plataforma ? (
          <form
            className="space-y-5"
            onSubmit={event => {
              event.preventDefault();
              solicitar.mutate({ estabelecimento, responsavel, telefone, email, username: username.trim(), password });
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Estabelecimento</Label><Input className="mt-2" value={estabelecimento} onChange={e => setEstabelecimento(e.target.value)} autoFocus /></div>
              <div><Label>Responsável</Label><Input className="mt-2" value={responsavel} onChange={e => setResponsavel(e.target.value)} /></div>
              <div><Label>Telefone/WhatsApp</Label><Input className="mt-2" value={telefone} onChange={e => setTelefone(e.target.value)} /></div>
              <div><Label>E-mail (opcional)</Label><Input className="mt-2" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div><Label>Crie seu usuário</Label><Input className="mt-2" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" /></div>
              <div><Label>Crie sua senha</Label><Input className="mt-2" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" /></div>
            </div>
            <Button type="submit" disabled={solicitar.isPending || estabelecimento.length < 2 || responsavel.length < 2 || telefone.length < 8 || username.length < 3 || password.length < 6} className="w-full bg-[#2D5016]">
              {solicitar.isPending ? "Enviando..." : "Solicitar primeiro acesso"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setPrimeiroAcesso(false)}>Voltar para o login</Button>
          </form>
        ) : (
        <form onSubmit={submit} className="space-y-5">
          <div>
            <Label htmlFor="login-user">Usuário</Label>
            <Input id="login-user" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" autoFocus className="mt-2" />
          </div>
          <div>
            <Label htmlFor="login-password">Senha</Label>
            <Input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" className="mt-2" />
          </div>
          <Button type="submit" disabled={login.isPending || !username || !password} className="w-full bg-[#2D5016] hover:bg-[#1A3A0A]">
            {login.isPending ? "Entrando..." : "Entrar"}
          </Button>
          {!plataforma && (
            <Button type="button" variant="outline" className="w-full" onClick={() => setPrimeiroAcesso(true)}>
              Primeiro acesso
            </Button>
          )}
        </form>
        )}
      </Card>
    </div>
  );
}
