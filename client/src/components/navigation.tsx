import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/components/ui/button";
import { Home, Heart, Menu, Loader2, Shield } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import LanguageSelector from "@/components/language-selector";
import LoginModal from "@/components/login-modal";
import kalrossLogo from "@assets/Kalross-negocios-imobiliários_1757100084683.png";

export default function Navigation() {
  const { isAuthenticated, user, logout, isLoggingOut } = useAuth();
  const { t } = useI18n();
  const [location, setLocation] = useLocation();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const navItems = [
    { href: "/properties", label: t("nav.properties"), show: true },
    { href: "/dashboard", label: t("nav.dashboard"), show: isAuthenticated },
  ];

  return (
    <nav className="navbar-blur sticky top-0 z-50 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link
              href="/"
              className="flex items-center"
              data-testid="link-home"
            >
              <img 
                src={kalrossLogo} 
                alt="Kalross Negócios Imobiliários" 
                className="h-10 w-auto"
              />
            </Link>
            <div className="hidden md:flex space-x-6">
              {navItems.map((item) =>
                item.show ? (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`transition-colors font-medium ${
                      location === item.href
                        ? "text-primary"
                        : "text-foreground hover:text-primary"
                    }`}
                    data-testid={`link-${item.label.toLowerCase()}`}
                  >
                    {item.label}
                  </Link>
                ) : null,
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <LanguageSelector />
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex items-center text-muted-foreground hover:text-foreground"
              data-testid="button-saved"
            >
              <Heart className="w-4 h-4 mr-1" />
              {t("nav.saved")}
            </Button>
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">
                  {t("nav.welcome")},{" "}
                  {(user as any)?.firstName || t("nav.welcome")}
                  {(user as any)?.role === "admin" && (
                    <Shield className="w-3 h-3 ml-1 inline text-primary" />
                  )}
                </span>
                <Button
                  onClick={() => logout()}
                  disabled={isLoggingOut}
                  data-testid="button-logout"
                >
                  {isLoggingOut ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("nav.loggingOut")}
                    </>
                  ) : (
                    t("nav.logout")
                  )}
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setShowLoginModal(true)}
                data-testid="button-agent-login"
                className="bg-primary hover:bg-primary/90"
              >
                <Shield className="w-4 h-4 mr-2" />
                {t("nav.agentLogin")}
              </Button>
            )}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden"
                  data-testid="button-menu"
                >
                  <Menu className="text-xl" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col space-y-4 mt-8">
                  {navItems.map((item) =>
                    item.show ? (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="text-foreground hover:text-primary transition-colors font-medium"
                        data-testid={`mobile-link-${item.label.toLowerCase()}`}
                      >
                        {item.label}
                      </Link>
                    ) : null,
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </nav>
  );
}
