import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Home, Heart, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Navigation() {
  const { isAuthenticated, user } = useAuth();
  const [location] = useLocation();

  const navItems = [
    { href: "/properties", label: "Properties", show: true },
    { href: "/dashboard", label: "Dashboard", show: isAuthenticated },
  ];

  return (
    <nav className="navbar-blur sticky top-0 z-50 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2" data-testid="link-home">
              <Home className="text-2xl text-primary" />
              <span className="text-xl font-bold text-foreground">Premier Properties</span>
            </Link>
            <div className="hidden md:flex space-x-6">
              {navItems.map((item) => 
                item.show ? (
                  <Link 
                    key={item.href}
                    href={item.href} 
                    className={`transition-colors font-medium ${
                      location === item.href 
                        ? 'text-primary' 
                        : 'text-foreground hover:text-primary'
                    }`}
                    data-testid={`link-${item.label.toLowerCase()}`}
                  >
                    {item.label}
                  </Link>
                ) : null
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              className="hidden md:flex items-center text-muted-foreground hover:text-foreground"
              data-testid="button-saved"
            >
              <Heart className="w-4 h-4 mr-1" />
              Saved
            </Button>
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">
                  Welcome, {user?.firstName || 'Agent'}
                </span>
                <Button asChild data-testid="button-logout">
                  <a href="/api/logout">Logout</a>
                </Button>
              </div>
            ) : (
              <Button asChild data-testid="button-agent-login">
                <a href="/api/login">Agent Login</a>
              </Button>
            )}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden" data-testid="button-menu">
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
                    ) : null
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
