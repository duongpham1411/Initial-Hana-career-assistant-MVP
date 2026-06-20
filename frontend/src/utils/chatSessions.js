export const STORAGE_KEY = "jobbuddy_chat_sessions";

export const welcomeMessage = {
  id: "welcome",
  sender: "assistant",
  text: "Hi, I am Hana. Ask me about any job, company, CV, interview, or skill you want to prepare for.",
};

export function createSession(title = "New chat") {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    messages: [welcomeMessage],
    updatedAt: new Date().toISOString(),
  };
}

export function createMessage(sender, text) {
  return {
    id: `${sender}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sender,
    text,
  };
}

export function createTitle(text) {
  return text.length > 38 ? `${text.slice(0, 38)}...` : text;
}

export function loadSessions() {
  try {
    const savedSessions = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(savedSessions) && savedSessions.length > 0) {
      return savedSessions;
    }
  } catch {
    return [createSession()];
  }

  return [createSession()];
}
