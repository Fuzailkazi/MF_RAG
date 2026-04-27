import { useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <label htmlFor="chat-input" className="sr-only">
        Ask a question about mutual funds
      </label>
      <Input
        id="chat-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a factual question about mutual funds..."
        disabled={disabled}
        className="flex-1 h-12 text-sm"
        autoComplete="off"
      />
      <Button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        size="icon"
        aria-label="Send message"
        className="h-12 w-12 shrink-0 cursor-pointer transition-colors duration-200"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
