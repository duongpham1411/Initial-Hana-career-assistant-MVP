const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.info("Using frontend mock data because the backend is unavailable.", error);
    return null;
  }
}

const fallbackProfile = {
  name: "Student User",
  target_roles: "Data Analyst Intern, Business Analyst Intern",
  target_role: "Data Analyst Intern",
  skills: ["Excel", "SQL", "Python", "Power BI"],
  location_preference: "Ho Chi Minh City or remote",
  availability: "Part-time internship, available immediately",
  cv_summary:
    "Entry-level analytics candidate with SQL, Excel, dashboarding, and business problem-solving projects.",
  experience_level: "Fresher",
};

const fallbackTrackerItems = [
  {
    company: "Acme Analytics",
    role: "Data Analyst Intern",
    status: "Interested",
    fit_score: 84,
    notes: "Strong SQL and dashboard match.",
  },
  {
    company: "Bright Retail",
    role: "Business Analyst Intern",
    status: "Applied",
    fit_score: 76,
    notes: "Emphasize Excel and customer insight project.",
  },
  {
    company: "Nova Fintech",
    role: "Reporting Intern",
    status: "Interviewing",
    fit_score: 69,
    notes: "Prepare finance metrics and Power BI story.",
  },
  {
    company: "Legacy Systems",
    role: "Data Operations Intern",
    status: "Rejected",
    fit_score: 58,
    notes: "Role needed more database administration experience.",
  },
];

function createCompanyResearch(payload = {}) {
  const companyName = payload.company_name || "Example Company";
  const roleInterest = payload.role_interest || "Data Analyst Intern";

  return {
    company: companyName,
    role_interest: roleInterest,
    industry: "Technology, digital products, and data-driven operations",
    what_they_do:
      `${companyName} likely uses product, customer, sales, and operations data to understand performance, improve decisions, and report business results. Treat this as a mock research brief until real web research is connected.`,
    summary: `${companyName} looks like a strong target for a fresher applying to ${roleInterest} if your CV shows SQL, Excel, dashboarding, and business communication.`,
    fit_score: 82,
    likely_data_work: [
      "Build weekly KPI reports for product, marketing, sales, or operations teams.",
      "Clean raw spreadsheet or database exports before analysis.",
      "Create dashboards that explain trends, conversion, retention, or process performance.",
      "Turn business questions into metrics and simple recommendations.",
    ],
    strengths: [
      "Good place to connect analytics projects with real business decisions.",
      "Entry-level candidates can stand out by showing clear SQL and dashboard examples.",
      "Strong fit if you can explain insights in simple business language.",
    ],
    risks: [
      "May expect strong communication, not only technical tools.",
      "Could ask for evidence of real projects, internships, or case-study thinking.",
      "Some teams may prefer Power BI, Tableau, or statistics experience.",
    ],
    cv_keywords: [
      "SQL",
      "Excel",
      "Dashboard",
      "KPI reporting",
      "Data cleaning",
      "Business insight",
      "Stakeholder communication",
    ],
    what_to_learn: [
      `What ${companyName} sells and who its main users or customers are.`,
      "The most important KPIs for that business model.",
      "Recent company news, product launches, or market challenges.",
      "Analytics tools mentioned in their job descriptions.",
    ],
    interview_tips: [
      `Prepare one specific reason you want to join ${companyName}.`,
      "Explain one project with problem, data, tool, result, and recommendation.",
      "Review SQL joins, GROUP BY, and dashboard storytelling.",
      "Prepare one question about how the team uses data in daily decisions.",
    ],
    application_plan: [
      "Study the company website and note three business areas where data matters.",
      "Pick one CV project that matches those business areas.",
      "Rewrite two CV bullets using metrics, tools, and business outcomes.",
      "Prepare a 30-second pitch connecting your project to the company.",
    ],
    suggested_cv_angle:
      "Position yourself as a beginner analyst who can clean data, build a useful dashboard, and explain what action the business should take next.",
  };
}

function createJdAnalysis() {
  return {
    fit_score: 74,
    must_have_skills: ["SQL", "Excel", "Data cleaning", "Communication"],
    nice_to_have_skills: ["Power BI", "Tableau", "Statistics", "Python"],
    cv_suggestions: [
      "Add one bullet showing SQL joins or aggregation.",
      "Mention dashboard storytelling, not only chart creation.",
      "Use numbers to describe project results or dataset size.",
    ],
    summary:
      "This role is realistic for a fresher if your CV clearly shows one complete analysis project and basic business communication.",
  };
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function cleanRole(rawRole) {
  const role = rawRole
    .trim()
    .replace(/[?!.]+$/g, "")
    .replace(/\b(internship|intern|job|role|position)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const aliases = {
    ds: "data science",
    da: "data analyst",
    ba: "business analyst",
  };

  return aliases[role] || role;
}

function detectRole(text) {
  const patterns = [
    /prepare for (?:a |an |the )?(.+?)(?: internship| intern| job| role| position)?$/,
    /apply for (?:a |an |the )?(.+?)(?: internship| intern| job| role| position)?$/,
    /become (?:a |an |the )?(.+?)(?: intern| analyst| teacher| developer| designer)?$/,
    /what is (?:a |an |the )?(.+?)$/,
    /what does (?:a |an |the )?(.+?) do/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return cleanRole(match[1]);
    }
  }

  if (includesAny(text, ["teacher", "teaching"])) {
    return "teacher";
  }

  if (includesAny(text, ["data science", "ds internship", "ds intern"])) {
    return "data science";
  }

  if (includesAny(text, ["data scientist"])) {
    return "data scientist";
  }

  if (includesAny(text, ["software", "developer", "frontend", "backend"])) {
    return "software developer";
  }

  if (includesAny(text, ["marketing"])) {
    return "marketing";
  }

  return "";
}

function createRoleReply(role) {
  const roleText = role.toLowerCase();

  if (includesAny(roleText, ["teacher", "teaching"])) {
    return "For a teacher internship, prepare three things: a short teaching demo, basic classroom management examples, and one lesson plan. On your CV, highlight tutoring, presentation, mentoring, communication, and any volunteer teaching experience.";
  }

  if (includesAny(roleText, ["data science", "machine learning", "ai"])) {
    return "For a data science internship, build one end-to-end project: clean data, explore it, train a simple model, evaluate results, and explain the business meaning. Review Python, pandas, statistics, SQL, and model metrics like accuracy, precision, recall, and RMSE.";
  }

  if (includesAny(roleText, ["data analyst", "business analyst", "analyst"])) {
    return "For an analyst internship, prepare SQL, Excel, dashboarding, and business storytelling. Your CV should show one project where you cleaned data, found insights, and recommended a practical business action.";
  }

  if (includesAny(roleText, ["software", "developer", "frontend", "backend"])) {
    return "For a software internship, prepare one clean project, basic data structures, Git, and clear explanations of your code. Your CV should link to GitHub and describe what you built, the tech stack, and the problem it solves.";
  }

  if (includesAny(roleText, ["marketing", "social media", "content"])) {
    return "For a marketing internship, prepare examples of content, campaign ideas, customer research, and simple metrics. Your CV should show writing, creativity, audience analysis, and any results such as engagement, clicks, or reach.";
  }

  return `For a ${role} opportunity, start by reading 3 job descriptions and listing repeated skills. Then prepare one proof for each skill: a project, class assignment, volunteer task, or short case study. Your CV should connect your experience directly to the role instead of staying generic.`;
}

function getLastUserTopic(history = []) {
  return [...history].reverse().find((chat) => chat.sender === "user" && chat.text)?.text || "";
}

function createExampleReply(topic) {
  const text = topic.toLowerCase();

  if (includesAny(text, ["interview", "data analyst", "analyst"])) {
    return "Example interview question: 'Tell me about a time you used data to solve a problem.' A strong answer: 'In my sales dashboard project, I cleaned Excel data, grouped sales by region, found that one region had lower conversion, and recommended focusing follow-up campaigns there.'";
  }

  if (includesAny(text, ["cv", "resume"])) {
    return "Example CV bullet: 'Cleaned 5,000 sales records in Excel and SQL, built a Power BI dashboard, and identified the top 3 products contributing to monthly revenue growth.'";
  }

  return "Example: describe the situation, explain your action, and show the result. For instance, 'I noticed a repeated problem, used a simple tool or process to solve it, and explained the outcome clearly to the team.'";
}

function createRoleExplanation(role) {
  const roleText = role.toLowerCase();

  if (includesAny(roleText, ["data scientist", "data science"])) {
    return "A data scientist uses data to build predictions and insights. Daily work can include cleaning data, exploring patterns, training models, evaluating accuracy, and explaining results to business teams. Prepare Python, statistics, SQL, pandas, and one simple ML project.";
  }

  if (includesAny(roleText, ["data analyst", "analyst"])) {
    return "A data analyst turns raw data into business answers. Daily work often includes cleaning data, writing SQL queries, making Excel or BI dashboards, tracking KPIs, and explaining insights. Prepare SQL, Excel, dashboarding, and communication examples.";
  }

  if (includesAny(roleText, ["teacher", "teaching"])) {
    return "A teacher plans lessons, explains concepts, manages the classroom, checks student progress, and communicates with students or parents. Prepare a short demo lesson, lesson plan, and examples of tutoring or presentation experience.";
  }

  return `A ${role} role usually means understanding the team's goals, doing the core daily tasks, communicating progress, and learning the tools used by that profession. Start by reading 3 job descriptions and listing repeated responsibilities.`;
}

function createChatReply() {
  return "Hana mock mode is active because the backend is unavailable or no OpenAI API key is configured. Start the backend and add OPENAI_API_KEY in backend/.env for natural, context-aware conversation.";
}

export function sendChatMessage(message, history = []) {
  return request("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  }).then(
    (data) =>
      data || {
        reply: createChatReply(message, history),
        heard: message,
        voice: "female_mock",
      }
  );
}

export function researchCompany(payload) {
  return request("/api/company/research", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then((data) => ({
    ...createCompanyResearch(payload),
    ...data,
  }));
}

export function analyzeJobDescription(payload) {
  return request("/api/jd/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then((data) => ({
    ...createJdAnalysis(),
    ...data,
    must_have_skills: data?.must_have_skills || data?.matched_skills || createJdAnalysis().must_have_skills,
    nice_to_have_skills:
      data?.nice_to_have_skills || data?.missing_skills || createJdAnalysis().nice_to_have_skills,
    cv_suggestions: data?.cv_suggestions || data?.next_steps || createJdAnalysis().cv_suggestions,
  }));
}

export function getProfile() {
  return request("/api/profile").then((data) => ({
    ...fallbackProfile,
    ...data,
    target_roles: data?.target_roles || data?.target_role || fallbackProfile.target_roles,
  }));
}

export function saveProfile(profile) {
  return request("/api/profile", {
    method: "POST",
    body: JSON.stringify(profile),
  }).then((data) => ({
    message: data?.message || "Profile saved in mock mode.",
    profile: {
      ...fallbackProfile,
      ...profile,
      ...data?.profile,
      target_roles: profile.target_roles || data?.profile?.target_role || fallbackProfile.target_roles,
    },
  }));
}

export function getTrackerItems() {
  return request("/api/tracker").then((data) => ({
    items: data?.items?.length ? data.items : fallbackTrackerItems,
  }));
}

export function addTrackerItem(item) {
  return request("/api/tracker", {
    method: "POST",
    body: JSON.stringify(item),
  }).then((data) => ({
    message: data?.message || "Tracker item added in mock mode.",
    item: data?.item || item,
  }));
}
