import { useEffect, useRef, useState } from "react";

const navIcons = {
  voice: "+",
  company: "C",
  jd: "JD",
  tracker: "T",
  profile: "U",
};

export default function Sidebar({
  pages,
  activePage,
  collapsed,
  chatSessions = [],
  activeChatSessionId,
  onDeleteChatSession,
  onLogoClick,
  onOpenChatSession,
  onRenameChatSession,
  onChangePage,
  onToggle,
}) {
  const [openMenuSessionId, setOpenMenuSessionId] = useState("");
  const [renamingSessionId, setRenamingSessionId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const menuRef = useRef(null);
  const renameFormRef = useRef(null);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredChatSessions = normalizedSearchQuery
    ? chatSessions.filter((session) => {
        const titleMatch = session.title.toLowerCase().includes(normalizedSearchQuery);
        const messageMatch = session.messages.some((message) =>
          message.text.toLowerCase().includes(normalizedSearchQuery)
        );
        return titleMatch || messageMatch;
      })
    : chatSessions;

  useEffect(() => {
    function handleClickOutside(event) {
      const target = event.target;

      if (
        renamingSessionId &&
        renameFormRef.current &&
        !renameFormRef.current.contains(target)
      ) {
        setRenamingSessionId("");
      }

      if (
        openMenuSessionId &&
        !renamingSessionId &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpenMenuSessionId("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuSessionId, renamingSessionId]);

  function handleStartRenamingSession(event, sessionId) {
    event.stopPropagation();
    setOpenMenuSessionId("");
    setRenamingSessionId(sessionId);
  }

  function handleOpenSession(sessionId) {
    setOpenMenuSessionId("");
    setRenamingSessionId("");
    onOpenChatSession(sessionId);
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-top-row">
        <button
          aria-label="Start a new chat"
          className="brand"
          title="Start a new chat"
          type="button"
          onClick={onLogoClick}
        >
        <div className="brand-mark" aria-hidden="true">H</div>
        <div className="brand-copy">
          <strong>Hana</strong>
        </div>
        </button>
        <button
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="sidebar-toggle"
          type="button"
          onClick={onToggle}
        >
          {collapsed ? ">" : "<"}
        </button>
      </div>

      <label className="sidebar-search" htmlFor="sidebar-search">
        <span>/</span>
        <input
          id="sidebar-search"
          placeholder="Search chats"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </label>

      <nav className="nav-list" aria-label="Main navigation">
        {Object.entries(pages).map(([key, page]) => (
          <button
            className={activePage === key ? "nav-button active" : "nav-button"}
            key={key}
            onClick={() => onChangePage(key)}
            type="button"
            title={page.label}
          >
            <span className="nav-dot">{navIcons[key]}</span>
            <span className="nav-label">{page.label}</span>
          </button>
        ))}
      </nav>

      <section className="sidebar-history" aria-label="Chat history">
        <div className="sidebar-history-heading">
          <span>Chat History</span>
        </div>
        <div className="saved-chat-list sidebar-chat-list">
          {filteredChatSessions.map((session) => (
            <article
              className={session.id === activeChatSessionId ? "saved-chat active" : "saved-chat"}
              key={session.id}
              role="button"
              tabIndex="0"
              onClick={() => handleOpenSession(session.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  handleOpenSession(session.id);
                }
              }}
            >
              {renamingSessionId === session.id ? (
                <form
                  className="inline-rename-form"
                  ref={renameFormRef}
                  onClick={(event) => event.stopPropagation()}
                  onSubmit={(event) => {
                    event.preventDefault();
                    setRenamingSessionId("");
                  }}
                >
                  <input
                    autoFocus
                    aria-label="Change chat name"
                    value={session.title}
                    onChange={(event) => onRenameChatSession(session.id, event.target.value)}
                  />
                </form>
              ) : (
                <>
                  <span className="saved-chat-title">{session.title}</span>
                  <span className="saved-chat-meta">
                    {session.messages.filter((chat) => chat.sender === "user").length} questions
                  </span>
                </>
              )}
              <button
                aria-label="Chat settings"
                className="icon-button"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setRenamingSessionId("");
                  setOpenMenuSessionId((currentId) => (currentId === session.id ? "" : session.id));
                }}
              >
                ...
              </button>
              {openMenuSessionId === session.id && (
                <div
                  className="chat-menu"
                  ref={menuRef}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <button
                    className="menu-action"
                    type="button"
                    onClick={(event) => handleStartRenamingSession(event, session.id)}
                  >
                    Change name
                  </button>
                  <button
                    className="menu-action danger"
                    type="button"
                    onClick={() => onDeleteChatSession(session.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </article>
          ))}
          {filteredChatSessions.length === 0 && (
            <div className="history-empty-state">No chats found</div>
          )}
        </div>
      </section>
    </aside>
  );
}
