"use client";

import { useRef } from "react";
import { format, isToday, isYesterday, parseISO, isValid } from "date-fns";
import { useAuthStore } from "../stores/useAuthStore";
import { useChatStore, type Message } from "../stores/useChatStore";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FiUser, FiCheck, FiCheckCircle } from "react-icons/fi";

export default function MessagesArea() {
  const { user } = useAuthStore();
  const { currentConversation, messages, loading, typingUsers } =
    useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const formatMessageDate = (dateInput: string | Date | null | undefined) => {
    if (!dateInput) return "N/A";
    const date =
      typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
    if (!isValid(date)) return "N/A";
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return `Yesterday ${format(date, "h:mm a")}`;
    return format(date, "MMM d, yyyy h:mm a");
  };

  const groupMessagesByDate = (messages: Message[]) => {
    return messages.reduce((groups: Record<string, Message[]>, message) => {
      const dateInput = message.timestamp;
      if (!dateInput) {
        groups["N/A"] = groups["N/A"] || [];
        groups["N/A"].push(message);
        return groups;
      }
      const date =
        typeof dateInput === "string"
          ? parseISO(dateInput)
          : new Date(dateInput);
      if (!isValid(date)) {
        groups["N/A"] = groups["N/A"] || [];
        groups["N/A"].push(message);
        return groups;
      }
      const dateKey = format(date, "yyyy-MM-dd");
      groups[dateKey] = groups[dateKey] || [];
      groups[dateKey].push(message);
      return groups;
    }, {});
  };

  return (
    <ScrollArea className="flex-1 p-4">
      {loading && messages.length === 0 ? (
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <FiUser className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No messages yet</h3>
          <p className="text-muted-foreground">
            Start a conversation with {currentConversation?.user.username}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupMessagesByDate(messages)).map(
            ([date, groupedMessages]) => (
              <div key={date}>
                <div className="flex justify-center mb-4">
                  <span className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                    {date === "N/A"
                      ? "Unknown Date"
                      : format(parseISO(date), "MMMM d, yyyy")}
                  </span>
                </div>

                <AnimatePresence>
                  {groupedMessages.map((message) => {
                    const isOwn = message.senderId === user?.id;
                    return (
                      <motion.div
                        key={message._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex mb-4 ${
                          isOwn ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`
                          max-w-[70%] px-4 py-2 rounded-2xl
                          ${
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }
                        `}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div
                            className={`
                            flex items-center gap-1 mt-1 text-xs
                            ${
                              isOwn
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            }
                          `}
                          >
                            <span>{formatMessageDate(message.timestamp)}</span>
                            {isOwn &&
                              (message.read ? (
                                <FiCheckCircle className="h-3 w-3" />
                              ) : (
                                <FiCheck className="h-3 w-3" />
                              ))}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )
          )}

          {currentConversation &&
            typingUsers.includes(currentConversation.user.id) && (
              <div className="flex justify-start">
                <div className="bg-muted px-4 py-2 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            )}

          <div ref={messagesEndRef} />
        </div>
      )}
    </ScrollArea>
  );
}
