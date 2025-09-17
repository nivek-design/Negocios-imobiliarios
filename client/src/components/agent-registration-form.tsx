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
import { Loader2, User } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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

// Zod validation schema factory that accepts translation function
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

interface AgentRegistrationFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AgentRegistrationForm({ 
  isOpen, 
  onClose 
}: AgentRegistrationFormProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create schema with translation context
  const agentRegistrationSchema = createAgentRegistrationSchema(t);
  type AgentRegistrationFormData = z.infer<typeof agentRegistrationSchema>;

  const form = useForm<AgentRegistrationFormData>({
    resolver: zodResolver(agentRegistrationSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      profileImageUrl: "",
    },
  });

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
      
      form.reset();
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

  const onSubmit = (data: AgentRegistrationFormData) => {
    registerAgentMutation.mutate(data);
  };

  const handleClose = () => {
    if (!registerAgentMutation.isPending) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t("agentRegister.title")}
          </DialogTitle>
          <DialogDescription>
            {t("agentRegister.subtitle")}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* First Name Field */}
            <FormField
              control={form.control}
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
              control={form.control}
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
              control={form.control}
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
              control={form.control}
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
      </DialogContent>
    </Dialog>
  );
}