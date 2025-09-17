import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import AgentRegistrationForm from "./agent-registration-form";

/**
 * Test component to demonstrate the AgentRegistrationForm functionality
 * This can be used to test the form in isolation or integrated into other components
 */
export default function AgentRegistrationTest() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsFormOpen(true)}
        variant="outline"
        size="sm"
        data-testid="button-open-agent-registration"
        className="gap-2"
      >
        <UserPlus className="h-4 w-4" />
        Cadastro de Corretor
      </Button>
      
      <AgentRegistrationForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />
    </>
  );
}