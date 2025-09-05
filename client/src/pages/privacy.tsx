import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { Shield, Eye, Database, Users, Phone, Mail } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Shield className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">Política de Privacidade</h1>
          <p className="text-xl opacity-90">
            Última atualização: Janeiro de 2025
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Introduction */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-6 h-6" />
              Introdução
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <p>
              A Kalross Negócios Imobiliários está comprometida em proteger sua privacidade e dados pessoais. 
              Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos 
              suas informações quando você utiliza nosso site e serviços.
            </p>
            <p>
              Ao utilizar nossos serviços, você concorda com as práticas descritas nesta política. 
              Recomendamos que leia atentamente este documento.
            </p>
          </CardContent>
        </Card>

        {/* Information We Collect */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-6 h-6" />
              Informações que Coletamos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Informações Pessoais</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Nome completo e informações de contato (telefone, e-mail, endereço)</li>
                  <li>Documentos de identificação (CPF, RG) quando necessário</li>
                  <li>Informações financeiras para transações imobiliárias</li>
                  <li>Preferências de propriedades e histórico de buscas</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Informações Técnicas</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Endereço IP e dados de localização</li>
                  <li>Tipo de dispositivo, navegador e sistema operacional</li>
                  <li>Páginas visitadas e tempo de navegação</li>
                  <li>Cookies e tecnologias similares</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Informações de Propriedades</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Detalhes de propriedades listadas ou visualizadas</li>
                  <li>Fotos e documentos de imóveis</li>
                  <li>Histórico de visitas e agendamentos</li>
                  <li>Comunicações entre compradores e vendedores</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How We Use Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-6 h-6" />
              Como Utilizamos suas Informações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Prestação de Serviços</h3>
                <p className="text-muted-foreground">
                  Utilizamos suas informações para fornecer nossos serviços imobiliários, 
                  incluindo busca de propriedades, agendamento de visitas e facilitação de transações.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Comunicação</h3>
                <p className="text-muted-foreground">
                  Enviamos notificações sobre propriedades que correspondem aos seus critérios, 
                  atualizações de serviços e comunicações importantes.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Melhorias no Serviço</h3>
                <p className="text-muted-foreground">
                  Analisamos o uso da plataforma para melhorar nossos serviços, 
                  desenvolver novos recursos e personalizar sua experiência.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Segurança e Conformidade</h3>
                <p className="text-muted-foreground">
                  Protegemos contra fraudes, verificamos identidades e cumprimos 
                  obrigações legais e regulamentares.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Protection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-6 h-6" />
              Proteção de Dados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Medidas de Segurança</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Criptografia SSL/TLS para transmissão de dados</li>
                  <li>Servidores seguros com acesso restrito</li>
                  <li>Monitoramento contínuo de segurança</li>
                  <li>Backups regulares e plano de recuperação</li>
                  <li>Treinamento de equipe em segurança de dados</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Acesso a Dados</h3>
                <p className="text-muted-foreground">
                  Apenas funcionários autorizados têm acesso às suas informações pessoais, 
                  e somente quando necessário para prestar nossos serviços.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Retenção de Dados</h3>
                <p className="text-muted-foreground">
                  Mantemos suas informações apenas pelo tempo necessário para cumprir 
                  os propósitos descritos nesta política ou conforme exigido por lei.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Seus Direitos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground mb-4">
                De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem os seguintes direitos:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Acesso</h4>
                  <p className="text-sm text-muted-foreground">
                    Solicitar informações sobre quais dados pessoais processamos
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Retificação</h4>
                  <p className="text-sm text-muted-foreground">
                    Corrigir dados pessoais incompletos ou inexatos
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Exclusão</h4>
                  <p className="text-sm text-muted-foreground">
                    Solicitar a exclusão de seus dados pessoais
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Portabilidade</h4>
                  <p className="text-sm text-muted-foreground">
                    Receber seus dados em formato estruturado
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Oposição</h4>
                  <p className="text-sm text-muted-foreground">
                    Opor-se ao processamento de seus dados
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Revogação</h4>
                  <p className="text-sm text-muted-foreground">
                    Revogar o consentimento a qualquer momento
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cookies */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Cookies e Tecnologias Similares</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Utilizamos cookies e tecnologias similares para melhorar sua experiência, 
                analisar o tráfego do site e personalizar conteúdo.
              </p>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Tipos de Cookies</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>Essenciais:</strong> Necessários para o funcionamento básico do site</li>
                  <li><strong>Analíticos:</strong> Coletam informações sobre como você usa o site</li>
                  <li><strong>Funcionais:</strong> Lembram suas preferências e configurações</li>
                  <li><strong>Marketing:</strong> Utilizados para exibir anúncios relevantes</li>
                </ul>
              </div>
              
              <p className="text-muted-foreground">
                Você pode gerenciar suas preferências de cookies através das configurações 
                do seu navegador ou através do nosso painel de preferências.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-6 h-6" />
              Contato sobre Privacidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Se você tiver dúvidas sobre esta Política de Privacidade ou quiser exercer 
                seus direitos de proteção de dados, entre em contato conosco:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">E-mail</p>
                    <p className="text-sm text-muted-foreground">privacidade@premierproperties.com</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Telefone</p>
                    <p className="text-sm text-muted-foreground">(11) 99999-9999</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Updates */}
        <Card>
          <CardHeader>
            <CardTitle>Alterações na Política</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Esta Política de Privacidade pode ser atualizada periodicamente para refletir 
              mudanças em nossos serviços ou na legislação. Notificaremos sobre alterações 
              significativas através do site ou por e-mail. A data da última atualização 
              está indicada no início desta política.
            </p>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}