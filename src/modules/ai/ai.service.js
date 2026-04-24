import { developerModel } from "../../DB/models/developer.model.js";
import { ratingModel } from "../../DB/models/rating.model.js";
import { jobModel } from "../../DB/models/jop.model.js";
import { asyncHandeler, successResponse } from "../../utils/response.js";

const fallbackCandidates = [
  { id: 1, name: "Ahmed Hassan", track: "Frontend Developer", hourRate: 15, available: true, hoursPerWeek: 20, skills: ["JavaScript", "React", "HTML", "CSS"] },
  { id: 4, name: "Omar Khaled", track: "Full Stack", hourRate: 22, available: true, hoursPerWeek: 30, skills: ["JavaScript", "Node.js", "React", ".NET"] },
  { id: 8, name: "Karim Tarek", track: "Backend Developer", hourRate: 19, available: true, hoursPerWeek: 18, skills: ["Node.js", "Express", ".NET", "SQL"] },
  { id: 14, name: "Mostafa Adel", track: "Backend Developer", hourRate: 20, available: true, hoursPerWeek: 35, skills: ["Node.js", "MongoDB", ".NET", "REST"] },
  { id: 17, name: "Rana Khalil", track: "Data Scientist", hourRate: 28, available: true, hoursPerWeek: 20, skills: ["Python", "AI", "ML"] },
  { id: 18, name: "Islam Fawzy", track: "Full Stack", hourRate: 24, available: true, hoursPerWeek: 40, skills: ["JavaScript", "React", "Node.js", "MongoDB"] },
  { id: 22, name: "Mariam Samy", track: "UI/UX Designer", hourRate: 13, available: true, hoursPerWeek: 20, skills: ["UI/UX", "Figma"] },
  { id: 23, name: "Amr Tarek", track: "Full Stack", hourRate: 23, available: true, hoursPerWeek: 30, skills: ["JavaScript", "Node.js", "React", ".NET"] },
  { id: 29, name: "Mohamed Nader", track: "DevOps Engineer", hourRate: 27, available: true, hoursPerWeek: 20, skills: ["AWS", "DevOps", "CI/CD"] },
  { id: 31, name: "Mina Fady", track: "Frontend Developer", hourRate: 14, available: true, hoursPerWeek: 25, skills: ["JavaScript", "React", "TypeScript"] },
];

const normalizePriority = (priority = "balanced") =>
  String(priority || "balanced").trim().toLowerCase();

const normalizeSkill = (value = "") => String(value).trim().toLowerCase();

const trackFromProfile = (profile) => {
  if (profile.title && profile.title.trim()) return profile.title.trim();

  const map = {
    frontend: "Frontend Developer",
    backend: "Backend Developer",
    fullstack: "Full Stack",
    ai: "AI Engineer",
    ui: "UI/UX Designer",
    embedded: "Embedded Engineer",
  };

  if (profile.specialization && map[profile.specialization]) {
    return map[profile.specialization];
  }

  return "Developer";
};

const rankScoreMap = { Bronze: 1, Silver: 2, Gold: 3, Platinum: 4 };

const parseHourRate = (profile) => {
  const raw = String(profile.salaryExpectation || "").trim();
  const nums = raw.match(/\d+(\.\d+)?/g) || [];
  if (!nums.length) {
    const base = 12 + (profile.yearsExperience || 0);
    return Math.max(10, Math.round(base));
  }
  const values = nums.map(Number);
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
};

const parseWorkingHours = (profile) => {
  const raw = String(profile.workingHours || "").trim();
  const nums = raw.match(/\d+/g) || [];
  if (nums.length >= 2) {
    const start = Number(nums[0]);
    const end = Number(nums[1]);
    if (!Number.isNaN(start) && !Number.isNaN(end)) {
      const diff = end > start ? end - start : 8;
      return Math.min(40, Math.max(10, diff * 5));
    }
  }
  return 20;
};

const weightsByPriority = (priority) => {
  switch (priority) {
    case "best quality":
      return { skill: 0.35, quality: 0.45, cost: 0.05, availability: 0.15 };
    case "lowest cost":
      return { skill: 0.25, quality: 0.15, cost: 0.5, availability: 0.1 };
    case "fast delivery":
      return { skill: 0.3, quality: 0.2, cost: 0.05, availability: 0.45 };
    default:
      return { skill: 0.35, quality: 0.3, cost: 0.2, availability: 0.15 };
  }
};

const buildNotes = ({
  priority,
  requestedSize,
  finalSize,
  budget,
  totalWeeklyCost,
  missingSkills,
}) => {
  const lines = [];
  lines.push(`Priority mode: ${priority}.`);
  lines.push(`Selected ${finalSize}/${requestedSize} members.`);
  lines.push(`Estimated weekly cost: ${totalWeeklyCost} from budget ${budget}.`);
  if (missingSkills.length) {
    lines.push(`Not fully covered skills: ${missingSkills.join(", ")}.`);
  } else {
    lines.push("All requested skills are covered by selected team.");
  }
  return lines.join(" ");
};

const buildTeamRecommendation = ({
  candidates,
  skills,
  budget,
  teamSize,
  priority,
}) => {
  const normalizedSkills = [...new Set((skills || []).map(normalizeSkill).filter(Boolean))];
  const weights = weightsByPriority(priority);

  const maxRate = Math.max(...candidates.map((c) => c.hourRate), 1);
  const maxHours = Math.max(...candidates.map((c) => c.hoursPerWeek), 1);

  const scored = candidates.map((candidate) => {
    const candidateSkills = (candidate.skills || []).map(normalizeSkill);
    const matchedSkills = normalizedSkills.filter((skill) => candidateSkills.includes(skill));
    const skillScore = normalizedSkills.length
      ? matchedSkills.length / normalizedSkills.length
      : 0;
    const qualityScore =
      ((candidate.rankScore || 1) / 4) * 0.6 + ((candidate.averageRating || 0) / 5) * 0.4;
    const costScore = 1 - candidate.hourRate / maxRate;
    const availabilityScore = candidate.hoursPerWeek / maxHours;

    const totalScore =
      skillScore * weights.skill +
      qualityScore * weights.quality +
      costScore * weights.cost +
      availabilityScore * weights.availability;

    return {
      ...candidate,
      matchedSkills,
      totalScore: Number(totalScore.toFixed(4)),
    };
  });

  const sorted = scored.sort((a, b) => b.totalScore - a.totalScore);

  const team = [];
  let runningCost = 0;

  for (const candidate of sorted) {
    if (team.length >= teamSize) break;

    const weeklyCost = candidate.hourRate * candidate.hoursPerWeek;

    if (runningCost + weeklyCost <= budget) {
      team.push({
        id: candidate.id,
        name: candidate.name,
        track: candidate.track,
        hourRate: candidate.hourRate,
        hoursPerWeek: candidate.hoursPerWeek,
        weeklyCost,
        matchedSkills: candidate.matchedSkills,
        score: candidate.totalScore,
      });
      runningCost += weeklyCost;
    }
  }

  if (team.length < teamSize) {
    for (const candidate of sorted) {
      if (team.length >= teamSize) break;
      if (team.some((member) => String(member.id) === String(candidate.id))) continue;

      const weeklyCost = candidate.hourRate * candidate.hoursPerWeek;
      team.push({
        id: candidate.id,
        name: candidate.name,
        track: candidate.track,
        hourRate: candidate.hourRate,
        hoursPerWeek: candidate.hoursPerWeek,
        weeklyCost,
        matchedSkills: candidate.matchedSkills,
        score: candidate.totalScore,
      });
      runningCost += weeklyCost;
    }
  }

  const covered = [...new Set(team.flatMap((member) => member.matchedSkills || []))];
  const missingSkills = normalizedSkills.filter((skill) => !covered.includes(skill));

  return {
    team,
    totalWeeklyCost: runningCost,
    budget,
    skillsCovered: covered,
    missingSkills,
  };
};

const loadCandidatesFromDb = async ({ onlyAvailable = true, skill, limit = 100 }) => {
  const profiles = await developerModel
    .find({
      ...(onlyAvailable
        ? {
            availability: "available",
            acceptingNewProjects: true,
          }
        : {}),
      ...(skill
        ? {
            skills: { $regex: new RegExp(String(skill), "i") },
          }
        : {}),
    })
    .limit(Number(limit))
    .select(
      "user fullName title specialization yearsExperience skills availability workingHours salaryExpectation rank acceptingNewProjects"
    );

  if (!profiles.length) return [];

  const userIds = profiles.map((item) => item.user);

  const ratingRows = await ratingModel.aggregate([
    { $match: { developer: { $in: userIds } } },
    {
      $group: {
        _id: "$developer",
        averageRating: { $avg: "$overall" },
      },
    },
  ]);

  const ratingMap = new Map(
    ratingRows.map((row) => [String(row._id), Number((row.averageRating || 0).toFixed(1))])
  );

  return profiles.map((profile, index) => ({
    id: profile.user,
    numericId: index + 1,
    name: profile.fullName,
    track: trackFromProfile(profile),
    hourRate: parseHourRate(profile),
    available:
      profile.availability === "available" && Boolean(profile.acceptingNewProjects),
    hoursPerWeek: parseWorkingHours(profile),
    skills: profile.skills || [],
    rankScore: rankScoreMap[profile.rank] || 1,
    averageRating: ratingMap.get(String(profile.user)) || 0,
  }));
};

const getCandidatePool = async ({ skill, onlyAvailable = true, limit = 100 }) => {
  const dbPool = await loadCandidatesFromDb({ skill, onlyAvailable, limit });
  if (dbPool.length) return dbPool;

  return fallbackCandidates
    .filter((candidate) => (!onlyAvailable ? true : candidate.available))
    .filter((candidate) =>
      skill
        ? (candidate.skills || [])
            .map((item) => item.toLowerCase())
            .includes(String(skill).toLowerCase())
        : true
    )
    .map((item) => ({
      ...item,
      rankScore: 2,
      averageRating: 4,
    }));
};

export const getTeamCandidates = asyncHandeler(async (req, res) => {
  const { skill, availableOnly = true, limit = 100 } = req.query;

  const candidates = await getCandidatePool({
    skill,
    onlyAvailable: availableOnly === true || availableOnly === "true",
    limit,
  });

  return successResponse({
    res,
    message: "team candidates fetched successfully",
    data: {
      total: candidates.length,
      candidates: candidates.map((item) => ({
        id: item.id,
        name: item.name,
        track: item.track,
        hourRate: item.hourRate,
        available: item.available,
        hoursPerWeek: item.hoursPerWeek,
        skills: item.skills,
      })),
    },
  });
});

export const recommendTeam = asyncHandeler(async (req, res, next) => {
  const teamSize = Number(req.body.team_size || req.body.teamSize || 3);
  const budget = Number(req.body.budget);
  const skills = req.body.skills || [];
  const priority = normalizePriority(req.body.priority || "balanced");
  const onlyAvailable =
    req.body.onlyAvailable === undefined ? true : Boolean(req.body.onlyAvailable);

  const candidates = await getCandidatePool({
    onlyAvailable,
    limit: 300,
  });

  if (!candidates.length) {
    return next(new Error("no candidates available for recommendation", { cause: 404 }));
  }

  const recommendation = buildTeamRecommendation({
    candidates,
    skills,
    budget,
    teamSize,
    priority,
  });

  const notes = buildNotes({
    priority,
    requestedSize: teamSize,
    finalSize: recommendation.team.length,
    budget,
    totalWeeklyCost: recommendation.totalWeeklyCost,
    missingSkills: recommendation.missingSkills,
  });

  return successResponse({
    res,
    message: "team recommendation generated successfully",
    data: {
      team: recommendation.team.map((member) => ({
        id: member.id,
        name: member.name,
        track: member.track,
        hourRate: member.hourRate,
        hoursPerWeek: member.hoursPerWeek,
      })),
      totalWeeklyCost: recommendation.totalWeeklyCost,
      budget: recommendation.budget,
      skillsCovered: recommendation.skillsCovered,
      notes,
      meta: {
        priority,
        requestedTeamSize: teamSize,
        selectedTeamSize: recommendation.team.length,
      },
    },
  });
});

export const recommendTeamFromJob = asyncHandeler(async (req, res, next) => {
  const { jobId } = req.params;
  const teamSize = Number(req.body.team_size || req.body.teamSize || 3);
  const priority = normalizePriority(req.body.priority || "balanced");
  const onlyAvailable =
    req.body.onlyAvailable === undefined ? true : Boolean(req.body.onlyAvailable);

  const job = await jobModel.findById(jobId);
  if (!job) {
    return next(new Error("job not found", { cause: 404 }));
  }

  const budget =
    Number(job.budget) ||
    (Number(job.budgetMax) > 0 ? Number(job.budgetMax) : Number(job.budgetMin) || 0);

  if (!budget) {
    return next(new Error("job budget is required to build recommendation", { cause: 400 }));
  }

  const skills = job.skills || [];

  const candidates = await getCandidatePool({
    onlyAvailable,
    limit: 300,
  });

  if (!candidates.length) {
    return next(new Error("no candidates available for recommendation", { cause: 404 }));
  }

  const recommendation = buildTeamRecommendation({
    candidates,
    skills,
    budget,
    teamSize,
    priority,
  });

  const notes = buildNotes({
    priority,
    requestedSize: teamSize,
    finalSize: recommendation.team.length,
    budget,
    totalWeeklyCost: recommendation.totalWeeklyCost,
    missingSkills: recommendation.missingSkills,
  });

  return successResponse({
    res,
    message: "job-based team recommendation generated successfully",
    data: {
      job: {
        jobId: job._id,
        title: job.title,
        skills: job.skills || [],
      },
      team: recommendation.team.map((member) => ({
        id: member.id,
        name: member.name,
        track: member.track,
        hourRate: member.hourRate,
        hoursPerWeek: member.hoursPerWeek,
      })),
      totalWeeklyCost: recommendation.totalWeeklyCost,
      budget: recommendation.budget,
      skillsCovered: recommendation.skillsCovered,
      notes,
      meta: {
        priority,
        requestedTeamSize: teamSize,
        selectedTeamSize: recommendation.team.length,
      },
    },
  });
});

