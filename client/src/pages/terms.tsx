import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { FileText, Scale, AlertTriangle, Users, Shield, Gavel } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">Termos de Serviço</h1>
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
              <Scale className="w-6 h-6" />
              Aceitação dos Termos
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <p>
              Bem-vindo à Premier Properties. Estes Termos de Serviço ("Termos") regem 
              o uso de nosso site, aplicativos móveis e serviços (coletivamente, "Serviços"). 
              Ao acessar ou usar nossos Serviços, você concorda em ficar vinculado a estes Termos.
            </p>
            <p>
              Se você não concordar com qualquer parte destes Termos, não use nossos Serviços. 
              Estes Termos constituem um acordo legal entre você e a Premier Properties.
            </p>
          </CardContent>
        </Card>

        {/* Service Description */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-6 h-6" />
              Descrição dos Serviços
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                A Premier Properties é uma plataforma online que conecta compradores, 
                vendedores, locadores e locatários de imóveis. Nossos serviços incluem:
              </p>
              
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Listagem e busca de propriedades imobiliárias</li>
                <li>Facilitar comunicação entre partes interessadas</li>
                <li>Ferramentas de agendamento e visitas</li>
                <li>Recursos de avaliação e comparação de propriedades</li>
                <li>Suporte ao processo de transação imobiliária</li>
                <li>Serviços de consultoria e assessoria</li>
              </ul>
              
              <p className="text-muted-foreground">
                Atuamos como intermediários e não somos proprietários das propriedades listadas, 
                nem garantimos a conclusão de transações.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* User Responsibilities */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-6 h-6" />
              Responsabilidades do Usuário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Conta e Registro</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Fornecer informações precisas e atualizadas durante o registro</li>
                  <li>Manter a confidencialidade de suas credenciais de acesso</li>
                  <li>Notificar imediatamente sobre uso não autorizado de sua conta</li>
                  <li>Ser responsável por todas as atividades em sua conta</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Uso Aceitável</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Usar os Serviços apenas para fins legais e legítimos</li>
                  <li>Não violar direitos de propriedade intelectual</li>
                  <li>Não transmitir conteúdo ofensivo, falso ou enganoso</li>
                  <li>Não interferir no funcionamento dos Serviços</li>
                  <li>Não tentar acessar sistemas ou dados não autorizados</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Listagem de Propriedades</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Ter autorização legal para listar a propriedade</li>
                  <li>Fornecer informações precisas e completas sobre o imóvel</li>
                  <li>Manter preços e disponibilidade atualizados</li>
                  <li>Responder prontamente a consultas de interessados</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prohibited Activities */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              Atividades Proibidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground mb-4">
                É expressamente proibido usar nossos Serviços para:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Atividades Ilegais</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Lavagem de dinheiro</li>
                    <li>• Fraude imobiliária</li>
                    <li>• Sonegação fiscal</li>
                    <li>• Discriminação ilegal</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Práticas Enganosas</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Informações falsas</li>
                    <li>• Preços enganosos</li>
                    <li>• Propriedades inexistentes</li>
                    <li>• Identidade falsa</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Spam e Abuso</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Envio de spam</li>
                    <li>• Assédio a usuários</li>
                    <li>• Múltiplas contas</li>
                    <li>• Automação excessiva</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Violações Técnicas</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Ataques cibernéticos</li>
                    <li>• Uso de malware</li>
                    <li>• Scraping não autorizado</li>
                    <li>• Sobrecarga de sistemas</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Intellectual Property */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Propriedade Intelectual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Nossos Direitos</h3>
                <p className="text-muted-foreground">
                  Todos os direitos de propriedade intelectual nos Serviços, incluindo 
                  design, tecnologia, logos, marcas registradas e conteúdo, pertencem 
                  à Premier Properties ou nossos licenciadores.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Seus Direitos</h3>
                <p className="text-muted-foreground">
                  Você mantém todos os direitos sobre o conteúdo que submete aos nossos Serviços. 
                  Ao submeter conteúdo, você nos concede uma licença para usar, modificar, 
                  exibir e distribuir esse conteúdo em conexão com nossos Serviços.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Proteção de Direitos</h3>
                <p className="text-muted-foreground">
                  Respeitamos os direitos de propriedade intelectual de terceiros. 
                  Se você acredita que seu trabalho foi copiado de forma a constituir 
                  violação de direitos autorais, entre em contato conosco.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fees and Payments */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Taxas e Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Estrutura de Taxas</h3>
                <p className="text-muted-foreground">
                  Nossos serviços podem incluir taxas por listagem de propriedades, 
                  serviços premium ou comissões de transação. Todas as taxas aplicáveis 
                  serão claramente comunicadas antes da contratação.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Política de Reembolso</h3>
                <p className="text-muted-foreground">
                  Reembolsos são processados de acordo com nossa política específica 
                  para cada tipo de serviço. Em geral, taxas de serviços já prestados 
                  não são reembolsáveis.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Impostos</h3>
                <p className="text-muted-foreground">
                  Você é responsável por todos os impostos aplicáveis às transações 
                  realizadas através de nossos Serviços.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimers */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="w-6 h-6" />
              Isenções de Responsabilidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Limitação de Responsabilidade</h3>
                <p className="text-muted-foreground">
                  A Premier Properties não será responsável por danos indiretos, 
                  incidentais, especiais ou consequenciais decorrentes do uso de 
                  nossos Serviços, incluindo perda de lucros ou dados.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Serviços "Como Estão"</h3>
                <p className="text-muted-foreground">
                  Nossos Serviços são fornecidos "como estão" e "conforme disponíveis". 
                  Não garantimos que os Serviços serão ininterruptos, seguros ou livres de erros.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Conteúdo de Terceiros</h3>
                <p className="text-muted-foreground">
                  Não somos responsáveis pelo conteúdo, precisão ou conduta de terceiros 
                  em nossos Serviços. Você interage com outros usuários por sua própria conta e risco.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Termination */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Rescisão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Por Você</h3>
                <p className="text-muted-foreground">
                  Você pode encerrar sua conta a qualquer momento entrando em contato conosco. 
                  Após o encerramento, você não poderá mais acessar nossos Serviços.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Por Nós</h3>
                <p className="text-muted-foreground">
                  Podemos suspender ou encerrar sua conta por violação destes Termos, 
                  atividade suspeita ou por qualquer outro motivo, a nosso critério exclusivo.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Efeitos da Rescisão</h3>
                <p className="text-muted-foreground">
                  Após a rescisão, certas disposições destes Termos continuarão em vigor, 
                  incluindo limitações de responsabilidade e disposições sobre propriedade intelectual.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Governing Law */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Lei Aplicável e Jurisdição</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Estes Termos são regidos pelas leis da República Federativa do Brasil. 
                Qualquer disputa relacionada a estes Termos será resolvida nos tribunais 
                competentes de São Paulo, SP.
              </p>
              
              <p className="text-muted-foreground">
                Tentaremos resolver disputas através de negociação direta antes de 
                recorrer a procedimentos legais formais.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact and Updates */}
        <Card>
          <CardHeader>
            <CardTitle>Contato e Atualizações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Contato</h3>
                <p className="text-muted-foreground">
                  Para questões sobre estes Termos, entre em contato conosco em: 
                  legal@premierproperties.com ou (11) 99999-9999.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Modificações</h3>
                <p className="text-muted-foreground">
                  Podemos modificar estes Termos a qualquer momento. Alterações significativas 
                  serão notificadas através do site ou por e-mail. O uso continuado dos Serviços 
                  após as modificações constitui aceitação dos novos Termos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}