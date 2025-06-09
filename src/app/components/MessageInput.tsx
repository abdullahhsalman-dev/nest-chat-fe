"use client";

import { useState, useEffect } from "react";
import { type FormEvent, type KeyboardEvent } from "react";
import { useChatStore } from "../stores/useChatStore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FiSend, FiPaperclip, FiSmile } from "react-icons/fi";

export default function MessageInput() {
  const { currentConversation, sendMessage, emitTyping } = useChatStore();
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const { toast } = useToast();

  useEffect(() => {
    if (isTyping && currentConversation) {
      emitTyping(currentConversation.user.id);

      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      const timeout = setTimeout(() => {
        setIsTyping(false);
      }, 3000);

      setTypingTimeout(timeout);
    }

    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [isTyping, currentConversation, emitTyping]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentConversation) return;

    try {
      await sendMessage(currentConversation.user.id, messageInput);
      setMessageInput("");
      setIsTyping(false);

      toast({
        title: "Message sent",
        description: `Message sent to ${currentConversation.user.username}`,
      });
    } catch (error) {
      console.error("Failed to send message", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }

    if (!isTyping) {
      setIsTyping(true);
    }
  };

  return (
    <div className="p-4 border-t bg-card">
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <Button type="button" variant="ghost" size="icon">
          <FiPaperclip className="h-4 w-4" />
        </Button>

        <div className="flex-1 relative">
          <Textarea
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyPress}
            className="min-h-[40px] max-h-32 resize-none pr-12"
            rows={1}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 transform -translate-y-1/2"
          >
            <FiSmile className="h-4 w-4" />
          </Button>
        </div>

        <Button type="submit" disabled={!messageInput.trim()} size="icon">
          <FiSend className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
