import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { 
  CheckCircle, 
  XCircle, 
  Calendar, 
  Mail, 
  User, 
  RefreshCw, 
  AlertTriangle,
  Clock,
  Shield
} from "lucide-react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Validation schema for rejection form
const rejectionSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(10, "admin.pendingRegistrations.rejectionReasonMinLength")
    .max(500, "admin.pendingRegistrations.rejectionReasonMaxLength")
});

type RejectionFormData = z.infer<typeof rejectionSchema>;

interface PendingUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  profileImageUrl?: string;
}

interface PendingRegistrationsResponse {
  users: PendingUser[];
  message: string;
}

export default function AdminPendingRegistrations() {
  const { t, language } = useI18n();
  const { toast } = useToast();
  const [selectedUserForRejection, setSelectedUserForRejection] = useState<PendingUser | null>(null);
  const [userToApprove, setUserToApprove] = useState<PendingUser | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Get appropriate date locale
  const getDateLocale = () => {
    switch (language) {
      case 'pt-br': return ptBR;
      case 'es': return es;
      default: return enUS;
    }
  };

  // Fetch pending registrations
  const {
    data: pendingData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/auth/admin/pending-registrations'],
    select: (data: PendingRegistrationsResponse) => data
  });

  // Approval mutation
  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('POST', `/api/auth/admin/approve-registration/${userId}`);
      return response.json();
    },
    onSuccess: (data, userId) => {
      const user = pendingData?.users.find(u => u.id === userId);
      toast({
        title: t("admin.pendingRegistrations.approved"),
        description: user ? `${user.firstName} ${user.lastName}` : "",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/admin/pending-registrations'] });
      setUserToApprove(null);
    },
    onError: (error: any) => {
      toast({
        title: t("admin.pendingRegistrations.approvalError"),
        description: error?.message || "Erro desconhecido",
        variant: "destructive"
      });
      setUserToApprove(null);
    }
  });

  // Rejection mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ userId, rejectionReason }: { userId: string; rejectionReason: string }) => {
      const response = await apiRequest('POST', `/api/auth/admin/reject-registration/${userId}`, {
        rejectionReason
      });
      return response.json();
    },
    onSuccess: (data, { userId }) => {
      const user = pendingData?.users.find(u => u.id === userId);
      toast({
        title: t("admin.pendingRegistrations.rejected"),
        description: user ? `${user.firstName} ${user.lastName}` : "",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/admin/pending-registrations'] });
      setSelectedUserForRejection(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t("admin.pendingRegistrations.rejectionError"),
        description: error?.message || "Erro desconhecido",
        variant: "destructive"
      });
    }
  });

  // Form for rejection
  const form = useForm<RejectionFormData>({
    resolver: zodResolver(rejectionSchema),
    defaultValues: {
      rejectionReason: ""
    }
  });

  const handleApprove = (user: PendingUser) => {
    setUserToApprove(user);
  };

  const confirmApproval = () => {
    if (userToApprove) {
      approveMutation.mutate(userToApprove.id);
    }
  };

  const handleReject = (user: PendingUser) => {
    setSelectedUserForRejection(user);
    form.reset();
  };

  const onSubmitRejection = (data: RejectionFormData) => {
    if (selectedUserForRejection) {
      rejectMutation.mutate({
        userId: selectedUserForRejection.id,
        rejectionReason: data.rejectionReason
      });
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: getDateLocale() });
    } catch {
      return dateString;
    }
  };

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'agent': return 'default';
      case 'admin': return 'secondary';
      default: return 'outline';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="admin-pending-registrations-loading">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">{t("admin.pendingRegistrations.loading")}</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="admin-pending-registrations-error">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">{t("admin.pendingRegistrations.loadingError")}</h3>
                <p className="text-muted-foreground">{error.message}</p>
              </div>
              <Button onClick={handleRefresh} data-testid="button-retry">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t("admin.pendingRegistrations.tryAgain")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingUsers = pendingData?.users || [];

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="admin-pending-registrations">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold" data-testid="title-pending-registrations">
            {t("admin.pendingRegistrations.title")}
          </h1>
          <p className="text-muted-foreground" data-testid="subtitle-pending-registrations">
            {t("admin.pendingRegistrations.subtitle")}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span data-testid="text-last-updated">
              {t("admin.pendingRegistrations.lastUpdated")} {formatDate(lastUpdated.toISOString())}
            </span>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t("admin.pendingRegistrations.refreshData")}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("admin.pendingRegistrations.title")}
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="count-pending">
              {pendingUsers.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("admin.pendingRegistrations.count")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {pendingUsers.length === 0 ? (
        <Card data-testid="empty-state">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <Shield className="h-12 w-12 text-muted-foreground" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{t("admin.pendingRegistrations.noRegistrations")}</h3>
                <p className="text-muted-foreground">
                  Não há cadastros aguardando aprovação no momento.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>{pendingUsers.length} {t("admin.pendingRegistrations.count")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table data-testid="table-pending-registrations">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.pendingRegistrations.name")}</TableHead>
                  <TableHead>{t("admin.pendingRegistrations.email")}</TableHead>
                  <TableHead>{t("admin.pendingRegistrations.role")}</TableHead>
                  <TableHead>{t("admin.pendingRegistrations.registeredAt")}</TableHead>
                  <TableHead className="text-right">{t("admin.pendingRegistrations.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profileImageUrl} alt={`${user.firstName} ${user.lastName}`} />
                          <AvatarFallback>{getUserInitials(user.firstName, user.lastName)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium" data-testid={`text-name-${user.id}`}>
                          {user.firstName} {user.lastName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span data-testid={`text-email-${user.id}`}>{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)} data-testid={`badge-role-${user.id}`}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm" data-testid={`text-date-${user.id}`}>
                          {formatDate(user.createdAt)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApprove(user)}
                          disabled={approveMutation.isPending}
                          data-testid={`button-approve-${user.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {approveMutation.isPending && userToApprove?.id === user.id
                            ? t("admin.pendingRegistrations.approving")
                            : t("admin.pendingRegistrations.approve")
                          }
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(user)}
                          disabled={rejectMutation.isPending}
                          data-testid={`button-reject-${user.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          {rejectMutation.isPending && selectedUserForRejection?.id === user.id
                            ? t("admin.pendingRegistrations.rejecting")
                            : t("admin.pendingRegistrations.reject")
                          }
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Approval Confirmation Dialog */}
      <AlertDialog open={!!userToApprove} onOpenChange={() => setUserToApprove(null)}>
        <AlertDialogContent data-testid="dialog-approve-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Aprovação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja aprovar o cadastro de{" "}
              <strong>{userToApprove?.firstName} {userToApprove?.lastName}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-approval">
              {t("admin.pendingRegistrations.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmApproval}
              disabled={approveMutation.isPending}
              data-testid="button-confirm-approval"
            >
              {approveMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {t("admin.pendingRegistrations.approving")}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t("admin.pendingRegistrations.approve")}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rejection Dialog */}
      <Dialog open={!!selectedUserForRejection} onOpenChange={() => setSelectedUserForRejection(null)}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-reject-registration">
          <DialogHeader>
            <DialogTitle>{t("admin.pendingRegistrations.rejectTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.pendingRegistrations.rejectDescription")}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitRejection)} className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Usuário:</strong> {selectedUserForRejection?.firstName} {selectedUserForRejection?.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Email:</strong> {selectedUserForRejection?.email}
                </p>
              </div>

              <Separator />

              <FormField
                control={form.control}
                name="rejectionReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("admin.pendingRegistrations.rejectionReason")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("admin.pendingRegistrations.rejectionReasonPlaceholder")}
                        className="min-h-[100px]"
                        data-testid="textarea-rejection-reason"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedUserForRejection(null)}
                  data-testid="button-cancel-rejection"
                >
                  {t("admin.pendingRegistrations.cancel")}
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={rejectMutation.isPending}
                  data-testid="button-confirm-rejection"
                >
                  {rejectMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {t("admin.pendingRegistrations.rejecting")}
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      {t("admin.pendingRegistrations.confirmReject")}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}