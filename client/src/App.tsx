import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Historico from "./pages/Historico";
import DetalhesFechamento from "./pages/DetalhesFechamento";
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
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Login />;

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
