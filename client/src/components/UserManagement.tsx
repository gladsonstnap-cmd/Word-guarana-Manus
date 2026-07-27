import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export default function UserManagement() {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const utils = trpc.useUtils();
  const users = trpc.usuarios.listar.useQuery();
  const create = trpc.usuarios.criar.useMutation({
    onSuccess: async () => {
      setUsername(""); setName(""); setPassword(""); setRole("user");
      await utils.usuarios.listar.invalidate();
      toast.success("Usuário criado");
    },
    onError: error => toast.error(error.message),
  });
  const update = trpc.usuarios.atualizar.useMutation({
    onSuccess: async () => utils.usuarios.listar.invalidate(),
    onError: error => toast.error(error.message),
  });
  const remove = trpc.usuarios.deletar.useMutation({
    onSuccess: async () => {
      await utils.usuarios.listar.invalidate();
      toast.success("Usuário excluído");
    },
    onError: error => toast.error(error.message),
  });

  return (
    <Card className="mt-6 p-5 md:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C85A54]">Acessos</p>
      <h2 className="text-2xl font-bold text-[#2D5016] mt-1">Usuários e permissões</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-5">Usuários comuns acessam somente cadastro de clientes, pedidos e andamento.</p>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} className="mt-2" /></div>
        <div><Label>Usuário</Label><Input value={username} onChange={e => setUsername(e.target.value)} className="mt-2" /></div>
        <div><Label>Senha</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2" /></div>
        <div><Label>Perfil</Label><Select value={role} onValueChange={v => setRole(v as "user" | "admin")}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="user">Usuário comum</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent></Select></div>
        <Button onClick={() => create.mutate({ username, name, password, role })} disabled={create.isPending || username.length < 3 || name.length < 2 || password.length < 6} className="bg-[#2D5016]">Adicionar</Button>
      </div>
      <div className="mt-6 space-y-2">
        {users.data?.map(user => (
          <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div><strong>{user.name}</strong><span className="text-muted-foreground ml-2">@{user.username}</span></div>
            <div className="flex items-center gap-2">
              <span className="text-sm">{user.role === "admin" ? "Administrador" : "Usuário comum"}</span>
              <Button size="sm" variant="outline" onClick={() => update.mutate({ id: user.id, active: !user.active })}>
                {user.active ? "Desativar" : "Ativar"}
              </Button>
              {user.role === "user" && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm(`Excluir o usuário ${user.name}?`)) remove.mutate({ id: user.id });
                  }}
                  disabled={remove.isPending}
                  className="gap-1"
                >
                  <Trash2 size={14} /> Excluir
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
