import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nContext";
import { Eye, EyeOff, Loader2, User, LogIn } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Custom error map for translating Zod messages
const createErrorMap = (t: (key: string) => string): z.ZodErrorMap => {
  return (issue, ctx) => {
    switch (issue.code) {
      case z.ZodIssueCode.invalid_type:
        if (issue.expected === "string") {
          return { message: t("agentRegister.requiredFields") };
        }
        break;
      case z.ZodIssueCode.too_small:
        if (issue.path.includes("email")) {
          return { message: t("agentRegister.emailInvalid") };
        }
        if (issue.path.includes("firstName")) {
          return { message: t("agentRegister.firstNameTooShort") };
        }
        if (issue.path.includes("lastName")) {
          return { message: t("agentRegister.lastNameTooShort") };
        }
        break;
      case z.ZodIssueCode.too_big:
        if (issue.path.includes("firstName")) {
          return { message: t("agentRegister.firstNameTooLong") };
        }
        if (issue.path.includes("lastName")) {
          return { message: t("agentRegister.lastNameTooLong") };
        }
        break;
      case z.ZodIssueCode.invalid_string:
        if (issue.validation === "email") {
          return { message: t("agentRegister.emailInvalid") };
        }
        if (issue.validation === "url") {
          return { message: t("agentRegister.urlInvalid") };
        }
        break;
    }
    return { message: ctx.defaultError };
  };
};

// Zod validation schema factory for agent registration
const createAgentRegistrationSchema = (t: (key: string) => string) => {
  return z.object(
    {
      email: z
        .string()
        .min(1)
        .email(),
      firstName: z
        .string()
        .min(1)
        .max(50),
      lastName: z
        .string()
        .min(1)
        .max(50),
      profileImageUrl: z
        .string()
        .url()
        .optional()
        .or(z.literal("")),
    },
    {
      errorMap: createErrorMap(t),
    }
  );
};

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [activeTab, setActiveTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loginFormData, setLoginFormData] = useState({
    email: "",
    password: "",
  });
  
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Agent registration schema and form
  const agentRegistrationSchema = createAgentRegistrationSchema(t);
  type AgentRegistrationFormData = z.infer<typeof agentRegistrationSchema>;

  const registrationForm = useForm<AgentRegistrationFormData>({
    resolver: zodResolver(agentRegistrationSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      profileImageUrl: "",
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t("loginModal.loginInvalidCredentials"));
      }
      
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: t("loginModal.loginSuccess"),
        description: t("loginModal.loginRedirecting"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onClose();
      setLoginFormData({ email: "", password: "" });
      
      // Redirecionar para autenticação do Replit
      if (data.redirectToReplit && data.replitAuthUrl) {
        window.location.href = data.replitAuthUrl;
      } else {
        window.location.reload();
      }
    },
    onError: (error: any) => {
      toast({
        title: t("loginModal.loginError"),
        description: error.message || t("loginModal.loginInvalidCredentials"),
        variant: "destructive",
      });
    },
  });

  // Registration mutation
  const registerAgentMutation = useMutation({
    mutationFn: async (data: AgentRegistrationFormData) => {
      // Remove empty profileImageUrl to match backend expectations
      const submitData = {
        ...data,
        profileImageUrl: data.profileImageUrl || undefined,
      };

      const response = await apiRequest("POST", "/api/auth/register-agent", submitData);
      
      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(errorData.message || t("agentRegister.genericError"));
        (error as any).status = response.status;
        throw error;
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: t("agentRegister.success"),
        description: data.message || t("agentRegister.successMessage"),
      });
      
      registrationForm.reset();
      onClose();
      
      // Invalidate relevant queries if needed
      queryClient.invalidateQueries({ queryKey: ["/api/auth"] });
    },
    onError: (error: any) => {
      console.error("Agent registration error:", error);
      
      let errorMessage = t("agentRegister.genericError");
      
      // Handle specific HTTP status codes
      if (error.status === 409) {
        errorMessage = t("agentRegister.emailDuplicate");
      } else if (error.status === 400) {
        errorMessage = t("agentRegister.validationError");
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: t("agentRegister.error"),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginFormData.email || !loginFormData.password) {
      toast({
        title: t("loginModal.loginRequiredFields"),
        description: t("loginModal.loginFillFields"),
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate(loginFormData);
  };

  const handleRegistrationSubmit = (data: AgentRegistrationFormData) => {
    registerAgentMutation.mutate(data);
  };

  const handleLoginInputChange = (field: string, value: string) => {
    setLoginFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    if (!loginMutation.isPending && !registerAgentMutation.isPending) {
      setLoginFormData({ email: "", password: "" });
      registrationForm.reset();
      setActiveTab("login");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t("loginModal.title")}
          </DialogTitle>
          <DialogDescription>
            {t("loginModal.description")}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger 
              value="login" 
              className="flex items-center gap-2"
              data-testid="tab-login"
            >
              <LogIn className="h-4 w-4" />
              {t("loginModal.tabLogin")}
            </TabsTrigger>
            <TabsTrigger 
              value="register" 
              className="flex items-center gap-2"
              data-testid="tab-register"
            >
              <User className="h-4 w-4" />
              {t("loginModal.tabRegister")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4 mt-4">
            <div className="space-y-2">
              <h4 className="font-medium">{t("loginModal.loginTitle")}</h4>
              <p className="text-sm text-muted-foreground">
                {t("loginModal.loginDescription")}
              </p>
            </div>
            
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">{t("loginModal.loginEmail")}</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder={t("loginModal.loginEmailPlaceholder")}
                  value={loginFormData.email}
                  onChange={(e) => handleLoginInputChange("email", e.target.value)}
                  data-testid="input-login-email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">{t("loginModal.loginPassword")}</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("loginModal.loginPasswordPlaceholder")}
                    value={loginFormData.password}
                    onChange={(e) => handleLoginInputChange("password", e.target.value)}
                    data-testid="input-login-password"
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
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  data-testid="button-cancel-login"
                >
                  {t("loginModal.loginCancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="flex-1"
                  data-testid="button-submit-login"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("loginModal.loginSubmitting")}
                    </>
                  ) : (
                    t("loginModal.loginSubmit")
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="register" className="space-y-4 mt-4">
            <div className="space-y-2">
              <h4 className="font-medium">{t("agentRegister.title")}</h4>
              <p className="text-sm text-muted-foreground">
                {t("agentRegister.subtitle")}
              </p>
            </div>

            <Form {...registrationForm}>
              <form onSubmit={registrationForm.handleSubmit(handleRegistrationSubmit)} className="space-y-4">
                {/* First Name Field */}
                <FormField
                  control={registrationForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("agentRegister.firstName")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("agentRegister.firstNamePlaceholder")}
                          {...field}
                          data-testid="input-register-firstname"
                          disabled={registerAgentMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Last Name Field */}
                <FormField
                  control={registrationForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("agentRegister.lastName")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("agentRegister.lastNamePlaceholder")}
                          {...field}
                          data-testid="input-register-lastname"
                          disabled={registerAgentMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email Field */}
                <FormField
                  control={registrationForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("agentRegister.email")}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t("agentRegister.emailPlaceholder")}
                          {...field}
                          data-testid="input-register-email"
                          disabled={registerAgentMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Profile Image URL Field (Optional) */}
                <FormField
                  control={registrationForm.control}
                  name="profileImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("agentRegister.profileImageUrl")}</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder={t("agentRegister.profileImagePlaceholder")}
                          {...field}
                          data-testid="input-register-profile-image"
                          disabled={registerAgentMutation.isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("agentRegister.profileImageDescription")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Form Actions */}
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1"
                    disabled={registerAgentMutation.isPending}
                    data-testid="button-cancel-register"
                  >
                    {t("agentRegister.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={registerAgentMutation.isPending}
                    className="flex-1"
                    data-testid="button-submit-register"
                  >
                    {registerAgentMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("agentRegister.submitting")}
                      </>
                    ) : (
                      t("agentRegister.submit")
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}