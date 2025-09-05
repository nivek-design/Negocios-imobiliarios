import { Separator } from "@/components/ui/separator";
import { Facebook, Instagram, Twitter, Linkedin, Phone, Mail, MapPin } from "lucide-react";
import kalrossLogo from "@assets/Kalross-negocios-imobiliários_1757100084683.png";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/50 border-t">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Company Info */}
          <div className="space-y-4">
            <img 
              src={kalrossLogo} 
              alt="Kalross Negócios Imobiliários" 
              className="h-16 w-auto"
            />
            <p className="text-sm text-muted-foreground">
              Conectando você ao seu novo lar. Sua imobiliária de confiança em Londrina 
              com atendimento personalizado e soluções imobiliárias completas.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-md font-semibold">Links Rápidos</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/properties" className="text-muted-foreground hover:text-primary transition-colors">
                  Propriedades
                </a>
              </li>
              <li>
                <a href="/properties?status=sale" className="text-muted-foreground hover:text-primary transition-colors">
                  Comprar
                </a>
              </li>
              <li>
                <a href="/properties?status=rent" className="text-muted-foreground hover:text-primary transition-colors">
                  Alugar
                </a>
              </li>
              <li>
                <a href="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">
                  Painel do Agente
                </a>
              </li>
              <li>
                <a href="/help-center" className="text-muted-foreground hover:text-primary transition-colors">
                  Central de Ajuda
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="text-md font-semibold">Suporte</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                  Fale Conosco
                </a>
              </li>
              <li>
                <a href="/help-center" className="text-muted-foreground hover:text-primary transition-colors">
                  Perguntas Frequentes
                </a>
              </li>
              <li>
                <a href="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                  Termos de Serviço
                </a>
              </li>
              <li>
                <a href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                  Política de Privacidade
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-md font-semibold">Contato</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">(43) 3322-1100</span>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">contato@kalross.com.br</span>
              </li>
              <li className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-primary mt-0.5" />
                <span className="text-muted-foreground">
                  Rua das Acácias, 123<br />
                  Londrina, PR - 86010-000
                </span>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-muted-foreground">
            © {currentYear} Kalross Negócios Imobiliários. Todos os direitos reservados.
          </div>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>CRECI: 12345-J</span>
            <span>•</span>
            <span>CNPJ: 12.345.678/0001-90</span>
          </div>
        </div>
      </div>
    </footer>
  );
}