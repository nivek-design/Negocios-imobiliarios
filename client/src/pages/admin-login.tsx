import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eye, EyeOff, Loader2, Home, Shield, KeyRound, Mail, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const returnTo = new URLSearchParams(window.location.search).get('returnTo');
      setLocation(returnTo || '/dashboard');
    }
  }, [isAuthenticated, setLocation]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string; rememberMe: boolean }) => {
      setIsLoading(true);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro no login");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      setError("");
      setIsLoading(false);
      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo, ${data.user?.firstName || 'usuário'}!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Redirect to return URL or dashboard
      const returnTo = new URLSearchParams(window.location.search).get('returnTo');
      setTimeout(() => {
        setLocation(returnTo || '/dashboard');
      }, 1000);
    },
    onError: (error: any) => {
      setIsLoading(false);
      setError(error.message || "Credenciais inválidas. Tente novamente.");
      toast({
        title: "Erro no login",
        description: error.message || "Credenciais inválidas. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      // Simulate forgot password request
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { message: "Email enviado com sucesso" };
    },
    onSuccess: () => {
      setForgotPasswordSent(true);
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao enviar email",
        description: "Tente novamente em alguns minutos.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!formData.email || !formData.password) {
      setError("Por favor, preencha email e senha.");
      return;
    }
    
    if (!formData.email.includes('@')) {
      setError("Por favor, insira um email válido.");
      return;
    }
    
    if (formData.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    
    loginMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(""); // Clear error when user starts typing
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-primary/10 p-3 rounded-full">
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="text-muted-foreground">Entre com suas credenciais para acessar o sistema</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">Login do Corretor</CardTitle>
            <CardDescription className="text-center">
              Acesse o painel de gestão de propriedades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  data-testid="input-admin-email"
                  className="h-11"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    data-testid="input-admin-password"
                    className="h-11 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={formData.rememberMe}
                    onChange={(e) => handleInputChange("rememberMe", e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="rememberMe" className="text-sm text-muted-foreground">
                    Lembrar-me por 30 dias
                  </Label>
                </div>
                
                <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
                  <DialogTrigger asChild>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-sm text-primary hover:underline p-0 h-auto"
                      data-testid="button-forgot-password"
                    >
                      Esqueci minha senha
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <KeyRound className="w-5 h-5 text-primary" />
                        Redefinir Senha
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      {!forgotPasswordSent ? (
                        <>
                          <p className="text-sm text-muted-foreground">
                            Digite seu email para receber instruções de redefinição de senha.
                          </p>
                          <div className="space-y-2">
                            <Label htmlFor="forgot-email">Email</Label>
                            <Input
                              id="forgot-email"
                              type="email"
                              placeholder="seu@email.com"
                              value={forgotPasswordEmail}
                              onChange={(e) => setForgotPasswordEmail(e.target.value)}
                              data-testid="input-forgot-email"
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              onClick={() => setShowForgotPassword(false)}
                              className="flex-1"
                            >
                              Cancelar
                            </Button>
                            <Button
                              onClick={() => forgotPasswordMutation.mutate(forgotPasswordEmail)}
                              disabled={!forgotPasswordEmail || forgotPasswordMutation.isPending}
                              className="flex-1"
                              data-testid="button-send-reset"
                            >
                              {forgotPasswordMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Enviando...
                                </>
                              ) : (
                                <>
                                  <Mail className="w-4 h-4 mr-2" />
                                  Enviar
                                </>
                              )}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center space-y-4">
                          <div className="flex justify-center">
                            <CheckCircle className="w-12 h-12 text-green-500" />
                          </div>
                          <div>
                            <h3 className="font-medium">Email enviado!</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                            </p>
                          </div>
                          <Button
                            onClick={() => {
                              setShowForgotPassword(false);
                              setForgotPasswordSent(false);
                              setForgotPasswordEmail("");
                            }}
                            className="w-full"
                          >
                            Fechar
                          </Button>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <Button
                type="submit"
                disabled={isLoading || loginMutation.isPending}
                className="w-full h-11 bg-primary hover:bg-primary/90"
                data-testid="button-admin-login"
              >
                {isLoading || loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Entrar no Painel
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <Card className="border-dashed bg-muted/30">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium">Credenciais de teste:</p>
              <div className="space-y-1 text-xs">
                <p><strong>Corretor:</strong> corretor@premier.com | 123456</p>
                <p><strong>Admin:</strong> admin@premier.com | admin123</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/')}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-back-home"
          >
            <Home className="w-4 h-4 mr-2" />
            Voltar ao site
          </Button>
        </div>
      </div>
    </div>
  );
}