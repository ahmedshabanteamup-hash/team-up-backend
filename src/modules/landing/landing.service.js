import { asyncHandeler, successResponse } from "../../utils/response.js";
import { userModel } from "../../DB/models/user.model.js";
import { projectModel } from "../../DB/models/project.model.js";
import { ratingModel } from "../../DB/models/rating.model.js";

const getStats = async () => {
  const [totalUsers, projectsCompleted, activeTeams, ratingSummary] = await Promise.all([
    userModel.countDocuments({}),
    projectModel.countDocuments({ status: "completed", deletedAt: { $exists: false } }),
    projectModel.countDocuments({ status: "ongoing", deletedAt: { $exists: false } }),
    ratingModel.aggregate([
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$overall" },
        },
      },
    ]),
  ]);

  const averageRatingRaw = ratingSummary[0]?.averageRating || 0;
  const averageRating = Number(averageRatingRaw.toFixed(1));

  return {
    totalUsers,
    projectsCompleted,
    activeTeams,
    averageRating,
  };
};

const landingContent = {
  hero: {
    title: "Build high-performance teams with smart matching.",
    subtitle:
      "TeamUp connects freelancers, developers, designers, and companies through AI-powered team building.",
    ctaPrimary: { label: "Get Started", href: "/auth/signup" },
    ctaSecondary: { label: "Learn More", href: "#how-it-works" },
    imageAlt: "Team collaboration illustration",
  },
  howItWorks: [
    {
      key: "create_account",
      title: "Create your account",
      description: "Choose your role and complete your profile.",
    },
    {
      key: "post_or_apply",
      title: "Post or apply",
      description: "Clients post projects, developers apply or get invited.",
    },
    {
      key: "build_teams",
      title: "Build teams",
      description: "Manually, with AI help, or via auto-suggested teams.",
    },
    {
      key: "work_and_track",
      title: "Work & track",
      description: "Manage tasks, chat, and monitor progress.",
    },
    {
      key: "rate_and_grow",
      title: "Rate & grow",
      description: "Feedback improves ranking and future matching.",
    },
  ],
  featureCards: [
    {
      title: "AI Team Builder",
      description: "Suggests the best team based on skills, experience, and availability.",
    },
    {
      title: "Performance Tracking",
      description: "Track tasks, deadlines, and team progress in real time.",
    },
    {
      title: "Smart Chatbot",
      description: "Ask about projects, tasks, deadlines, or hiring instantly.",
    },
    {
      title: "Ranking System",
      description: "Developers grow their rank based on performance and reviews.",
    },
  ],
  roles: [
    {
      role: "client",
      title: "Client",
      ctaLabel: "Sign up as Client",
      signupRole: "client",
      bullets: [
        "Post unlimited projects",
        "AI team suggestions",
        "Rate team members",
        "Track project progress",
      ],
    },
    {
      role: "developer",
      title: "Developer",
      ctaLabel: "Sign up as Developer",
      signupRole: "developer",
      bullets: [
        "Browse open projects",
        "Get AI-matched invites",
        "Build your reputation",
        "Earn performance badges",
      ],
    },
    {
      role: "company",
      title: "Company",
      ctaLabel: "Sign up as Company",
      signupRole: "company",
      bullets: [
        "Post job openings",
        "Access talent pool",
        "Manage multiple teams",
        "Analytics & reporting",
      ],
    },
  ],
};

export const getLandingStats = asyncHandeler(async (req, res, next) => {
  const stats = await getStats();

  return successResponse({
    res,
    message: "landing stats fetched successfully",
    data: stats,
  });
});

export const getHomeContent = asyncHandeler(async (req, res, next) => {
  const stats = await getStats();

  return successResponse({
    res,
    message: "home content fetched successfully",
    data: {
      ...landingContent,
      stats,
    },
  });
});
