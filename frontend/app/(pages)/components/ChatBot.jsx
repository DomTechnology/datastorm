"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BotMessageSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput("");

    setMessages((prev) => [
      ...prev,
      { role: "user", type: "text", text: userMessage },
    ]);

    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chatbot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage }),
      }).then((res) => res.json());

      if (res?.code === "success") {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            type: "text",
            text: res.data.answer,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            type: "text",
            text: "Sorry, I couldn't process your request. Please try again later.",
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          type: "text",
          text: "Sorry, an error occurred. Please try again later.",
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="fixed bottom-10 right-5 z-50 rounded-full bg-[var(--main-color)] hover:bg-[var(--main-hover)] text-white px-4 py-6 shadow-lg">
          <BotMessageSquare fontSize={35} size={35} />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="center"
        className="w-[350px] p-4"
        style={{ transform: "translateX(-10%)" }}
      >
        <div className="w-[300px]">
          <div className="text-[20px] font-semibold mb-3">
            DOM Chatbot
          </div>

          {/* ===== MESSAGES ===== */}
          <div className="h-[350px] overflow-y-auto flex flex-col gap-2 mb-3">
            {messages.map((m, i) => {
              /* ===== TEXT MESSAGE ===== */
              if (m.type === "text") {
                return (
                  <div
                    key={i}
                    className={`px-3 py-2 rounded-md whitespace-pre-line ${
                      m.role === "user"
                        ? "self-end bg-blue-100 text-right"
                        : "self-start bg-gray-100 text-left"
                    }`}
                  >
                    <div className="font-semibold mb-1">
                      {m.role === "user" ? "You" : "DOM Bot"}
                    </div>
                    <div>{m.text || m.message}</div>
                  </div>
                );
              }
              return null;
            })}

            {loading && (
              <div className="self-start text-gray-500 italic">
                Thinking...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ===== INPUT ===== */}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your message..."
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <Button
              onClick={sendMessage}
              disabled={loading}
              className="bg-[var(--main-color)] text-white"
            >
              Send
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
