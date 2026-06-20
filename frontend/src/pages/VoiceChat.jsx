import { useEffect, useMemo, useRef, useState } from "react";
import { sendChatMessage } from "../services/api.js";
import { createMessage, createTitle, welcomeMessage } from "../utils/chatSessions.js";

function renderInlineMarkdown(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={`${part}-${index}`}>{part.slice(1, -1)}</em>;
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function ChatText({ text }) {
  const lines = text.split(/\n+/).filter(Boolean);

  return (
    <div className="formatted-message">
      {lines.map((line, index) => {
        const cleanLine = line.replace(/^[-*]\s+/, "");
        return <p key={`${cleanLine}-${index}`}>{renderInlineMarkdown(cleanLine)}</p>;
      })}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 20h4.4L19.7 8.7a2.1 2.1 0 0 0 0-3L18.3 4.3a2.1 2.1 0 0 0-3 0L4 15.6V20Z" />
      <path d="m14 6 4 4" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}

export default function VoiceChat({ sessions, setSessions, activeSessionId, aiNotice = "", setAiNotice = () => {} }) {
  const [message, setMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editDraft, setEditDraft] = useState("");
  const [copyToastVisible, setCopyToastVisible] = useState(false);
  const [voiceWarning, setVoiceWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const chatHistoryRef = useRef(null);
  const editFormRef = useRef(null);
  const copyToastTimerRef = useRef(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || sessions[0],
    [activeSessionId, sessions]
  );

  useEffect(() => {
    const chatHistory = chatHistoryRef.current;
    if (!chatHistory) {
      return;
    }

    chatHistory.scrollTo({
      top: chatHistory.scrollHeight,
      behavior: "smooth",
    });
  }, [activeSession.messages.length, activeSessionId, loading]);

  useEffect(() => {
    function handleClickOutside(event) {
      const target = event.target;

      if (
        editingMessageId &&
        editFormRef.current &&
        !editFormRef.current.contains(target)
      ) {
        handleCancelEdit();
      }

    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editingMessageId]);

  useEffect(() => {
    return () => {
      if (copyToastTimerRef.current) {
        window.clearTimeout(copyToastTimerRef.current);
      }
    };
  }, []);

  const latestAssistantResponse = useMemo(() => {
    const assistantMessages = activeSession.messages.filter(
      (chat) => chat.sender === "assistant" && chat.id !== welcomeMessage.id
    );
    return assistantMessages.at(-1)?.text || "";
  }, [activeSession.messages]);

  const hasUserMessages = useMemo(
    () => activeSession.messages.some((chat) => chat.sender === "user"),
    [activeSession.messages]
  );

  function updateSession(sessionId, updater) {
    setSessions((currentSessions) =>
      currentSessions.map((session) => {
        if (session.id !== sessionId) {
          return session;
        }

        return {
          ...session,
          ...updater(session),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!message.trim() || loading || editingMessageId) {
      return;
    }

    const sessionId = activeSession.id;
    const userText = message.trim();
    const userMessage = createMessage("user", userText);
    const nextMessages = [...activeSession.messages, userMessage];

    updateSession(sessionId, (session) => ({
      messages: nextMessages,
      title: session.title === "New chat" ? createTitle(userText) : session.title,
    }));
    setMessage("");
    setEditingMessageId("");
    setEditDraft("");
    setLoading(true);

    const contextHistory = nextMessages
      .slice(0, -1)
      .filter((chat) => chat.id !== welcomeMessage.id)
      .map((chat) => ({ sender: chat.sender, text: chat.text }));
    const data = await sendChatMessage(userText, contextHistory);
    setAiNotice(data.ai_notice || "");
    updateSession(sessionId, (session) => ({
      messages: [...session.messages, createMessage("assistant", data.reply)],
    }));
    setLoading(false);
  }

  function handleEditQuestion(chat) {
    setEditingMessageId(chat.id);
    setEditDraft(chat.text);
  }

  function handleCancelEdit() {
    setEditingMessageId("");
    setEditDraft("");
  }

  async function handleCopyQuestion(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      setCopyToastVisible(true);
      if (copyToastTimerRef.current) {
        window.clearTimeout(copyToastTimerRef.current);
      }
      copyToastTimerRef.current = window.setTimeout(() => setCopyToastVisible(false), 2200);
    } catch {
      setVoiceWarning("Could not copy this question. Please try again.");
    }
  }

  async function handleSaveEditedQuestion(chat) {
    const userText = editDraft.trim();
    if (!userText || loading) {
      return;
    }

    const sessionId = activeSession.id;
    const editIndex = activeSession.messages.findIndex((messageItem) => messageItem.id === chat.id);
    if (editIndex < 0) {
      return;
    }

    const nextMessages = activeSession.messages.slice(0, editIndex + 1);
    nextMessages[editIndex] = {
      ...nextMessages[editIndex],
      text: userText,
    };

    updateSession(sessionId, (session) => ({
      messages: nextMessages,
      title: session.title === "New chat" ? createTitle(userText) : session.title,
    }));
    setEditingMessageId("");
    setEditDraft("");
    setLoading(true);

    const contextHistory = nextMessages
      .slice(0, -1)
      .filter((messageItem) => messageItem.id !== welcomeMessage.id)
      .map((messageItem) => ({ sender: messageItem.sender, text: messageItem.text }));
    const data = await sendChatMessage(userText, contextHistory);
    setAiNotice(data.ai_notice || "");
    updateSession(sessionId, (session) => ({
      messages: [...session.messages, createMessage("assistant", data.reply)],
    }));
    setLoading(false);
  }

  function handleClearCurrentChat() {
    updateSession(activeSession.id, () => ({
      title: "New chat",
      messages: [welcomeMessage],
    }));
    setEditingMessageId("");
    setEditDraft("");
    setMessage("");
    setAiNotice("");
  }

  function handleFileSelect(event) {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) {
      return;
    }

    const fileNames = selectedFiles.map((file) => file.name).join(", ");
    setVoiceWarning(`File selected: ${fileNames}. File analysis will be connected in a later version.`);
    event.target.value = "";
  }

  function getFemaleVoice() {
    const voices = window.speechSynthesis?.getVoices() || [];
    const preferredNames = [
      "female",
      "woman",
      "samantha",
      "victoria",
      "zira",
      "jenny",
      "aria",
      "natasha",
      "tessa",
      "karen",
      "moira",
      "susan",
    ];

    return (
      voices.find((voice) => preferredNames.some((name) => voice.name.toLowerCase().includes(name))) ||
      voices.find((voice) => voice.lang?.toLowerCase().startsWith("en")) ||
      voices[0]
    );
  }

  function handleSpeakResponse() {
    if (!latestAssistantResponse) {
      setVoiceWarning("There is no AI response to speak yet.");
      return;
    }

    if (!window.speechSynthesis) {
      setVoiceWarning("Speech synthesis is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(latestAssistantResponse);
    const selectedVoice = getFemaleVoice();
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
    setVoiceWarning("");
  }

  return (
    <section className="workspace-grid chat-layout">
      <div className="panel chat-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Conversation</p>
            <h2>{activeSession.title}</h2>
          </div>
          <div className="chat-actions">
            <button
              className="secondary-button small-button"
              type="button"
              onClick={handleSpeakResponse}
              disabled={!latestAssistantResponse}
            >
              Speak response
            </button>
            <button className="secondary-button small-button" type="button" onClick={handleClearCurrentChat}>
              Delete chat
            </button>
          </div>
        </div>

        <div className="chat-history" aria-label="Chat history" ref={chatHistoryRef}>
          {activeSession.messages.map((chat) => (
            <article className={`chat-bubble ${chat.sender}`} key={chat.id}>
              {chat.sender === "assistant" && <div className="assistant-avatar small" aria-hidden="true">H</div>}
              <div className="chat-message-body">
                {editingMessageId === chat.id ? (
                  <form
                    className="inline-edit-form"
                    ref={editFormRef}
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleSaveEditedQuestion(chat);
                    }}
                  >
                    <textarea
                      autoFocus
                      aria-label="Edit question"
                      value={editDraft}
                      onChange={(event) => setEditDraft(event.target.value)}
                    />
                    <div className="inline-edit-actions">
                      <button className="secondary-button small-button" type="button" onClick={handleCancelEdit}>
                        Cancel
                      </button>
                      <button className="small-button" type="submit" disabled={loading || !editDraft.trim()}>
                        Send
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <ChatText text={chat.text} />
                    {chat.sender === "user" && (
                      <div className="message-action-row" aria-label="Question actions">
                        <button
                          aria-label="Edit question"
                          className="message-icon-action"
                          title="Edit question"
                          type="button"
                          onClick={() => handleEditQuestion(chat)}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          aria-label="Copy question"
                          className="message-icon-action"
                          title="Copy question"
                          type="button"
                          onClick={() => handleCopyQuestion(chat.text)}
                        >
                          <CopyIcon />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </article>
          ))}
          {loading && (
            <article className="chat-bubble assistant">
              <div className="assistant-avatar small" aria-hidden="true">H</div>
              <ChatText text="Thinking through your next best step..." />
            </article>
          )}
        </div>

        {voiceWarning && <div className="voice-warning">{voiceWarning}</div>}
        {aiNotice && (
          <div className="ai-status-notice" role="status" aria-live="polite">
            <span className="ai-status-dot" aria-hidden="true" />
            <span>{aiNotice}</span>
          </div>
        )}
        {copyToastVisible && (
          <div className="copy-toast" role="status" aria-live="polite">
            Copied question
          </div>
        )}

        <form className="chat-composer" onSubmit={handleSubmit}>
          <input
            ref={fileInputRef}
            className="hidden-file-input"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp"
            onChange={handleFileSelect}
          />
          <button
            aria-label="Upload file"
            className="secondary-button upload-button"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={Boolean(editingMessageId)}
          >
            +
          </button>
          <input
            aria-label="Message Hana"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            disabled={Boolean(editingMessageId)}
            placeholder={
              editingMessageId
                ? "Finish editing the selected question first..."
                : hasUserMessages
                ? ""
                : "How should I prepare for a data analyst internship?"
            }
          />
          <button aria-label="Send message" className="send-icon-button" type="submit" disabled={loading || Boolean(editingMessageId)}>
            <ArrowUpIcon />
          </button>
        </form>
      </div>
    </section>
  );
}
