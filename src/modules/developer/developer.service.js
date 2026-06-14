import * as dbService from "../../DB/db.service.js";
import { developerModel } from "../../DB/models/developer.model.js";
import { roleEnum, userModel } from "../../DB/models/user.model.js";
import { ratingModel } from "../../DB/models/rating.model.js";
import { jobModel } from "../../DB/models/jop.model.js";
import { companyModel } from "../../DB/models/company.model.js";
import { applicationModel } from "../../DB/models/application.model.js";
import { billingHistoryModel } from "../../DB/models/billingHistory.model.js";
import { skillQuizAttemptModel } from "../../DB/models/skillQuizAttempt.model.js";
import { asyncHandeler, successResponse } from "../../utils/response.js";
import { compareHash, generateHash } from "../../utils/security/hash.security.js";

const rankConfig = {
  Bronze: { min: 0, max: 299 },
  Silver: { min: 300, max: 599 },
  Gold: { min: 600, max: 899 },
  Platinum: { min: 900, max: 1000 },
};

const QUIZ_DURATION_MINUTES = 15;
const QUIZ_TRACKS = {
  frontend: {
    key: "frontend",
    title: "Frontend Development",
    description: "React, Vue, HTML/CSS, UI architecture and responsive design.",
    accent: "blue",
    icon: "code",
    specialization: "frontend",
  },
  backend: {
    key: "backend",
    title: "Backend Development",
    description: "Node.js, Python, databases, API design and server architecture.",
    accent: "green",
    icon: "server",
    specialization: "backend",
  },
  ai: {
    key: "ai",
    title: "AI / Machine Learning",
    description: "Data models, NLP, computer vision, and predictive algorithms.",
    accent: "purple",
    icon: "sparkles",
    specialization: "ai",
  },
  uiux: {
    key: "uiux",
    title: "UI / UX Design",
    description: "Wireframing, prototyping, user research, and visual design.",
    accent: "pink",
    icon: "pen",
    specialization: "ui",
  },
};

const QUIZ_QUESTION_BANK = {
  frontend: [
    {
      id: "fe-1",
      prompt: "Which React hook is used to manage component state in functional components?",
      options: [
        { id: "a", text: "useState", isCorrect: true },
        { id: "b", text: "useEffect", isCorrect: false },
        { id: "c", text: "useContext", isCorrect: false },
        { id: "d", text: "useReducerOnly", isCorrect: false },
      ],
    },
    {
      id: "fe-2",
      prompt: "Which CSS layout is best suited for arranging items in one dimension?",
      options: [
        { id: "a", text: "Flexbox", isCorrect: true },
        { id: "b", text: "Grid", isCorrect: false },
        { id: "c", text: "Float", isCorrect: false },
        { id: "d", text: "Position absolute", isCorrect: false },
      ],
    },
    {
      id: "fe-3",
      prompt: "What does JSX compile down to in a React app?",
      options: [
        { id: "a", text: "Template literals", isCorrect: false },
        { id: "b", text: "Function calls that create elements", isCorrect: true },
        { id: "c", text: "Plain HTML files", isCorrect: false },
        { id: "d", text: "CSS modules", isCorrect: false },
      ],
    },
    {
      id: "fe-4",
      prompt: "Which metric helps detect slow page interactivity in modern web performance?",
      options: [
        { id: "a", text: "LCP", isCorrect: false },
        { id: "b", text: "CLS", isCorrect: false },
        { id: "c", text: "INP", isCorrect: true },
        { id: "d", text: "TTFB only", isCorrect: false },
      ],
    },
    {
      id: "fe-5",
      prompt: "What is the main purpose of semantic HTML?",
      options: [
        { id: "a", text: "Improve accessibility and document meaning", isCorrect: true },
        { id: "b", text: "Reduce JavaScript bundle size", isCorrect: false },
        { id: "c", text: "Replace CSS", isCorrect: false },
        { id: "d", text: "Disable SEO crawlers", isCorrect: false },
      ],
    },
    {
      id: "fe-6",
      prompt: "Which tool is commonly used to manage predictable state in larger React apps?",
      options: [
        { id: "a", text: "Redux Toolkit", isCorrect: true },
        { id: "b", text: "Express", isCorrect: false },
        { id: "c", text: "MongoDB", isCorrect: false },
        { id: "d", text: "Nginx", isCorrect: false },
      ],
    },
    {
      id: "fe-7",
      prompt: "Why would you use lazy loading for routes or components?",
      options: [
        { id: "a", text: "To split the bundle and load code on demand", isCorrect: true },
        { id: "b", text: "To prevent API requests", isCorrect: false },
        { id: "c", text: "To disable caching", isCorrect: false },
        { id: "d", text: "To replace HTML", isCorrect: false },
      ],
    },
    {
      id: "fe-8",
      prompt: "Which attribute improves image loading performance without JavaScript?",
      options: [
        { id: "a", text: "preload", isCorrect: false },
        { id: "b", text: "lazy", isCorrect: false },
        { id: "c", text: "loading=\"lazy\"", isCorrect: true },
        { id: "d", text: "fetchpriority=\"off\"", isCorrect: false },
      ],
    },
    {
      id: "fe-9",
      prompt: "Which statement about controlled inputs in React is correct?",
      options: [
        { id: "a", text: "Their value is driven by component state", isCorrect: true },
        { id: "b", text: "They cannot be validated", isCorrect: false },
        { id: "c", text: "They only work with Redux", isCorrect: false },
        { id: "d", text: "They avoid all rerenders", isCorrect: false },
      ],
    },
    {
      id: "fe-10",
      prompt: "What is the main goal of responsive design?",
      options: [
        { id: "a", text: "Support different screen sizes and devices", isCorrect: true },
        { id: "b", text: "Eliminate media queries entirely", isCorrect: false },
        { id: "c", text: "Use only desktop-first layouts", isCorrect: false },
        { id: "d", text: "Replace accessibility testing", isCorrect: false },
      ],
    },
  ],
  backend: [
    {
      id: "be-1",
      prompt: "Which HTTP method is typically used to create a new resource?",
      options: [
        { id: "a", text: "GET", isCorrect: false },
        { id: "b", text: "POST", isCorrect: true },
        { id: "c", text: "PATCH", isCorrect: false },
        { id: "d", text: "DELETE", isCorrect: false },
      ],
    },
    {
      id: "be-2",
      prompt: "What is the primary purpose of database indexing?",
      options: [
        { id: "a", text: "Encrypt rows", isCorrect: false },
        { id: "b", text: "Speed up lookups and queries", isCorrect: true },
        { id: "c", text: "Increase storage usage on purpose", isCorrect: false },
        { id: "d", text: "Replace backups", isCorrect: false },
      ],
    },
    {
      id: "be-3",
      prompt: "Which status code usually means the client is not authenticated?",
      options: [
        { id: "a", text: "200", isCorrect: false },
        { id: "b", text: "401", isCorrect: true },
        { id: "c", text: "403", isCorrect: false },
        { id: "d", text: "500", isCorrect: false },
      ],
    },
    {
      id: "be-4",
      prompt: "Why are environment variables used on servers?",
      options: [
        { id: "a", text: "To keep configuration and secrets outside source code", isCorrect: true },
        { id: "b", text: "To reduce database indexes", isCorrect: false },
        { id: "c", text: "To replace validation", isCorrect: false },
        { id: "d", text: "To disable logging", isCorrect: false },
      ],
    },
    {
      id: "be-5",
      prompt: "Which concept helps APIs prevent too many repeated requests from one client?",
      options: [
        { id: "a", text: "Rate limiting", isCorrect: true },
        { id: "b", text: "Minification", isCorrect: false },
        { id: "c", text: "Templating", isCorrect: false },
        { id: "d", text: "Tree shaking", isCorrect: false },
      ],
    },
    {
      id: "be-6",
      prompt: "What is the purpose of a transaction in a database?",
      options: [
        { id: "a", text: "Run several operations atomically", isCorrect: true },
        { id: "b", text: "Make all queries public", isCorrect: false },
        { id: "c", text: "Delete old backups", isCorrect: false },
        { id: "d", text: "Replace indexes", isCorrect: false },
      ],
    },
    {
      id: "be-7",
      prompt: "Which architecture style is commonly used for stateless web APIs?",
      options: [
        { id: "a", text: "REST", isCorrect: true },
        { id: "b", text: "MVC View only", isCorrect: false },
        { id: "c", text: "Monolith CSS", isCorrect: false },
        { id: "d", text: "DOM routing", isCorrect: false },
      ],
    },
    {
      id: "be-8",
      prompt: "What does middleware do in an Express app?",
      options: [
        { id: "a", text: "Processes requests and responses in the chain", isCorrect: true },
        { id: "b", text: "Compiles TypeScript to Java", isCorrect: false },
        { id: "c", text: "Creates database schemas only", isCorrect: false },
        { id: "d", text: "Replaces the router permanently", isCorrect: false },
      ],
    },
    {
      id: "be-9",
      prompt: "Which practice best protects passwords in storage?",
      options: [
        { id: "a", text: "Base64 encoding", isCorrect: false },
        { id: "b", text: "Hashing with salt", isCorrect: true },
        { id: "c", text: "Saving plain text", isCorrect: false },
        { id: "d", text: "Putting them in logs", isCorrect: false },
      ],
    },
    {
      id: "be-10",
      prompt: "What is a common reason to use a message queue?",
      options: [
        { id: "a", text: "Handle async background work reliably", isCorrect: true },
        { id: "b", text: "Replace authentication", isCorrect: false },
        { id: "c", text: "Avoid all database writes", isCorrect: false },
        { id: "d", text: "Style web pages", isCorrect: false },
      ],
    },
  ],
  ai: [
    {
      id: "ai-1",
      prompt: "What is the usual purpose of a train/validation/test split?",
      options: [
        { id: "a", text: "To evaluate generalization properly", isCorrect: true },
        { id: "b", text: "To compress datasets", isCorrect: false },
        { id: "c", text: "To remove labels", isCorrect: false },
        { id: "d", text: "To replace feature engineering", isCorrect: false },
      ],
    },
    {
      id: "ai-2",
      prompt: "Which metric is commonly used for classification problems?",
      options: [
        { id: "a", text: "Accuracy", isCorrect: true },
        { id: "b", text: "Mean depth", isCorrect: false },
        { id: "c", text: "Render latency", isCorrect: false },
        { id: "d", text: "Frame rate", isCorrect: false },
      ],
    },
    {
      id: "ai-3",
      prompt: "What is overfitting?",
      options: [
        { id: "a", text: "The model learns training noise and performs poorly on new data", isCorrect: true },
        { id: "b", text: "The model trains too fast", isCorrect: false },
        { id: "c", text: "The dataset has no labels", isCorrect: false },
        { id: "d", text: "The model uses GPUs", isCorrect: false },
      ],
    },
    {
      id: "ai-4",
      prompt: "Which model family is strongly associated with sequence tasks in NLP?",
      options: [
        { id: "a", text: "Transformers", isCorrect: true },
        { id: "b", text: "CSS grids", isCorrect: false },
        { id: "c", text: "B-trees", isCorrect: false },
        { id: "d", text: "Cron jobs", isCorrect: false },
      ],
    },
    {
      id: "ai-5",
      prompt: "What is feature engineering?",
      options: [
        { id: "a", text: "Designing useful inputs for the model", isCorrect: true },
        { id: "b", text: "Deploying servers", isCorrect: false },
        { id: "c", text: "Styling dashboards", isCorrect: false },
        { id: "d", text: "Creating CSS animations", isCorrect: false },
      ],
    },
    {
      id: "ai-6",
      prompt: "Which task predicts a continuous numeric value?",
      options: [
        { id: "a", text: "Regression", isCorrect: true },
        { id: "b", text: "Classification", isCorrect: false },
        { id: "c", text: "Clustering labels only", isCorrect: false },
        { id: "d", text: "Tokenization", isCorrect: false },
      ],
    },
    {
      id: "ai-7",
      prompt: "Why is normalization often used in ML pipelines?",
      options: [
        { id: "a", text: "To scale features to comparable ranges", isCorrect: true },
        { id: "b", text: "To increase random noise", isCorrect: false },
        { id: "c", text: "To remove target values", isCorrect: false },
        { id: "d", text: "To replace model evaluation", isCorrect: false },
      ],
    },
    {
      id: "ai-8",
      prompt: "Which term describes model output probabilities converted to class choices?",
      options: [
        { id: "a", text: "Thresholding", isCorrect: true },
        { id: "b", text: "Pagination", isCorrect: false },
        { id: "c", text: "Versioning", isCorrect: false },
        { id: "d", text: "Serialization only", isCorrect: false },
      ],
    },
    {
      id: "ai-9",
      prompt: "What is the purpose of a confusion matrix?",
      options: [
        { id: "a", text: "Show prediction outcomes by class", isCorrect: true },
        { id: "b", text: "Store model weights", isCorrect: false },
        { id: "c", text: "Create embeddings", isCorrect: false },
        { id: "d", text: "Measure API uptime", isCorrect: false },
      ],
    },
    {
      id: "ai-10",
      prompt: "Which approach is most related to grouping unlabeled data?",
      options: [
        { id: "a", text: "Clustering", isCorrect: true },
        { id: "b", text: "Supervised fine-tuning", isCorrect: false },
        { id: "c", text: "Regression", isCorrect: false },
        { id: "d", text: "A/B testing", isCorrect: false },
      ],
    },
  ],
  uiux: [
    {
      id: "ux-1",
      prompt: "What is the main purpose of a wireframe?",
      options: [
        { id: "a", text: "Outline structure and layout before final visuals", isCorrect: true },
        { id: "b", text: "Deploy the backend", isCorrect: false },
        { id: "c", text: "Store analytics", isCorrect: false },
        { id: "d", text: "Replace user testing", isCorrect: false },
      ],
    },
    {
      id: "ux-2",
      prompt: "Which activity helps understand user needs and pain points?",
      options: [
        { id: "a", text: "User research", isCorrect: true },
        { id: "b", text: "Database sharding", isCorrect: false },
        { id: "c", text: "Cache warming", isCorrect: false },
        { id: "d", text: "Minification", isCorrect: false },
      ],
    },
    {
      id: "ux-3",
      prompt: "What does UX primarily focus on?",
      options: [
        { id: "a", text: "Overall user experience and task flow", isCorrect: true },
        { id: "b", text: "Only icon colors", isCorrect: false },
        { id: "c", text: "Server memory allocation", isCorrect: false },
        { id: "d", text: "Only typography licensing", isCorrect: false },
      ],
    },
    {
      id: "ux-4",
      prompt: "Why are prototypes useful?",
      options: [
        { id: "a", text: "They allow testing ideas before full implementation", isCorrect: true },
        { id: "b", text: "They replace requirement gathering", isCorrect: false },
        { id: "c", text: "They automatically generate perfect UX", isCorrect: false },
        { id: "d", text: "They prevent stakeholder feedback", isCorrect: false },
      ],
    },
    {
      id: "ux-5",
      prompt: "What is a design system?",
      options: [
        { id: "a", text: "A reusable set of components, patterns, and rules", isCorrect: true },
        { id: "b", text: "Only a color palette", isCorrect: false },
        { id: "c", text: "A logging dashboard", isCorrect: false },
        { id: "d", text: "A database schema", isCorrect: false },
      ],
    },
    {
      id: "ux-6",
      prompt: "Which principle is most related to accessibility?",
      options: [
        { id: "a", text: "Designing for contrast, keyboard use, and readable content", isCorrect: true },
        { id: "b", text: "Using hidden text only", isCorrect: false },
        { id: "c", text: "Avoiding form labels", isCorrect: false },
        { id: "d", text: "Reducing all font sizes", isCorrect: false },
      ],
    },
    {
      id: "ux-7",
      prompt: "What is the value of user journey mapping?",
      options: [
        { id: "a", text: "It visualizes the user's path and friction points", isCorrect: true },
        { id: "b", text: "It encrypts design files", isCorrect: false },
        { id: "c", text: "It replaces all analytics", isCorrect: false },
        { id: "d", text: "It builds APIs", isCorrect: false },
      ],
    },
    {
      id: "ux-8",
      prompt: "Which method is best for learning if users can complete tasks successfully?",
      options: [
        { id: "a", text: "Usability testing", isCorrect: true },
        { id: "b", text: "Schema migration", isCorrect: false },
        { id: "c", text: "Token rotation", isCorrect: false },
        { id: "d", text: "Compression only", isCorrect: false },
      ],
    },
    {
      id: "ux-9",
      prompt: "What does information architecture help organize?",
      options: [
        { id: "a", text: "Content, navigation, and hierarchy", isCorrect: true },
        { id: "b", text: "Server clusters", isCorrect: false },
        { id: "c", text: "Git branches only", isCorrect: false },
        { id: "d", text: "Password hashes", isCorrect: false },
      ],
    },
    {
      id: "ux-10",
      prompt: "Which statement best describes good visual hierarchy?",
      options: [
        { id: "a", text: "Important content is easier to notice and scan", isCorrect: true },
        { id: "b", text: "Every element has the same emphasis", isCorrect: false },
        { id: "c", text: "Buttons should always be hidden", isCorrect: false },
        { id: "d", text: "All pages should be text-only", isCorrect: false },
      ],
    },
  ],
};

const resolveRankByPoints = (points = 0) => {
  if (points >= rankConfig.Platinum.min) return "Platinum";
  if (points >= rankConfig.Gold.min) return "Gold";
  if (points >= rankConfig.Silver.min) return "Silver";
  return "Bronze";
};

const formatCompactCurrency = (amount = 0) => {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${Number(amount || 0).toFixed(1)}`;
};

const toBudgetLabel = ({ min, max }) => {
  if (min && max) return `$${min} - $${max}`;
  if (min) return `From $${min}`;
  if (max) return `Up to $${max}`;
  return "Not specified";
};

const formatProjectBudgetLabel = (job = {}) => {
  if (job.budgetMin && job.budgetMax) return `$${job.budgetMin} - $${job.budgetMax}`;
  if (job.budget) return `$${job.budget}`;
  if (job.budgetMin) return `From $${job.budgetMin}`;
  if (job.budgetMax) return `Up to $${job.budgetMax}`;
  return "Not specified";
};

const formatPostedAgo = (date) => {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  const weeks = Math.floor(diffDays / 7);
  if (weeks === 1) return "1 week ago";
  return `${weeks} weeks ago`;
};

const formatProjectDuration = (job = {}) => {
  if (job.estimatedDuration) return job.estimatedDuration;
  if (!job.deadline) return "";

  const diffMs = new Date(job.deadline).getTime() - Date.now();
  const diffDays = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
  if (diffDays === 0) return "due today";
  if (diffDays < 30) return `${diffDays} days`;
  const months = Math.max(1, Math.round(diffDays / 30));
  return months === 1 ? "1 month" : `${months} months`;
};

const getTrackByKey = (trackKey) => QUIZ_TRACKS[trackKey] || null;

const getQuestionsForTrack = (trackKey) => QUIZ_QUESTION_BANK[trackKey] || [];

const sanitizeQuestion = (question) => ({
  questionId: question.id,
  prompt: question.prompt,
  options: question.options.map((option) => ({
    optionId: option.id,
    text: option.text,
  })),
});

const buildQuizNavigator = ({ questions = [], answers = [] }) => {
  const answeredIds = new Set((answers || []).map((item) => item.questionId));
  return questions.map((question, index) => ({
    questionId: question.id,
    number: index + 1,
    answered: answeredIds.has(question.id),
  }));
};

const getRemainingSeconds = (attempt) => {
  const diff = Math.floor((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000);
  return Math.max(diff, 0);
};

const buildAttemptPayload = ({ attempt, includeAnswers = true }) => {
  const questions = getQuestionsForTrack(attempt.trackKey);
  const currentAnswers = includeAnswers ? attempt.answers || [] : [];
  const answersMap = new Map(currentAnswers.map((item) => [item.questionId, item.selectedOptionId]));

  return {
    attemptId: attempt._id,
    track: getTrackByKey(attempt.trackKey),
    status: attempt.status,
    totalQuestions: attempt.totalQuestions,
    answeredQuestions: currentAnswers.length,
    remainingSeconds: getRemainingSeconds(attempt),
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
    navigator: buildQuizNavigator({ questions, answers: currentAnswers }),
    questions: questions.map((question, index) => ({
      ...sanitizeQuestion(question),
      number: index + 1,
      selectedOptionId: answersMap.get(question.id) || null,
    })),
  };
};

const buildQuizTracksPayload = () =>
  Object.values(QUIZ_TRACKS).map((track) => ({
    ...track,
    questionsCount: getQuestionsForTrack(track.key).length,
    estimatedMinutes: QUIZ_DURATION_MINUTES,
  }));

const ensureActiveAttemptOrThrow = async ({ developerId, attemptId, next }) => {
  const attempt = await dbService.findOne({
    model: skillQuizAttemptModel,
    filter: {
      _id: attemptId,
      developer: developerId,
    },
  });

  if (!attempt) {
    next(new Error("quiz attempt not found", { cause: 404 }));
    return null;
  }

  if (attempt.status !== "active") {
    next(new Error("quiz attempt is no longer active", { cause: 409 }));
    return null;
  }

  if (getRemainingSeconds(attempt) <= 0) {
    await dbService.findOneAndUpdate({
      model: skillQuizAttemptModel,
      filter: { _id: attemptId },
      data: { status: "expired" },
    });
    next(new Error("quiz time expired", { cause: 409 }));
    return null;
  }

  return attempt;
};

const ensureDeveloperRole = (req, next) => {
  if (req.user?.role !== roleEnum.developer) {
    next(
      new Error(
        `not allowed: developer access required, current role is ${req.user?.role || "unknown"}`,
        { cause: 403 }
      )
    );
    return false;
  }

  return true;
};

const getDeveloperProfileOrThrow = async (userId, next) => {
  const profile = await dbService.findOne({
    model: developerModel,
    filter: { user: userId },
  });

  if (!profile) {
    next(new Error("developer profile not found", { cause: 404 }));
    return null;
  }

  return profile;
};

const buildRankProgress = async (developerId, skillsCount = 0) => {
  const ratingAgg = await ratingModel.aggregate([
    { $match: { developer: developerId } },
    {
      $group: {
        _id: "$developer",
        completedProjects: { $addToSet: "$project" },
        performanceScore: { $avg: "$overall" },
      },
    },
  ]);

  const completedProjects = ratingAgg[0]?.completedProjects?.length || 0;
  const performanceScoreRaw = ratingAgg[0]?.performanceScore || 0;
  const performanceScore = Number(performanceScoreRaw.toFixed(1));

  const rawPoints = Math.round(completedProjects * 70 + performanceScore * 40 + skillsCount * 5);
  const points = Math.min(1000, rawPoints);
  const currentRank = resolveRankByPoints(points);

  return {
    currentRank,
    points,
    targetPoints: 1000,
    completedProjects,
    performanceScore,
    progressPercent: Math.round((points / 1000) * 100),
  };
};

const buildRecommendedJobs = async ({ skills = [], developerId }) => {
  const skillList = (skills || []).map((item) => item.toLowerCase());

  const existingApplications = await applicationModel.find({ developer: developerId }).select("job");
  const appliedJobIds = existingApplications.map((item) => item.job);

  const activeJobs = await jobModel
    .find({
      status: "active",
      _id: { $nin: appliedJobIds },
    })
    .sort({ createdAt: -1 })
    .limit(20);

  const scoredJobs = activeJobs
    .map((job) => {
      const jobSkills = (job.skills || []).map((item) => item.toLowerCase());
      const matchedSkills = jobSkills.filter((item) => skillList.includes(item));

      return {
        job,
        matchedScore: matchedSkills.length,
      };
    })
    .filter((item) => item.matchedScore > 0)
    .sort((a, b) => b.matchedScore - a.matchedScore)
    .slice(0, 10)
    .map((item) => ({
      jobId: item.job._id,
      jobTitle: item.job.title,
      requiredSkills: item.job.skills || [],
      budget: {
        min: item.job.budgetMin,
        max: item.job.budgetMax,
      },
      matchedSkillsCount: item.matchedScore,
      status: item.job.status,
    }));

  return scoredJobs;
};

export const getMyProfile = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  return successResponse({
    res,
    data: { developerProfile: profile },
  });
});

export const getDeveloperDashboard = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  const rankProgress = await buildRankProgress(req.user._id, profile.skills?.length || 0);

  if (profile.rank !== rankProgress.currentRank || profile.rankPoints !== rankProgress.points) {
    await dbService.findOneAndUpdate({
      model: developerModel,
      filter: { user: req.user._id },
      data: {
        rank: rankProgress.currentRank,
        rankPoints: rankProgress.points,
      },
    });
    profile.rank = rankProgress.currentRank;
    profile.rankPoints = rankProgress.points;
  }

  const applications = await applicationModel
    .find({ developer: req.user._id })
    .populate([{ path: "job", select: "title description budgetMin budgetMax status skills workMode" }])
    .sort({ createdAt: -1 });

  const activeFromHistory = (profile.workHistory || [])
    .filter((item) => item.status === "ongoing")
    .map((item) => ({
      projectName: item.projectTitle,
      summary: item.role || "",
      clientName: item.clientName || "",
      deadline: item.deadline || null,
      progress: item.progress || 0,
      progressPercent: item.progress || 0,
      status: "active",
      statusBadge: "active",
    }));

  const plannedFromApplications = applications
    .filter((item) => item.status === "pending")
    .slice(0, 5)
    .map((item) => ({
      projectName: item.job?.title || "Unknown Job",
      summary: item.job?.description || "",
      clientName: "",
      deadline: null,
      progress: 0,
      progressPercent: 0,
      status: "planned",
      statusBadge: "planned",
    }));

  const activeWork = [...activeFromHistory, ...plannedFromApplications].slice(0, 10);

  const recommendedJobs = await buildRecommendedJobs({
    skills: profile.skills || [],
    developerId: req.user._id,
  });

  const earningsAgg = await billingHistoryModel.aggregate([
    { $match: { user: req.user._id, status: "paid" } },
    {
      $group: {
        _id: "$user",
        total: { $sum: "$amount" },
      },
    },
  ]);

  const totalEarnings = earningsAgg[0]?.total || 0;

  return successResponse({
    res,
    message: "developer dashboard fetched successfully",
    data: {
      greeting: {
        title: `Hello ${profile.fullName || "Developer"}, manage your work.`,
        subtitle: "Track your projects, applications, and performance metrics.",
      },
      header: {
        profilePicture: profile.profilePicture?.url || "",
        developerName: profile.fullName,
        role: profile.title || profile.specialization || "Developer",
        rank: profile.rank,
      },
      quickStats: {
        activeJobs: activeWork.length,
        activeProjects: activeWork.length,
        appliedProjects: applications.length,
        totalEarnings,
        totalEarningsLabel: formatCompactCurrency(totalEarnings),
        currentRank: profile.rank,
      },
      activeWork,
      applications: applications.map((item) => ({
        applicationId: item._id,
        projectName: item.job?.title || "Unknown Job",
        projectDescription: item.job?.description || "",
        proposedBudget: item.proposedBudget,
        proposedBudgetLabel: formatCompactCurrency(item.proposedBudget),
        status: item.status,
        action: {
          viewProposal: `/developer/applications/${item._id}`,
        },
      })),
      recommendedJobs: recommendedJobs.map((item) => ({
        ...item,
        budgetLabel: toBudgetLabel(item.budget || {}),
        action: {
          apply: `/developer/jobs/${item.jobId}/apply`,
          view: `/jobs/${item.jobId}`,
        },
      })),
      performance: {
        averageRating: rankProgress.performanceScore,
        averageRatingText: `${rankProgress.performanceScore}/5.0`,
        completedProjects: rankProgress.completedProjects,
      },
      profile,
    },
  });
});

export const getSkillQuizTracks = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const activeAttempt = await dbService.findOne({
    model: skillQuizAttemptModel,
    filter: {
      developer: req.user._id,
      status: "active",
    },
  });

  return successResponse({
    res,
    message: "skill quiz tracks fetched successfully",
    data: {
      pageTitle: "Skill Assessment",
      intro:
        "Choose the primary track you want to be assessed on, then complete the timed quiz.",
      tracks: buildQuizTracksPayload(),
      activeAttempt: activeAttempt ? buildAttemptPayload({ attempt: activeAttempt }) : null,
    },
  });
});

export const startSkillQuiz = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const { trackKey } = req.body;
  const track = getTrackByKey(trackKey);
  const questions = getQuestionsForTrack(trackKey);

  if (!track || questions.length === 0) {
    return next(new Error("quiz track not found", { cause: 404 }));
  }

  const existingActiveAttempt = await dbService.findOne({
    model: skillQuizAttemptModel,
    filter: {
      developer: req.user._id,
      status: "active",
    },
  });

  if (existingActiveAttempt && getRemainingSeconds(existingActiveAttempt) > 0) {
    return successResponse({
      res,
      message: "active skill quiz attempt fetched successfully",
      data: {
        attempt: buildAttemptPayload({ attempt: existingActiveAttempt }),
      },
    });
  }

  if (existingActiveAttempt) {
    await dbService.findOneAndUpdate({
      model: skillQuizAttemptModel,
      filter: { _id: existingActiveAttempt._id },
      data: { status: "expired" },
    });
  }

  const [attempt] = await dbService.create({
    model: skillQuizAttemptModel,
    data: [
      {
        developer: req.user._id,
        trackKey,
        totalQuestions: questions.length,
        expiresAt: new Date(Date.now() + QUIZ_DURATION_MINUTES * 60 * 1000),
        answers: [],
      },
    ],
  });

  return successResponse({
    res,
    status: 201,
    message: "skill quiz started successfully",
    data: {
      attempt: buildAttemptPayload({ attempt }),
    },
  });
});

export const getCurrentSkillQuizAttempt = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const activeAttempt = await dbService.findOne({
    model: skillQuizAttemptModel,
    filter: {
      developer: req.user._id,
      status: "active",
    },
  });

  if (!activeAttempt || getRemainingSeconds(activeAttempt) <= 0) {
    if (activeAttempt) {
      await dbService.findOneAndUpdate({
        model: skillQuizAttemptModel,
        filter: { _id: activeAttempt._id },
        data: { status: "expired" },
      });
    }

    return successResponse({
      res,
      message: "no active skill quiz attempt",
      data: { attempt: null },
    });
  }

  return successResponse({
    res,
    message: "active skill quiz attempt fetched successfully",
    data: {
      attempt: buildAttemptPayload({ attempt: activeAttempt }),
    },
  });
});

export const answerSkillQuizQuestion = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const { attemptId } = req.params;
  const { questionId, selectedOptionId } = req.body;

  const attempt = await ensureActiveAttemptOrThrow({
    developerId: req.user._id,
    attemptId,
    next,
  });
  if (!attempt) return;

  const questions = getQuestionsForTrack(attempt.trackKey);
  const question = questions.find((item) => item.id === questionId);

  if (!question) {
    return next(new Error("question not found for this track", { cause: 404 }));
  }

  const optionExists = question.options.some((option) => option.id === selectedOptionId);
  if (!optionExists) {
    return next(new Error("selected option is invalid", { cause: 400 }));
  }

  const nextAnswers = [...(attempt.answers || [])];
  const existingIndex = nextAnswers.findIndex((item) => item.questionId === questionId);
  const isCorrect =
    question.options.find((option) => option.id === selectedOptionId)?.isCorrect || false;

  if (existingIndex >= 0) {
    nextAnswers[existingIndex] = { questionId, selectedOptionId, isCorrect };
  } else {
    nextAnswers.push({ questionId, selectedOptionId, isCorrect });
  }

  const updatedAttempt = await dbService.findOneAndUpdate({
    model: skillQuizAttemptModel,
    filter: { _id: attemptId, developer: req.user._id },
    data: { answers: nextAnswers },
  });

  return successResponse({
    res,
    message: "quiz answer saved successfully",
    data: {
      attempt: buildAttemptPayload({ attempt: updatedAttempt }),
    },
  });
});

export const submitSkillQuiz = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const { attemptId } = req.params;
  const attempt = await ensureActiveAttemptOrThrow({
    developerId: req.user._id,
    attemptId,
    next,
  });
  if (!attempt) return;

  const track = getTrackByKey(attempt.trackKey);
  const totalQuestions = attempt.totalQuestions || getQuestionsForTrack(attempt.trackKey).length;
  const correctAnswers = (attempt.answers || []).filter((item) => item.isCorrect).length;
  const percentage = totalQuestions ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const rankBonus = Math.min(200, correctAnswers * 10);

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  const nextPoints = Math.min(1000, Number(profile.rankPoints || 0) + rankBonus);
  const nextRank = resolveRankByPoints(nextPoints);
  const nextExperienceLevel =
    percentage >= 80 ? "senior" : percentage >= 50 ? "mid" : "junior";

  const [updatedAttempt, updatedProfile] = await Promise.all([
    dbService.findOneAndUpdate({
      model: skillQuizAttemptModel,
      filter: { _id: attemptId, developer: req.user._id },
      data: {
        status: "submitted",
        score: correctAnswers,
        submittedAt: new Date(),
      },
    }),
    dbService.findOneAndUpdate({
      model: developerModel,
      filter: { user: req.user._id },
      data: {
        specialization: track.specialization,
        experienceLevel: nextExperienceLevel,
        rankPoints: nextPoints,
        rank: nextRank,
      },
    }),
  ]);

  return successResponse({
    res,
    message: "skill quiz submitted successfully",
    data: {
      result: {
        attemptId: updatedAttempt._id,
        track,
        score: correctAnswers,
        totalQuestions,
        percentage,
        answeredQuestions: (attempt.answers || []).length,
        awardedRankPoints: rankBonus,
        updatedRank: nextRank,
        updatedExperienceLevel: nextExperienceLevel,
      },
      profile: updatedProfile,
    },
  });
});

export const createDeveloperProfile = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const userId = req.user._id;
  const { fullName, skills, bio = "", title = "", yearsExperience = 0, specialization, experienceLevel } = req.body;

  const exists = await dbService.findOne({
    model: developerModel,
    filter: { user: userId },
  });

  if (exists) {
    return next(new Error("profile already exists", { cause: 409 }));
  }

  const [profile] = await dbService.create({
    model: developerModel,
    data: [
      {
        user: userId,
        fullName,
        skills,
        bio,
        title,
        yearsExperience,
        specialization,
        experienceLevel,
      },
    ],
  });

  return successResponse({
    res,
    status: 201,
    message: "Developer profile created",
    data: { profile },
  });
});

export const updateDeveloperProfile = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  const {
    fullName,
    bio,
    title,
    yearsExperience,
    specialization,
    experienceLevel,
    availability,
    isOnline,
    githubUrl,
  } = req.body;

  const updatedProfile = await dbService.findOneAndUpdate({
    model: developerModel,
    filter: { user: req.user._id },
    data: {
      ...(fullName !== undefined && { fullName }),
      ...(bio !== undefined && { bio }),
      ...(title !== undefined && { title }),
      ...(yearsExperience !== undefined && { yearsExperience }),
      ...(specialization !== undefined && { specialization }),
      ...(experienceLevel !== undefined && { experienceLevel }),
      ...(availability !== undefined && { availability }),
      ...(isOnline !== undefined && { isOnline }),
      ...(githubUrl !== undefined && { githubUrl }),
    },
  });

  return successResponse({
    res,
    message: "Developer profile updated successfully",
    data: { profile: updatedProfile },
  });
});

export const uploadDeveloperProfileImage = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  if (!req.file) {
    return next(new Error("image is required", { cause: 400 }));
  }

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

  const updatedProfile = await dbService.findOneAndUpdate({
    model: developerModel,
    filter: { user: req.user._id },
    data: {
      profilePicture: {
        url: imageUrl,
        publicId: req.file.filename,
      },
    },
  });

  return successResponse({
    res,
    message: "developer profile image updated successfully",
    data: {
      profilePicture: updatedProfile.profilePicture,
      profile: updatedProfile,
    },
  });
});

export const updateDeveloperSkills = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const { skills } = req.body;

  const updatedProfile = await dbService.findOneAndUpdate({
    model: developerModel,
    filter: { user: req.user._id },
    data: { skills },
  });

  if (!updatedProfile) {
    return next(new Error("developer profile not found", { cause: 404 }));
  }

  return successResponse({
    res,
    message: "Developer skills updated successfully",
    data: { profile: updatedProfile },
  });
});

export const addSkill = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const { skill } = req.body;

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  const normalizedSkill = skill.trim();
  const hasSkill = (profile.skills || []).some(
    (item) => item.toLowerCase() === normalizedSkill.toLowerCase()
  );

  if (hasSkill) {
    return next(new Error("skill already exists", { cause: 409 }));
  }

  const updatedProfile = await dbService.findOneAndUpdate({
    model: developerModel,
    filter: { user: req.user._id },
    data: {
      skills: [...(profile.skills || []), normalizedSkill],
    },
  });

  return successResponse({
    res,
    status: 201,
    message: "skill added successfully",
    data: { profile: updatedProfile },
  });
});

export const removeSkill = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const { skill } = req.params;

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  const updatedSkills = (profile.skills || []).filter(
    (item) => item.toLowerCase() !== skill.toLowerCase()
  );

  const updatedProfile = await dbService.findOneAndUpdate({
    model: developerModel,
    filter: { user: req.user._id },
    data: { skills: updatedSkills },
  });

  return successResponse({
    res,
    message: "skill removed successfully",
    data: { profile: updatedProfile },
  });
});

export const addPortfolioItem = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  const {
    title,
    description,
    technologies = [],
    roleInProject = "",
    projectUrl = "",
    githubUrl = "",
  } = req.body;

  const updatedProfile = await dbService.findOneAndUpdate({
    model: developerModel,
    filter: { user: req.user._id },
    data: {
      $push: {
        portfolio: {
          title,
          description,
          technologies,
          roleInProject,
          projectUrl,
          githubUrl,
        },
      },
    },
  });

  return successResponse({
    res,
    status: 201,
    message: "portfolio item added successfully",
    data: { profile: updatedProfile },
  });
});

export const updatePortfolioItem = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const { itemId } = req.params;

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  const itemIndex = (profile.portfolio || []).findIndex(
    (item) => String(item._id) === String(itemId)
  );

  if (itemIndex === -1) {
    return next(new Error("portfolio item not found", { cause: 404 }));
  }

  const current = profile.portfolio[itemIndex];
  const updatedItem = {
    ...current.toObject(),
    ...req.body,
  };

  const updatedPortfolio = [...profile.portfolio];
  updatedPortfolio[itemIndex] = updatedItem;

  const updatedProfile = await dbService.findOneAndUpdate({
    model: developerModel,
    filter: { user: req.user._id },
    data: { portfolio: updatedPortfolio },
  });

  return successResponse({
    res,
    message: "portfolio item updated successfully",
    data: { profile: updatedProfile },
  });
});

export const deletePortfolioItem = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const { itemId } = req.params;

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  const updatedPortfolio = (profile.portfolio || []).filter(
    (item) => String(item._id) !== String(itemId)
  );

  const updatedProfile = await dbService.findOneAndUpdate({
    model: developerModel,
    filter: { user: req.user._id },
    data: { portfolio: updatedPortfolio },
  });

  return successResponse({
    res,
    message: "portfolio item deleted successfully",
    data: { profile: updatedProfile },
  });
});

export const addWorkHistoryItem = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  const {
    projectTitle,
    clientName = "",
    role,
    deadline = null,
    progress = 0,
    duration = "",
    months = 0,
    status = "completed",
    rating = 0,
  } = req.body;

  const updatedProfile = await dbService.findOneAndUpdate({
    model: developerModel,
    filter: { user: req.user._id },
    data: {
      $push: {
        workHistory: {
          projectTitle,
          clientName,
          role,
          deadline,
          progress,
          duration,
          months,
          status,
          rating,
        },
      },
    },
  });

  return successResponse({
    res,
    status: 201,
    message: "work history item added successfully",
    data: { profile: updatedProfile },
  });
});

export const getWorkHistory = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  const autoWorkHistory = await ratingModel
    .find({ developer: req.user._id })
    .populate([{ path: "project", select: "title status clientName" }])
    .sort({ createdAt: -1 })
    .limit(20);

  return successResponse({
    res,
    data: {
      manual: profile.workHistory || [],
      auto: autoWorkHistory.map((item) => ({
        projectTitle: item.project?.title || "Unknown Project",
        clientName: item.project?.clientName || "",
        role: profile.title || "Developer",
        deadline: null,
        progress: item.project?.status === "completed" ? 100 : 0,
        duration: "",
        months: 0,
        status: item.project?.status === "completed" ? "completed" : "ongoing",
        rating: item.overall || 0,
      })),
    },
  });
});

export const getRankProgress = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  const rankProgress = await buildRankProgress(req.user._id, profile.skills?.length || 0);

  const updatedProfile = await dbService.findOneAndUpdate({
    model: developerModel,
    filter: { user: req.user._id },
    data: {
      rank: rankProgress.currentRank,
      rankPoints: rankProgress.points,
    },
  });

  return successResponse({
    res,
    data: {
      rankProgress,
      profile: updatedProfile,
    },
  });
});

export const browseDeveloperProjects = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const {
    search = "",
    skill = "",
    workMode,
    status = "all",
    page = 1,
    limit = 10,
  } = req.query;

  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  const normalizedSearch = String(search || "").trim();
  const normalizedSkill = String(skill || "").trim();

  const applicationRows = await applicationModel
    .find({ developer: req.user._id })
    .select("job status proposedBudget createdAt");

  const appliedJobIds = applicationRows.map((item) => String(item.job));
  const applicationMap = new Map(applicationRows.map((item) => [String(item.job), item]));

  const baseFilter = {
    publicationStatus: "published",
    ...(workMode ? { workMode } : {}),
    ...(normalizedSkill ? { skills: { $regex: new RegExp(normalizedSkill, "i") } } : {}),
    ...(normalizedSearch
      ? {
          $or: [
            { title: { $regex: normalizedSearch, $options: "i" } },
            { description: { $regex: normalizedSearch, $options: "i" } },
            { skills: { $regex: new RegExp(normalizedSearch, "i") } },
            { location: { $regex: normalizedSearch, $options: "i" } },
          ],
        }
      : {}),
  };

  const jobs = await jobModel.find(baseFilter).sort({ createdAt: -1 });
  const companyIds = [...new Set(jobs.map((job) => String(job.company)))];
  const companyProfiles = await companyModel.find({ user: { $in: companyIds } });
  const companyMap = new Map(companyProfiles.map((profile) => [String(profile.user), profile]));

  const allProjects = jobs.map((job) => {
    const application = applicationMap.get(String(job._id));
    const company = companyMap.get(String(job.company));
    const uiStatus = job.status === "closed" ? "closed" : application ? "applied" : "open";

    return {
      jobId: job._id,
      title: job.title,
      description: job.description,
      status: uiStatus,
      rawStatus: job.status,
      applicationStatus: application?.status || null,
      appliedAt: application?.createdAt || null,
      skills: job.skills || [],
      company: {
        companyId: job.company,
        name: company?.companyName || "Unknown Company",
        logo: company?.logo?.url || "",
        industry: company?.industry || "",
      },
      workMode: job.workMode,
      location: job.location || "",
      budgetLabel: formatProjectBudgetLabel(job),
      budget: {
        value: job.budget,
        min: job.budgetMin,
        max: job.budgetMax,
      },
      duration: formatProjectDuration(job),
      applicantsCount: job.applicationsCount || 0,
      postedAgo: formatPostedAgo(job.createdAt),
      postedAt: job.createdAt,
      action: {
        label: uiStatus === "open" ? "Apply" : uiStatus === "applied" ? "Applied" : "Closed",
        endpoint: uiStatus === "open" ? `/developer/jobs/${job._id}/apply` : null,
        method: uiStatus === "open" ? "POST" : null,
        disabled: uiStatus !== "open",
      },
    };
  });

  const filteredProjects =
    status === "all" ? allProjects : allProjects.filter((project) => project.status === status);

  const totalItems = filteredProjects.length;
  const totalPages = Math.ceil(totalItems / limitNumber) || 1;
  const skip = (pageNumber - 1) * limitNumber;
  const projects = filteredProjects.slice(skip, skip + limitNumber);

  return successResponse({
    res,
    message: "developer projects fetched successfully",
    data: {
      header: {
        pageTitle: "Browse Projects",
        subtitle: "Find projects that match your skills and apply.",
        searchPlaceholder: "Search projects, companies, or skills...",
      },
      stats: {
        totalProjects: totalItems,
        openProjects: allProjects.filter((project) => project.status === "open").length,
        appliedProjects: appliedJobIds.length,
        closedProjects: allProjects.filter((project) => project.status === "closed").length,
      },
      filters: {
        search: normalizedSearch,
        skill: normalizedSkill,
        workMode: workMode || null,
        status,
      },
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalItems,
        totalPages,
      },
      projects,
    },
  });
});

export const applyToJob = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const { jobId } = req.params;
  const { proposedBudget } = req.body;

  const job = await dbService.findOne({
    model: jobModel,
    filter: { _id: jobId, status: "active" },
  });

  if (!job) {
    return next(new Error("job not found", { cause: 404 }));
  }

  const exists = await dbService.findOne({
    model: applicationModel,
    filter: { developer: req.user._id, job: jobId },
  });

  if (exists) {
    return next(new Error("application already exists", { cause: 409 }));
  }

  const [application] = await dbService.create({
    model: applicationModel,
    data: [
      {
        developer: req.user._id,
        job: jobId,
        company: job.company,
        proposedBudget,
      },
    ],
  });

  await jobModel.updateOne({ _id: jobId }, { $inc: { applicationsCount: 1 } });

  return successResponse({
    res,
    status: 201,
    message: "application submitted successfully",
    data: { application },
  });
});

export const getMyApplications = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const applications = await applicationModel
    .find({ developer: req.user._id })
    .populate([{ path: "job", select: "title budgetMin budgetMax" }])
    .sort({ createdAt: -1 });

  return successResponse({
    res,
    data: {
      applications: applications.map((item) => ({
        applicationId: item._id,
        projectName: item.job?.title || "Unknown Job",
        proposedBudget: item.proposedBudget,
        status: item.status,
        budgetRange: {
          min: item.job?.budgetMin,
          max: item.job?.budgetMax,
        },
      })),
    },
  });
});

export const getRecommendedJobs = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  const jobs = await buildRecommendedJobs({
    skills: profile.skills || [],
    developerId: req.user._id,
  });

  return successResponse({
    res,
    data: { jobs },
  });
});

export const updateAvailabilitySettings = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const { workingHours, preferredJobTypes, salaryExpectation, acceptingNewProjects } = req.body;

  const updatedProfile = await dbService.findOneAndUpdate({
    model: developerModel,
    filter: { user: req.user._id },
    data: {
      ...(workingHours !== undefined && { workingHours }),
      ...(preferredJobTypes !== undefined && { preferredJobTypes }),
      ...(salaryExpectation !== undefined && { salaryExpectation }),
      ...(acceptingNewProjects !== undefined && { acceptingNewProjects }),
    },
  });

  if (!updatedProfile) {
    return next(new Error("developer profile not found", { cause: 404 }));
  }

  return successResponse({
    res,
    message: "availability settings updated successfully",
    data: { profile: updatedProfile },
  });
});

export const changeDeveloperPassword = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const { oldPassword, newPassword } = req.body;

  const user = await dbService.findOne({
    model: userModel,
    filter: { _id: req.user._id },
  });

  if (!user) {
    return next(new Error("invalid account", { cause: 404 }));
  }

  const matchedPassword = await compareHash({
    plaintext: oldPassword,
    hashValue: user.password,
  });

  if (!matchedPassword) {
    return next(new Error("invalid old password", { cause: 400 }));
  }

  await dbService.findOneAndUpdate({
    model: userModel,
    filter: { _id: req.user._id },
    data: {
      password: await generateHash({ plaintext: newPassword, saltRound: 12 }),
      changeCredentialsTime: new Date(),
    },
  });

  return successResponse({
    res,
    message: "password updated successfully",
  });
});
