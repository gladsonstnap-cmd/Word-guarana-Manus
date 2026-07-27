import { FormEvent, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const utils = trpc.useUtils();
  const login = trpc.auth.login.useMutation({
    onSuccess: async user => {
      utils.auth.me.setData(undefined, user);
      await utils.auth.me.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate({ username: username.trim(), password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7FAF5] p-4">
      <Card className="w-full max-w-sm p-7 shadow-lg">
        <div className="text-center mb-7">
          <div className="text-5xl mb-2">🥤</div>
          <h1 className="text-3xl font-bold text-[#2D5016]">World Guaraná</h1>
          <p className="text-sm text-muted-foreground mt-2">Entre para acessar o sistema</p>
        </div>
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
        </form>
      </Card>
    </div>
  );
}
