import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Historico from "./pages/Historico";
import DetalhesFechamento from "./pages/DetalhesFechamento";
import PainelPedidos from "./pages/PainelPedidos";
import Empresas from "./pages/Empresas";
import Login from "./pages/Login";
import { useAuth } from "./_core/hooks/useAuth";

function Router() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/historico"}>{isAdmin ? <Historico /> : <Home />}</Route>
      <Route path={"/detalhes-fechamento"}>{isAdmin ? <DetalhesFechamento /> : <Home />}</Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  const { user, loading, logout } = useAuth();
  if (window.location.pathname.startsWith("/admin-plataforma")) {
    if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando...</div>;
    return (
      <ErrorBoundary>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster />
            {!user ? (
              <Login plataforma />
            ) : user.platformAdmin ? (
              <Empresas />
            ) : (
              <div className="min-h-screen grid place-items-center bg-[#F7FAF5] p-4">
                <div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-lg">
                  <h1 className="text-2xl font-bold text-[#C85A54]">Acesso não autorizado</h1>
                  <p className="mt-3 text-muted-foreground">Esta área é exclusiva do administrador da plataforma.</p>
                  <button className="mt-6 rounded-lg bg-[#2D5016] px-5 py-2 font-semibold text-white" onClick={() => logout()}>Sair</button>
                </div>
              </div>
            )}
          </TooltipProvider>
        </ThemeProvider>
      </ErrorBoundary>
    );
  }
  if (window.location.pathname === "/painel-pedidos") {
    return (
      <ErrorBoundary>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <PainelPedidos />
          </TooltipProvider>
        </ThemeProvider>
      </ErrorBoundary>
    );
  }
  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Login />;
  const agora = new Date();
  const prazoExpirado =
    (user.assinaturaStatus === "teste" && user.testeAte && new Date(user.testeAte) < agora) ||
    (user.assinaturaStatus === "ativa" && user.assinaturaAte && new Date(user.assinaturaAte) < agora);
  if (!user.platformAdmin && (
    user.assinaturaStatus === "atrasada" ||
    user.assinaturaStatus === "suspensa" ||
    prazoExpirado
  )) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#F7FAF5] p-4">
        <div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-bold text-[#C85A54]">Assinatura indisponível</h1>
          <p className="mt-3 text-muted-foreground">A assinatura de {user.empresaNome || "seu estabelecimento"} está vencida ou suspensa. Entre em contato com o suporte.</p>
          <button className="mt-6 rounded-lg bg-[#2D5016] px-5 py-2 font-semibold text-white" onClick={() => logout()}>Sair</button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
