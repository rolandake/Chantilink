// src/pages/VisionIA/components/ChatWindow.jsx
import React, { useRef, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

// Message individuel avec animation
const MessageItem = memo(({ data, index, style }) => {
  const { messages, onDeleteMessage } = data;
  const msg = messages[index];

  return (
    <motion.div
      style={{ ...style, padding: "0.25rem" }}
      key={msg.key}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15 }}
      className={`max-w-[70%] p-2 rounded-lg break-words whitespace-pre-wrap ${
        msg.role === "system"
          ? "bg-gray-700 text-gray-200 self-center"
          : msg.role === "user"
          ? "bg-indigo-600 text-white self-end"
          : "bg-green-600 text-white self-start"
      } shadow-md hover:shadow-lg transition`}
      onDoubleClick={() => onDeleteMessage?.(msg.id)}
    >
      {typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content, null, 2)}
    </motion.div>
  );
});

export default function ChatWindow({ messages, onDeleteMessage, typing }) {
  const listRef = useRef(null);
  const userScrolling = useRef(false);

  // Assurer des clés uniques et stables
  const uniqueMessages = messages.map((msg, index) => ({
    ...msg,
    key: msg.id ? `${msg.id}-${index}` : msg._key ? `${msg._key}-${index}` : `${uuidv4()}-${index}`,
  }));

  // Scroll automatique sauf si l’utilisateur scroll
  useEffect(() => {
    if (!userScrolling.current && listRef.current) {
      const container = listRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [uniqueMessages, typing]);

  return (
    <div
      className="flex-1 p-2 overflow-auto flex flex-col gap-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-900"
      onScroll={() => {
        if (!listRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = listRef.current;
        userScrolling.current = scrollTop + clientHeight < scrollHeight - 50;
      }}
      ref={listRef}
    >
      <AnimatePresence initial={false}>
        {uniqueMessages.map((msg, index) => (
          <MessageItem
            key={msg.key}
            index={index}
            style={{}}
            data={{ messages: uniqueMessages, onDeleteMessage }}
          />
        ))}

        {typing && (
          <motion.div
            key="typing-indicator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-gray-400 italic self-start p-2"
          >
            L'IA est en train de répondre...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
