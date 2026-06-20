import { useEffect, useState } from "react";
import FloatingHanaAssistant from "./components/FloatingHanaAssistant.jsx";
import Sidebar from "./components/Sidebar.jsx";
import VoiceChat from "./pages/VoiceChat.jsx";
import CompanyResearch from "./pages/CompanyResearch.jsx";
import JdAnalyzer from "./pages/JdAnalyzer.jsx";
import JobTracker from "./pages/JobTracker.jsx";
import UserProfile from "./pages/UserProfile.jsx";
import { sendChatMessage } from "./services/api.js";
import { createMessage, createSession, createTitle, loadSessions, STORAGE_KEY, welcomeMessage } from "./utils/chatSessions.js";

const pages = {
  voice: {
    label: "Career Chat",
    shortLabel: "Career Chat",
    component: VoiceChat,
  },
  company: {
    label: "Company Research",
    shortLabel: "Research",
    component: CompanyResearch,
  },
  jd: {
    label: "JD Analyzer",
    shortLabel: "JD Scan",
    component: JdAnalyzer,
  },
  tracker: {
    label: "Job Tracker",
    shortLabel: "Tracker",
    component: JobTracker,
  },
  profile: {
    label: "User Profile",
    shortLabel: "Profile",
    component: UserProfile,
  },
};

const THEME_STORAGE_KEY = "jobbuddy_theme";

function getInitialTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme;
  }

  return "light";
}

export default function App() {
  const [activePage, setActivePage] = useState("voice");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatSessions, setChatSessions] = useState(loadSessions);
  const [activeChatSessionId, setActiveChatSessionId] = useState(chatSessions[0].id);
  const [aiNotice, setAiNotice] = useState("");
  const [theme, setTheme] = useState(getInitialTheme);
  const ActivePage = pages[activePage].component;
  const activeChatSession = chatSessions.find((session) => session.id === activeChatSessionId) || chatSessions[0];
  const latestAssistantMessage =
    [...activeChatSession.messages]
      .reverse()
      .find((message) => message.sender === "assistant" && message.id !== welcomeMessage.id)?.text || "";
  const shellClassName = [
    "app-shell",
    sidebarCollapsed ? "sidebar-collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chatSessions));
  }, [chatSessions]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  function handleNewChat() {
    const session = createSession();
    setChatSessions((currentSessions) => [session, ...currentSessions]);
    setActiveChatSessionId(session.id);
    setActivePage("voice");
  }

  function handleOpenChatSession(sessionId) {
    setActiveChatSessionId(sessionId);
    setActivePage("voice");
  }

  function handleRenameChatSession(sessionId, title) {
    setChatSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id === sessionId
          ? { ...session, title: title || "Untitled chat", updatedAt: new Date().toISOString() }
          : session
      )
    );
  }

  function handleDeleteChatSession(sessionId) {
    if (chatSessions.length === 1) {
      const session = createSession();
      setChatSessions([session]);
      setActiveChatSessionId(session.id);
      return;
    }

    const nextSessions = chatSessions.filter((session) => session.id !== sessionId);
    setChatSessions(nextSessions);

    if (activeChatSessionId === sessionId) {
      setActiveChatSessionId(nextSessions[0].id);
    }
  }

  async function handleAssistantPanelMessage(message) {
    const sessionId = activeChatSessionId;
    const currentSession = chatSessions.find((session) => session.id === sessionId) || chatSessions[0];
    const userMessage = createMessage("user", message);
    const nextMessages = [...currentSession.messages, userMessage];

    setChatSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: nextMessages,
              title: session.title === "New chat" ? createTitle(message) : session.title,
              updatedAt: new Date().toISOString(),
            }
          : session
      )
    );

    const contextHistory = nextMessages
      .slice(0, -1)
      .filter((chat) => chat.id !== welcomeMessage.id)
      .map((chat) => ({ sender: chat.sender, text: chat.text }));
    const data = await sendChatMessage(message, contextHistory);
    setAiNotice(data.ai_notice || "");

    setChatSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: [...session.messages, createMessage("assistant", data.reply)],
              updatedAt: new Date().toISOString(),
            }
          : session
      )
    );

    return data.reply;
  }

  return (
    <div className={shellClassName} data-theme={theme}>
      <Sidebar
        pages={pages}
        activePage={activePage}
        collapsed={sidebarCollapsed}
        chatSessions={chatSessions}
        activeChatSessionId={activeChatSessionId}
        onDeleteChatSession={handleDeleteChatSession}
        onLogoClick={handleNewChat}
        onOpenChatSession={handleOpenChatSession}
        onRenameChatSession={handleRenameChatSession}
        onChangePage={setActivePage}
        onToggle={() => setSidebarCollapsed((current) => !current)}
      />
      <main className="main-panel">
        <header className="top-bar">
          <div>
            <h1>{pages[activePage].label}</h1>
          </div>
          <div className="top-actions">
            <button
              className="theme-toggle"
              type="button"
              onClick={() => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"))}
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </div>
        </header>
        <ActivePage
          activeSessionId={activeChatSessionId}
          sessions={chatSessions}
          setActiveSessionId={setActiveChatSessionId}
          aiNotice={aiNotice}
          setAiNotice={setAiNotice}
          setSessions={setChatSessions}
        />
      </main>
      <FloatingHanaAssistant
        latestAssistantMessage={latestAssistantMessage}
        onSendMessage={handleAssistantPanelMessage}
      />
    </div>
  );
}
