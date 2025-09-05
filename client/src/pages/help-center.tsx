import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { useState } from "react";
import { Search, MessageCircle, Phone, Mail, HelpCircle, Users, Home, Shield } from "lucide-react";

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");

  const faqCategories = [
    {
      title: "Compra e Venda",
      icon: <Home className="w-6 h-6" />,
      color: "bg-blue-500",
      faqs: [
        {
          question: "Como posso publicar meu imóvel para venda?",
          answer: "Para publicar seu imóvel, você precisa ser um agente credenciado. Faça login em sua conta, acesse o painel do agente e clique em 'Adicionar Novo Imóvel'. Preencha todas as informações necessárias e adicione fotos de qualidade."
        },
        {
          question: "Quanto tempo leva para aprovar um anúncio?",
          answer: "Normalmente, anúncios são aprovados em até 24 horas úteis. Nossa equipe revisa cada propriedade para garantir a qualidade e veracidade das informações."
        },
        {
          question: "Posso editar meu anúncio após a publicação?",
          answer: "Sim, você pode editar seu anúncio a qualquer momento através do painel do agente. As alterações podem levar algumas horas para aparecer no site."
        }
      ]
    },
    {
      title: "Conta e Perfil",
      icon: <Users className="w-6 h-6" />,
      color: "bg-green-500",
      faqs: [
        {
          question: "Como criar uma conta de agente?",
          answer: "Para se tornar um agente em nossa plataforma, entre em contato conosco através do formulário de contato. Nossa equipe analisará sua solicitação e fornecerá as credenciais necessárias."
        },
        {
          question: "Esqueci minha senha, como recuperar?",
          answer: "Na página de login, clique em 'Esqueci minha senha' e siga as instruções enviadas para seu e-mail cadastrado."
        },
        {
          question: "Como atualizar minhas informações pessoais?",
          answer: "Acesse seu perfil no painel do agente e clique em 'Editar Perfil' para atualizar suas informações pessoais e de contato."
        }
      ]
    },
    {
      title: "Segurança e Privacidade",
      icon: <Shield className="w-6 h-6" />,
      color: "bg-purple-500",
      faqs: [
        {
          question: "Meus dados pessoais estão seguros?",
          answer: "Sim, utilizamos criptografia SSL e seguimos as melhores práticas de segurança para proteger seus dados pessoais e transações."
        },
        {
          question: "Como denunciar um anúncio suspeito?",
          answer: "Se você encontrar um anúncio suspeito, clique no botão 'Denunciar' na página do imóvel ou entre em contato conosco diretamente."
        },
        {
          question: "Posso excluir minha conta?",
          answer: "Sim, você pode solicitar a exclusão de sua conta entrando em contato conosco. Processamos essas solicitações em até 7 dias úteis."
        }
      ]
    }
  ];

  const contactOptions = [
    {
      title: "Chat ao Vivo",
      description: "Converse conosco em tempo real",
      icon: <MessageCircle className="w-8 h-8" />,
      action: "Iniciar Chat",
      available: true
    },
    {
      title: "Telefone",
      description: "(11) 99999-9999",
      icon: <Phone className="w-8 h-8" />,
      action: "Ligar Agora",
      available: true
    },
    {
      title: "E-mail",
      description: "suporte@premierproperties.com",
      icon: <Mail className="w-8 h-8" />,
      action: "Enviar E-mail",
      available: true
    }
  ];

  const filteredFAQs = faqCategories.map(category => ({
    ...category,
    faqs: category.faqs.filter(faq => 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.faqs.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Central de Ajuda</h1>
          <p className="text-xl opacity-90 mb-8">
            Encontre respostas para suas dúvidas ou entre em contato conosco
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Busque por dúvidas, tutoriais, problemas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-lg bg-white text-black"
              data-testid="input-search-help"
            />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* FAQ Categories */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">Perguntas Frequentes</h2>
            
            {filteredFAQs.map((category, categoryIndex) => (
              <Card key={categoryIndex} className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${category.color} text-white`}>
                      {category.icon}
                    </div>
                    {category.title}
                    <Badge variant="secondary">{category.faqs.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {category.faqs.map((faq, faqIndex) => (
                      <details key={faqIndex} className="group">
                        <summary className="flex items-center justify-between cursor-pointer p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                          <span className="font-medium">{faq.question}</span>
                          <HelpCircle className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="mt-4 p-4 bg-background border-l-4 border-primary text-muted-foreground">
                          {faq.answer}
                        </div>
                      </details>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {searchQuery && filteredFAQs.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <HelpCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    Não encontramos respostas para "{searchQuery}". Tente usar outras palavras-chave.
                  </p>
                  <Button onClick={() => setSearchQuery("")}>
                    Limpar Busca
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Contact Options */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Precisa de Mais Ajuda?</h2>
            
            <div className="space-y-4">
              {contactOptions.map((option, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="text-primary">
                        {option.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{option.title}</h3>
                        <p className="text-muted-foreground text-sm mb-3">
                          {option.description}
                        </p>
                        <Button 
                          variant={option.available ? "default" : "secondary"}
                          size="sm"
                          className="w-full"
                          disabled={!option.available}
                          data-testid={`button-${option.title.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {option.action}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Links */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Links Úteis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <a href="/contact">Fale Conosco</a>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <a href="/privacy">Política de Privacidade</a>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <a href="/terms">Termos de Serviço</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}