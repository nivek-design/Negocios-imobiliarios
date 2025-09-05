import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useI18n } from "@/contexts/I18nContext";
import type { InsertInquiry } from "@shared/schema";

interface InquiryFormProps {
  propertyId: string;
  propertyTitle: string;
}

export default function InquiryForm({ propertyId, propertyTitle }: InquiryFormProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: "",
  });

  const createInquiryMutation = useMutation({
    mutationFn: async (data: InsertInquiry) => {
      await apiRequest("POST", "/api/inquiries", data);
    },
    onSuccess: () => {
      toast({
        title: t('inquiry.success'),
        description: t('inquiry.successMessage'),
      });
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        message: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/inquiries"] });
    },
    onError: (error) => {
      toast({
        title: t('inquiry.error'),
        description: t('inquiry.errorMessage'),
        variant: "destructive",
      });
      console.error("Error creating inquiry:", error);
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: t('inquiry.validationError'),
        description: t('inquiry.requiredFields'),
        variant: "destructive",
      });
      return;
    }

    createInquiryMutation.mutate({
      propertyId,
      ...formData,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle data-testid="text-inquiry-form-title">{t('inquiry.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">{t('inquiry.firstName')}</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Nome"
                required
                data-testid="input-first-name"
              />
            </div>
            <div>
              <Label htmlFor="lastName">{t('inquiry.lastName')}</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Sobrenome"
                required
                data-testid="input-last-name"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="email">{t('inquiry.email')}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Endereço de Email"
              required
              data-testid="input-email"
            />
          </div>
          
          <div>
            <Label htmlFor="phone">{t('inquiry.phone')}</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Número de Telefone"
              data-testid="input-phone"
            />
          </div>
          
          <div>
            <Label htmlFor="message">{t('inquiry.message')}</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              placeholder={t('inquiry.messagePlaceholder').replace('{title}', propertyTitle)}
              rows={3}
              data-testid="textarea-message"
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={createInquiryMutation.isPending}
            className="w-full"
            data-testid="button-send-inquiry"
          >
            {createInquiryMutation.isPending ? t('inquiry.sending') : t('inquiry.send')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
