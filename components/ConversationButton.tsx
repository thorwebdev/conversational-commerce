import { Button } from "@/components/ui/button";
import { ButtonHTMLAttributes, ReactNode } from "react";

interface ConversationButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  loadingText?: string;
}

export function ConversationButton({ 
  children, 
  isLoading = false, 
  loadingText,
  className = "",
  disabled,
  ...props 
}: ConversationButtonProps) {
  const baseClasses = "bg-black text-white rounded-full px-6 hover:bg-gray-800 text-md py-6";
  
  const finalClassName = `${baseClasses} ${className}`.trim();
  
  return (
    <Button
      className={finalClassName}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && loadingText ? loadingText : children}
    </Button>
  );
}
