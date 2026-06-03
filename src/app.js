const STORAGE_KEY = "habit-grow-state-v1";

const statusLabels = {
  done: "達成",
  missed: "未達",
  skipped: "スキップ",
  partial: "進行中",
};

const missedReasonLabels = {
  forgot: "忘れた",
  busy: "忙しかった",
  too_hard: "難しすぎた",
  condition: "体調/気分",
  other: "その他",
};

const growthTypeLabels = {
  amount: "量を増やす",
  duration: "時間を増やす",
  frequency: "頻度を増やす",
  difficulty: "難度を上げる",
  maintain: "維持する",
};

const frequencyLabels = {
  daily: "毎日",
  weekdays: "平日（月〜金）",
  business_days: "平日（祝日除く）",
  weekends: "土日",
  weekends_holidays: "土日祝",
  holidays: "祝日のみ",
  weekly: "週指定",
};

const defaultBenefitTags = ["短期", "中期", "長期", "健康", "メンタル", "仕事", "学習", "睡眠", "自信", "将来"];

const defaultJapanHolidays2026 = [
  { date: "2026-01-01", name: "元日" },
  { date: "2026-01-12", name: "成人の日" },
  { date: "2026-02-11", name: "建国記念の日" },
  { date: "2026-02-23", name: "天皇誕生日" },
  { date: "2026-03-20", name: "春分の日" },
  { date: "2026-04-29", name: "昭和の日" },
  { date: "2026-05-03", name: "憲法記念日" },
  { date: "2026-05-04", name: "みどりの日" },
  { date: "2026-05-05", name: "こどもの日" },
  { date: "2026-05-06", name: "振替休日" },
  { date: "2026-07-20", name: "海の日" },
  { date: "2026-08-11", name: "山の日" },
  { date: "2026-09-21", name: "敬老の日" },
  { date: "2026-09-22", name: "国民の休日" },
  { date: "2026-09-23", name: "秋分の日" },
  { date: "2026-10-12", name: "スポーツの日" },
  { date: "2026-11-03", name: "文化の日" },
  { date: "2026-11-23", name: "勤労感謝の日" },
];

const app = document.querySelector("#app");

let state = loadState();
let activeView = "today";
let editingHabitId = null;

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return normalizeState(JSON.parse(saved));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  const today = toDateKey(new Date());
  return {
    habits: [
      {
        id: crypto.randomUUID(),
        title: "朝のストレッチ",
        ifTrigger: "朝コーヒーを淹れたら",
        thenAction: "肩と背中を3分伸ばす",
        habitMode: "routine",
        steps: [
          { id: crypto.randomUUID(), type: "task", title: "水を一杯飲む", growthType: "maintain", currentTargetValue: 1, currentTargetUnit: "杯" },
          { id: crypto.randomUUID(), type: "task", title: "体重計に乗る", growthType: "maintain", currentTargetValue: 1, currentTargetUnit: "回" },
          { id: crypto.randomUUID(), type: "task", title: "着替える", growthType: "maintain", currentTargetValue: 1, currentTargetUnit: "回" },
          {
            id: crypto.randomUUID(),
            type: "choice",
            title: "天気",
            growthType: "duration",
            currentTargetValue: 3,
            currentTargetUnit: "分",
            options: [
              { id: crypto.randomUUID(), label: "晴れ", action: "3分散歩する" },
              { id: crypto.randomUUID(), label: "雨", action: "3分瞑想する" },
            ],
          },
        ],
        minimumStepId: null,
        minimumSuccess: "水を一杯飲む",
        shortBenefit: "体が起きて、午前中の重さが減る",
        midBenefit: "肩こりが軽くなり、集中しやすくなる",
        longBenefit: "疲れにくい体で、やりたいことに時間を使える",
        benefits: [
          {
            id: crypto.randomUUID(),
            text: "体が起きて、午前中の重さが減る",
            tags: ["短期", "健康"],
          },
          {
            id: crypto.randomUUID(),
            text: "肩こりが軽くなり、集中しやすくなる",
            tags: ["中期", "仕事"],
          },
          {
            id: crypto.randomUUID(),
            text: "疲れにくい体で、やりたいことに時間を使える",
            tags: ["長期", "健康", "将来"],
          },
        ],
        frequencyType: "daily",
        weeklyTargetCount: 7,
        reviewIntervalDays: 7,
        growthType: "maintain",
        currentTargetValue: null,
        currentTargetUnit: "",
        status: "active",
        startDate: today,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    logs: [],
    reviews: [],
    settings: {
      holidayRegion: "JP",
      holidays: defaultJapanHolidays2026,
    },
  };
}

function normalizeState(rawState) {
  const normalized = {
    habits: Array.isArray(rawState?.habits) ? rawState.habits : [],
    logs: Array.isArray(rawState?.logs) ? rawState.logs : [],
    reviews: Array.isArray(rawState?.reviews) ? rawState.reviews : [],
    settings: normalizeSettings(rawState?.settings),
  };

  normalized.habits = normalized.habits.map(normalizeHabit);
  return normalized;
}

function normalizeSettings(settings = {}) {
  const holidays = Array.isArray(settings.holidays) && settings.holidays.length
    ? settings.holidays
    : defaultJapanHolidays2026;

  return {
    holidayRegion: settings.holidayRegion || "JP",
    holidays: holidays
      .filter((holiday) => holiday?.date)
      .map((holiday) => ({
        date: holiday.date,
        name: holiday.name || "祝日",
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

function normalizeHabit(habit) {
  const existingSteps = Array.isArray(habit.steps) ? habit.steps : [];
  const steps = existingSteps.length
    ? existingSteps.map((step, index) => normalizeStep(step, habit, index))
    : [
        {
          id: crypto.randomUUID(),
          type: "task",
          title: habit.thenAction || habit.title || "この習慣を行う",
          growthType: habit.growthType || "maintain",
          currentTargetValue: habit.currentTargetValue || null,
          currentTargetUnit: habit.currentTargetUnit || "",
        },
      ];

  const benefits = normalizeBenefits(habit);
  const minimumStepId = getNormalizedMinimumStepId(habit, steps);

  return {
    ...habit,
    habitMode: habit.habitMode || (steps.length > 1 ? "routine" : "single"),
    steps,
    minimumStepId,
    minimumSuccess: habit.minimumSuccess || getMinimumStepLabel(steps, minimumStepId),
    benefits,
  };
}

function getNormalizedMinimumStepId(habit, steps) {
  if (habit.minimumStepId && steps.some((step) => step.id === habit.minimumStepId)) {
    return habit.minimumStepId;
  }

  if (habit.minimumSuccess) {
    const matchedStep = steps.find((step) => getStepLabel(step).includes(habit.minimumSuccess) || step.title === habit.minimumSuccess);
    if (matchedStep) return matchedStep.id;
  }

  return steps[0]?.id || "";
}

function getMinimumStepLabel(steps, minimumStepId) {
  const index = steps.findIndex((step) => step.id === minimumStepId);
  if (index < 0) return "最初のステップ";
  return `${index + 1}. ${getStepLabel(steps[index])}`;
}

function normalizeStep(step, habit = {}, index = 0) {
  const growthType = step.growthType || (index === 0 ? habit.growthType : null) || "maintain";
  const currentTargetValue = step.currentTargetValue ?? (index === 0 ? habit.currentTargetValue : null) ?? null;
  const currentTargetUnit = step.currentTargetUnit ?? (index === 0 ? habit.currentTargetUnit : "") ?? "";

  if (step.type === "choice" || Array.isArray(step.options)) {
    return {
      id: step.id || crypto.randomUUID(),
      type: "choice",
      title: step.title || step.label || "分岐",
      growthType,
      currentTargetValue,
      currentTargetUnit,
      options: Array.isArray(step.options)
        ? step.options.map((option) => ({
            id: option.id || crypto.randomUUID(),
            label: option.label || "条件",
            action: option.action || option.title || "",
          }))
        : [],
    };
  }

  return {
    id: step.id || crypto.randomUUID(),
    type: "task",
    title: step.title || step.label || habit.thenAction || habit.title || "この習慣を行う",
    growthType,
    currentTargetValue,
    currentTargetUnit,
  };
}

function normalizeBenefits(habit) {
  if (Array.isArray(habit.benefits) && habit.benefits.length) {
    return habit.benefits
      .filter((benefit) => benefit?.text)
      .map((benefit) => ({
        id: benefit.id || crypto.randomUUID(),
        text: benefit.text,
        tags: Array.isArray(benefit.tags) ? benefit.tags : [],
      }));
  }

  return [
    habit.shortBenefit
      ? { id: crypto.randomUUID(), text: habit.shortBenefit, tags: ["短期"] }
      : null,
    habit.midBenefit
      ? { id: crypto.randomUUID(), text: habit.midBenefit, tags: ["中期"] }
      : null,
    habit.longBenefit
      ? { id: crypto.randomUUID(), text: habit.longBenefit, tags: ["長期"] }
      : null,
  ].filter(Boolean);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(dateKey, amount) {
  const date = parseDate(dateKey);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

function daysBetween(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  return Math.floor((end - start) / 86400000);
}

function formatDate(dateKey) {
  const date = parseDate(dateKey);
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function isHoliday(dateKey) {
  return state.settings.holidays.some((holiday) => holiday.date === dateKey);
}

function getHolidayName(dateKey) {
  return state.settings.holidays.find((holiday) => holiday.date === dateKey)?.name || "";
}

function isWeekend(dateKey) {
  const day = parseDate(dateKey).getDay();
  return day === 0 || day === 6;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isTargetDate(habit, dateKey) {
  if (habit.status !== "active") return false;
  if (dateKey < habit.startDate) return false;

  const date = parseDate(dateKey);
  const day = date.getDay();
  const holiday = isHoliday(dateKey);
  const weekend = day === 0 || day === 6;

  if (habit.frequencyType === "daily") return true;
  if (habit.frequencyType === "weekdays") return day >= 1 && day <= 5;
  if (habit.frequencyType === "business_days") return day >= 1 && day <= 5 && !holiday;
  if (habit.frequencyType === "weekends") return weekend;
  if (habit.frequencyType === "weekends_holidays") return weekend || holiday;
  if (habit.frequencyType === "holidays") return holiday;
  if (habit.frequencyType === "weekly") {
    const index = daysBetween(habit.startDate, dateKey);
    if (index < 0) return false;
    const dayInWeek = index % 7;
    return dayInWeek < Number(habit.weeklyTargetCount || 1);
  }

  return true;
}

function getLog(habitId, dateKey) {
  return state.logs.find((log) => log.habitId === habitId && log.logDate === dateKey);
}

function getHabitSteps(habit) {
  return normalizeHabit(habit).steps;
}

function getStepLabel(step) {
  if (step.type === "choice") {
    return `${step.title}: ${step.options.map((option) => `${option.label}→${option.action}`).join(" / ")}`;
  }
  return step.title;
}

function getCompletionId(step) {
  return step.id;
}

function getCompletedStepIds(log, habit) {
  const steps = getHabitSteps(habit);
  if (!log) return [];
  if (Array.isArray(log.completedStepIds)) return log.completedStepIds;
  if (log.status === "done") return steps.map(getCompletionId);
  return [];
}

function getBranchSelections(log) {
  return log?.branchSelections && typeof log.branchSelections === "object" ? log.branchSelections : {};
}

function getLogDisplayStatus(log, habit) {
  if (!log) return { label: "未記録", className: "" };
  if (log.status === "skipped") return { label: statusLabels.skipped, className: "skipped" };
  if (log.status === "done") return { label: statusLabels.done, className: "done" };

  const steps = getHabitSteps(habit);
  const completed = getCompletedStepIds(log, habit).length;
  if (completed > 0) {
    const minimumCleared = isMinimumCleared(habit, getCompletedStepIds(log, habit));
    return { label: `${completed}/${steps.length}${minimumCleared ? " 最小OK" : ""}`, className: "partial" };
  }

  return { label: statusLabels.missed, className: "missed" };
}

function isMinimumCleared(habit, completedStepIds) {
  const steps = getHabitSteps(habit);
  const minimumIndex = steps.findIndex((step) => step.id === habit.minimumStepId);
  if (minimumIndex < 0) return completedStepIds.length > 0;

  return steps
    .slice(0, minimumIndex + 1)
    .every((step) => completedStepIds.includes(getCompletionId(step)));
}

function upsertLog(habitId, status, extra = {}) {
  const logDate = toDateKey(new Date());
  const habit = state.habits.find((item) => item.id === habitId);
  const steps = habit ? getHabitSteps(habit) : [];
  const existing = getLog(habitId, logDate);
  const completedStepIds =
    extra.completedStepIds ||
    (status === "done" ? steps.map(getCompletionId) : status === "missed" ? [] : existing?.completedStepIds || []);
  const branchSelections =
    extra.branchSelections ||
    (status === "done" ? getDoneBranchSelections(steps, existing) : status === "missed" ? {} : getBranchSelections(existing));
  const payload = {
    id: existing?.id || crypto.randomUUID(),
    habitId,
    logDate,
    status,
    completedStepIds,
    branchSelections,
    note: extra.note || existing?.note || "",
    missedReason: extra.missedReason || existing?.missedReason || "",
    updatedAt: new Date().toISOString(),
    createdAt: existing?.createdAt || new Date().toISOString(),
  };

  if (existing) {
    state.logs = state.logs.map((log) => (log.id === existing.id ? payload : log));
  } else {
    state.logs.push(payload);
  }

  saveState();
  render();
}

function getDoneBranchSelections(steps, existingLog) {
  const existingSelections = getBranchSelections(existingLog);
  return Object.fromEntries(
    steps
      .filter((step) => step.type === "choice" && step.options.length)
      .map((step) => [step.id, existingSelections[step.id] || step.options[0].id]),
  );
}

function toggleStep(habitId, stepId) {
  const habit = state.habits.find((item) => item.id === habitId);
  if (!habit) return;

  const today = toDateKey(new Date());
  const steps = getHabitSteps(habit);
  const existing = getLog(habitId, today);
  const completed = new Set(getCompletedStepIds(existing, habit));

  if (completed.has(stepId)) {
    completed.delete(stepId);
  } else {
    completed.add(stepId);
  }

  const completedStepIds = steps
    .filter((step) => completed.has(step.id))
    .map(getCompletionId);
  const status = completedStepIds.length === steps.length ? "done" : "missed";

  upsertLog(habitId, status, { completedStepIds, branchSelections: getBranchSelections(existing) });
}

function selectBranchOption(habitId, stepId, optionId) {
  const habit = state.habits.find((item) => item.id === habitId);
  if (!habit) return;

  const today = toDateKey(new Date());
  const steps = getHabitSteps(habit);
  const existing = getLog(habitId, today);
  const completed = new Set(getCompletedStepIds(existing, habit));
  const branchSelections = { ...getBranchSelections(existing), [stepId]: optionId };

  completed.add(stepId);

  const completedStepIds = steps
    .filter((step) => completed.has(getCompletionId(step)))
    .map(getCompletionId);
  const status = completedStepIds.length === steps.length ? "done" : "missed";

  upsertLog(habitId, status, { completedStepIds, branchSelections });
}

function clearBranchOption(habitId, stepId) {
  const habit = state.habits.find((item) => item.id === habitId);
  if (!habit) return;

  const today = toDateKey(new Date());
  const steps = getHabitSteps(habit);
  const existing = getLog(habitId, today);
  const completed = new Set(getCompletedStepIds(existing, habit));
  const branchSelections = { ...getBranchSelections(existing) };

  completed.delete(stepId);
  delete branchSelections[stepId];

  const completedStepIds = steps
    .filter((step) => completed.has(getCompletionId(step)))
    .map(getCompletionId);
  const status = completedStepIds.length === steps.length ? "done" : "missed";

  upsertLog(habitId, status, { completedStepIds, branchSelections });
}

function deleteHabit(habitId) {
  const habit = state.habits.find((item) => item.id === habitId);
  if (!habit) return;
  const confirmed = confirm(`「${habit.title}」を削除しますか？記録も一緒に削除されます。`);
  if (!confirmed) return;

  state.habits = state.habits.filter((item) => item.id !== habitId);
  state.logs = state.logs.filter((log) => log.habitId !== habitId);
  state.reviews = state.reviews.filter((review) => review.habitId !== habitId);
  saveState();
  render();
}

function getPeriodDates(habit, endDateKey = toDateKey(new Date())) {
  const elapsed = Math.max(0, daysBetween(habit.startDate, endDateKey));
  const interval = Number(habit.reviewIntervalDays || 7);
  const completedPeriods = Math.floor(elapsed / interval);
  const periodStart = addDays(habit.startDate, completedPeriods * interval);
  const periodEnd = addDays(periodStart, interval - 1);
  return { periodStart, periodEnd, interval };
}

function getReviewStats(habit, periodStart, periodEnd) {
  const steps = getHabitSteps(habit);
  let targetDays = 0;
  let doneDays = 0;
  let minimumDoneDays = 0;
  let startedDays = 0;
  let skippedDays = 0;
  const stepDoneCounts = steps.map(() => 0);
  const transitionCounts = steps.slice(1).map(() => ({ from: 0, to: 0 }));
  const branchOptionCounts = Object.fromEntries(
    steps
      .filter((step) => step.type === "choice")
      .map((step) => [
        step.id,
        Object.fromEntries(step.options.map((option) => [option.id, { selected: 0, completed: 0 }])),
      ]),
  );

  for (let dateKey = periodStart; dateKey <= periodEnd; dateKey = addDays(dateKey, 1)) {
    if (!isTargetDate(habit, dateKey)) continue;
    const log = getLog(habit.id, dateKey);
    if (log?.status === "skipped") {
      skippedDays += 1;
      continue;
    }

    targetDays += 1;
    const completedStepIds = getCompletedStepIds(log, habit);
    const branchSelections = getBranchSelections(log);
    if (completedStepIds.length > 0) startedDays += 1;
    if (isMinimumCleared(habit, completedStepIds)) minimumDoneDays += 1;
    if (completedStepIds.length === steps.length && steps.length > 0) doneDays += 1;

    steps.forEach((step, index) => {
      if (completedStepIds.includes(getCompletionId(step))) stepDoneCounts[index] += 1;
      if (step.type === "choice" && branchSelections[step.id]) {
        const optionStats = branchOptionCounts[step.id]?.[branchSelections[step.id]];
        if (optionStats) {
          optionStats.selected += 1;
          if (completedStepIds.includes(getCompletionId(step))) optionStats.completed += 1;
        }
      }
    });

    for (let index = 1; index < steps.length; index += 1) {
      if (completedStepIds.includes(getCompletionId(steps[index - 1]))) {
        transitionCounts[index - 1].from += 1;
        if (completedStepIds.includes(getCompletionId(steps[index]))) {
          transitionCounts[index - 1].to += 1;
        }
      }
    }
  }

  const successRate = targetDays ? Math.round((doneDays / targetDays) * 100) : 0;
  const minimumRate = targetDays ? Math.round((minimumDoneDays / targetDays) * 100) : 0;
  const startRate = targetDays ? Math.round((startedDays / targetDays) * 100) : 0;
  const stepStats = steps.map((step, index) => ({
    ...step,
    doneDays: stepDoneCounts[index],
    rate: targetDays ? Math.round((stepDoneCounts[index] / targetDays) * 100) : 0,
  }));
  const branchStats = getBranchStats(steps, branchOptionCounts);
  const bottleneck = getBottleneck(steps, transitionCounts);

  return {
    targetDays,
    doneDays,
    minimumDoneDays,
    startedDays,
    skippedDays,
    successRate,
    minimumRate,
    startRate,
    stepStats,
    branchStats,
    bottleneck,
  };
}

function getBranchStats(steps, branchOptionCounts) {
  return steps
    .filter((step) => step.type === "choice")
    .map((step) => ({
      id: step.id,
      title: step.title,
      options: step.options.map((option) => {
        const stats = branchOptionCounts[step.id]?.[option.id] || { selected: 0, completed: 0 };
        return {
          ...option,
          selectedDays: stats.selected,
          completedDays: stats.completed,
          completionRate: stats.selected ? Math.round((stats.completed / stats.selected) * 100) : 0,
        };
      }),
    }));
}

function getBottleneck(steps, transitionCounts) {
  if (steps.length < 2) return null;

  const candidates = transitionCounts
    .map((item, index) => ({
      fromStep: steps[index],
      toStep: steps[index + 1],
      fromLabel: getStepLabel(steps[index]),
      toLabel: getStepLabel(steps[index + 1]),
      attempts: item.from,
      passes: item.to,
      rate: item.from ? Math.round((item.to / item.from) * 100) : null,
    }))
    .filter((item) => item.attempts > 0);

  if (!candidates.length) return null;
  return candidates.sort((a, b) => a.rate - b.rate)[0];
}

function getCurrentStats(habit) {
  const { periodStart, periodEnd } = getPeriodDates(habit);
  const today = toDateKey(new Date());
  const statsEnd = periodEnd > today ? today : periodEnd;
  return {
    periodStart,
    periodEnd,
    statsEnd,
    ...getReviewStats(habit, periodStart, statsEnd),
  };
}

function getSuggestion(successRate, perceivedDifficulty = "good") {
  if (successRate >= 90 && perceivedDifficulty === "easy") return "increase";
  if (successRate >= 90) return "maintain";
  if (successRate >= 70) return "adjust";
  return "decrease";
}

function getSuggestionText(suggestion, habit) {
  if (suggestion === "increase") {
    const nextTargets = getNextTargets(habit);
    if (!nextTargets.length) return "かなり安定しています。成長対象のステップがなければ、今は維持でよさそうです。";
    const first = nextTargets[0];
    const suffix = nextTargets.length > 1 ? ` ほか${nextTargets.length - 1}件も候補です。` : "";
    return `かなり安定しています。「${first.stepTitle}」を ${first.label} くらいに小さく上げるのがよさそうです。${suffix}`;
  }
  if (suggestion === "maintain") {
    return "達成率は十分です。負担感があるなら、今の目標を維持して定着を優先しましょう。";
  }
  if (suggestion === "adjust") {
    return "続いています。増やすより、if条件や最小達成条件を少し整えるのがよさそうです。";
  }
  return "今は目標を小さくするタイミングです。最小達成条件をさらに軽くして、戻りやすくしましょう。";
}

function getNextTargets(habit) {
  return getHabitSteps(habit)
    .map((step) => {
      const value = Number(step.currentTargetValue || 0);
      if (!value || step.growthType === "maintain" || step.growthType === "difficulty") return null;
      const raw = value * 1.1;
      const rounded = step.growthType === "duration" ? Math.max(1, Math.round(raw)) : Math.ceil(raw);
      return {
        stepId: step.id,
        stepTitle: getStepLabel(step),
        value: rounded,
        label: `${rounded}${step.currentTargetUnit || ""}`,
      };
    })
    .filter(Boolean);
}

function createReview(habitId, perceivedDifficulty, userDecision) {
  const habit = state.habits.find((item) => item.id === habitId);
  if (!habit) return;

  const { periodStart, periodEnd } = getPeriodDates(habit);
  const today = toDateKey(new Date());
  const statsEnd = periodEnd > today ? today : periodEnd;
  const stats = getReviewStats(habit, periodStart, statsEnd);
  const appSuggestion = getSuggestion(stats.successRate, perceivedDifficulty);

  state.reviews.push({
    id: crypto.randomUUID(),
    habitId,
    periodStart,
    periodEnd,
    targetDays: stats.targetDays,
    doneDays: stats.doneDays,
    minimumDoneDays: stats.minimumDoneDays,
    startedDays: stats.startedDays,
    successRate: stats.successRate,
    minimumRate: stats.minimumRate,
    startRate: stats.startRate,
    bottleneck: stats.bottleneck,
    branchStats: stats.branchStats,
    perceivedDifficulty,
    appSuggestion,
    userDecision,
    createdAt: new Date().toISOString(),
  });

  if (userDecision === "increase") {
    const nextTargets = getNextTargets(habit);
    habit.steps = getHabitSteps(habit).map((step) => {
      const next = nextTargets.find((target) => target.stepId === step.id);
      return next ? { ...step, currentTargetValue: next.value } : step;
    });
    habit.updatedAt = new Date().toISOString();
  }

  saveState();
  render();
}

function setView(view) {
  activeView = view;
  render();
}

function openDrawer(habitId = null) {
  editingHabitId = habitId;
  render();
  document.querySelector(".drawer")?.classList.add("is-open");
}

function closeDrawer() {
  editingHabitId = null;
  document.querySelector(".drawer")?.classList.remove("is-open");
}

function handleHabitSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const now = new Date().toISOString();
  const previousHabit = state.habits.find((item) => item.id === editingHabitId);
  const steps = parseStepFields(form, previousHabit);
  const benefits = parseBenefits(String(formData.get("benefits")).trim(), previousHabit);
  const minimumStepNumber = Number(formData.get("minimumStepNumber") || 1);
  const minimumStep = steps[Math.min(Math.max(minimumStepNumber, 1), steps.length) - 1];

  const habit = {
    id: editingHabitId || crypto.randomUUID(),
    title: String(formData.get("title")).trim(),
    ifTrigger: String(formData.get("ifTrigger")).trim(),
    thenAction: String(formData.get("thenAction")).trim(),
    habitMode: String(formData.get("habitMode")),
    steps,
    minimumStepId: minimumStep?.id || "",
    minimumSuccess: minimumStep ? getMinimumStepLabel(steps, minimumStep.id) : "",
    shortBenefit: benefits.find((benefit) => benefit.tags.includes("短期"))?.text || benefits[0]?.text || "",
    midBenefit: benefits.find((benefit) => benefit.tags.includes("中期"))?.text || "",
    longBenefit: benefits.find((benefit) => benefit.tags.includes("長期"))?.text || "",
    benefits,
    frequencyType: String(formData.get("frequencyType")),
    weeklyTargetCount: Number(formData.get("weeklyTargetCount") || 1),
    reviewIntervalDays: Number(formData.get("reviewIntervalDays")),
    growthType: "maintain",
    currentTargetValue: null,
    currentTargetUnit: "",
    status: String(formData.get("status")),
    startDate: String(formData.get("startDate")),
    createdAt: previousHabit?.createdAt || now,
    updatedAt: now,
  };

  if (!habit.title || !habit.ifTrigger || !habit.minimumStepId || !habit.steps.length) {
    alert("習慣名、if条件、ステップ、最小達成ステップは入力してください。");
    return;
  }

  if (!habit.thenAction) {
    habit.thenAction = habit.steps.map(getStepLabel).join(" → ");
  }

  if (editingHabitId) {
    state.habits = state.habits.map((item) => (item.id === editingHabitId ? habit : item));
  } else {
    state.habits.unshift(habit);
  }

  saveState();
  closeDrawer();
  render();
}

function parseSteps(text, previousHabit) {
  const previousSteps = Array.isArray(previousHabit?.steps) ? previousHabit.steps : [];
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const parsedSteps = [];
  let currentChoice = null;

  lines.forEach((line) => {
    if (line.startsWith("?")) {
      const title = line.replace(/^\?\s*/, "").trim() || "分岐";
      const existing = previousSteps.find((step) => step.type === "choice" && step.title === title);
      currentChoice = {
        id: existing?.id || crypto.randomUUID(),
        type: "choice",
        title,
        options: [],
      };
      parsedSteps.push(currentChoice);
      return;
    }

    if (line.startsWith("-") && currentChoice) {
      const optionText = line.replace(/^-\s*/, "").trim();
      const separatorIndex = optionText.indexOf(":");
      const label = separatorIndex >= 0 ? optionText.slice(0, separatorIndex).trim() : optionText;
      const action = separatorIndex >= 0 ? optionText.slice(separatorIndex + 1).trim() : "";
      const existingChoice = previousSteps.find((step) => step.id === currentChoice.id);
      const existingOption = existingChoice?.options?.find((option) => option.label === label && option.action === action);
      currentChoice.options.push({
        id: existingOption?.id || crypto.randomUUID(),
        label: label || "条件",
        action,
      });
      return;
    }

    currentChoice = null;
    const existing = previousSteps.find((step) => step.type !== "choice" && step.title === line);
    parsedSteps.push({
      id: existing?.id || crypto.randomUUID(),
      type: "task",
      title: line,
    });
  });

  return parsedSteps
    .map((step) => {
      if (step.type !== "choice") return step;
      return {
        ...step,
        options: step.options.length ? step.options : [{ id: crypto.randomUUID(), label: "条件", action: "" }],
      };
    });
}

function parseStepFields(form, previousHabit) {
  const previousSteps = Array.isArray(previousHabit?.steps) ? previousHabit.steps : [];
  const cards = [...form.querySelectorAll("[data-step-editor-card]")];

  return cards
    .map((card) => {
      const type = card.dataset.stepType;
      const stepId = card.dataset.stepId || crypto.randomUUID();
      const targetValue = Number(card.querySelector("[data-step-target-value]")?.value || "");
      const growthType = card.querySelector("[data-step-growth-type]")?.value || "maintain";
      const currentTargetValue = Number.isFinite(targetValue) && targetValue > 0 ? targetValue : null;
      const currentTargetUnit = card.querySelector("[data-step-target-unit]")?.value.trim() || "";

      if (type === "choice") {
        const title = card.querySelector("[data-choice-title]")?.value.trim() || "分岐";
        const previousStep = previousSteps.find((step) => step.id === stepId);
        const options = [...card.querySelectorAll("[data-choice-option-editor]")]
          .map((optionRow) => {
            const optionId = optionRow.dataset.optionId || crypto.randomUUID();
            const label = optionRow.querySelector("[data-option-label]")?.value.trim() || "条件";
            const action = optionRow.querySelector("[data-option-action]")?.value.trim() || "";
            const previousOption = previousStep?.options?.find((option) => option.id === optionId);
            return {
              id: previousOption?.id || optionId,
              label,
              action,
            };
          })
          .filter((option) => option.label || option.action);

        return {
          id: previousStep?.id || stepId,
          type: "choice",
          title,
          growthType,
          currentTargetValue,
          currentTargetUnit,
          options: options.length ? options : [{ id: crypto.randomUUID(), label: "条件", action: "" }],
        };
      }

      const title = card.querySelector("[data-step-title]")?.value.trim();
      if (!title) return null;
      const previousStep = previousSteps.find((step) => step.id === stepId);
      return {
        id: previousStep?.id || stepId,
        type: "task",
        title,
        growthType,
        currentTargetValue,
        currentTargetUnit,
      };
    })
    .filter(Boolean);
}

function parseBenefits(text, previousHabit) {
  const previousBenefits = Array.isArray(previousHabit?.benefits)
    ? previousHabit.benefits
    : normalizeBenefits(previousHabit || {});
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const tags = [...line.matchAll(/#([^\s#]+)/g)].map((match) => match[1].trim()).filter(Boolean);
    const benefitText = line.replace(/#([^\s#]+)/g, "").replace(/\s+/g, " ").trim();
    const existing = previousBenefits.find((benefit) => benefit.text === benefitText);

    return {
      id: existing?.id || crypto.randomUUID(),
      text: benefitText || line,
      tags: [...new Set(tags)],
    };
  });
}

function formatHolidaysForTextarea() {
  return state.settings.holidays
    .map((holiday) => `${holiday.date}, ${holiday.name}`)
    .join("\n");
}

function parseHolidays(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [datePart, ...nameParts] = line.split(",");
      return {
        date: datePart.trim(),
        name: nameParts.join(",").trim() || "祝日",
      };
    })
    .filter((holiday) => /^\d{4}-\d{2}-\d{2}$/.test(holiday.date))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function handleHolidaySubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const holidays = parseHolidays(String(formData.get("holidays")).trim());

  if (!holidays.length) {
    alert("祝日を1件以上、YYYY-MM-DD, 名前 の形式で入力してください。");
    return;
  }

  state.settings.holidays = holidays;
  saveState();
  render();
}

function resetHolidays() {
  state.settings.holidays = [...defaultJapanHolidays2026];
  saveState();
  render();
}

function formatBenefitsForTextarea(habit) {
  return normalizeBenefits(habit || {})
    .map((benefit) => {
      const tags = benefit.tags.map((tag) => `#${tag}`).join(" ");
      return `${benefit.text}${tags ? ` ${tags}` : ""}`;
    })
    .join("\n");
}

function formatStepsForTextarea(habit) {
  return getHabitSteps(habit)
    .map((step) => {
      if (step.type === "choice") {
        return [`? ${step.title}`, ...step.options.map((option) => `- ${option.label}: ${option.action}`)].join("\n");
      }
      return step.title;
    })
    .join("\n");
}

function renderStepEditor(habit) {
  const steps = habit ? getHabitSteps(habit) : [{ id: crypto.randomUUID(), type: "task", title: "" }];

  return `
    <div class="step-editor" data-step-editor>
      ${steps.map((step, index) => renderStepEditorCard(step, index)).join("")}
      <div class="step-editor-actions">
        <button class="btn" type="button" data-add-task-step>ステップを追加</button>
        <button class="btn" type="button" data-add-choice-step>分岐を追加</button>
      </div>
    </div>
  `;
}

function renderStepEditorCard(step, index) {
  if (step.type === "choice") {
    return `
      <div class="step-editor-card" data-step-editor-card data-step-type="choice" data-step-id="${step.id || crypto.randomUUID()}">
        <div class="step-editor-card-header">
          <span class="step-index">${index + 1}</span>
          <strong>分岐ステップ</strong>
          <button class="icon-btn" type="button" data-remove-step aria-label="ステップを削除">×</button>
        </div>
        <label class="field">
          <span>分岐名</span>
          <input data-choice-title value="${escapeHtml(step.title || "")}" placeholder="例: 天気" />
        </label>
        ${renderStepGrowthFields(step)}
        <div class="choice-option-editor-list">
          ${(step.options?.length ? step.options : [{ id: crypto.randomUUID(), label: "", action: "" }])
            .map((option) => renderChoiceOptionEditor(option))
            .join("")}
        </div>
        <button class="btn" type="button" data-add-choice-option>選択肢を追加</button>
      </div>
    `;
  }

  return `
    <div class="step-editor-card" data-step-editor-card data-step-type="task" data-step-id="${step.id || crypto.randomUUID()}">
      <div class="step-editor-card-header">
        <span class="step-index">${index + 1}</span>
        <strong>通常ステップ</strong>
        <button class="icon-btn" type="button" data-remove-step aria-label="ステップを削除">×</button>
      </div>
      <label class="field">
        <span>やること</span>
        <input data-step-title value="${escapeHtml(step.title || "")}" placeholder="例: 水を飲む" />
      </label>
      ${renderStepGrowthFields(step)}
    </div>
  `;
}

function renderStepGrowthFields(step) {
  return `
    <div class="step-growth-grid">
      <label class="field">
        <span>成長タイプ</span>
        <select data-step-growth-type>
          ${Object.entries(growthTypeLabels)
            .map(([value, label]) => option(value, label, step.growthType || "maintain"))
            .join("")}
        </select>
      </label>
      <label class="field">
        <span>目標値</span>
        <input data-step-target-value type="number" min="0" step="0.1" value="${step.currentTargetValue || ""}" placeholder="例: 10" />
      </label>
      <label class="field">
        <span>単位</span>
        <input data-step-target-unit value="${escapeHtml(step.currentTargetUnit || "")}" placeholder="例: 分、回、ページ" />
      </label>
    </div>
  `;
}

function renderChoiceOptionEditor(option = {}) {
  return `
    <div class="choice-option-editor" data-choice-option-editor data-option-id="${option.id || crypto.randomUUID()}">
      <label class="field">
        <span>条件</span>
        <input data-option-label value="${escapeHtml(option.label || "")}" placeholder="例: 晴れ" />
      </label>
      <label class="field">
        <span>行動</span>
        <input data-option-action value="${escapeHtml(option.action || "")}" placeholder="例: 散歩する" />
      </label>
      <button class="icon-btn" type="button" data-remove-choice-option aria-label="選択肢を削除">×</button>
    </div>
  `;
}

function addTaskStep(button) {
  const editor = button.closest("[data-step-editor]");
  const actions = editor?.querySelector(".step-editor-actions");
  if (!editor || !actions) return;
  actions.insertAdjacentHTML(
    "beforebegin",
    renderStepEditorCard({ id: crypto.randomUUID(), type: "task", title: "" }, editor.querySelectorAll("[data-step-editor-card]").length),
  );
  refreshStepEditorIndexes(editor);
}

function addChoiceStep(button) {
  const editor = button.closest("[data-step-editor]");
  const actions = editor?.querySelector(".step-editor-actions");
  if (!editor || !actions) return;
  actions.insertAdjacentHTML(
    "beforebegin",
    renderStepEditorCard(
      {
        id: crypto.randomUUID(),
        type: "choice",
        title: "",
        options: [
          { id: crypto.randomUUID(), label: "", action: "" },
          { id: crypto.randomUUID(), label: "", action: "" },
        ],
      },
      editor.querySelectorAll("[data-step-editor-card]").length,
    ),
  );
  refreshStepEditorIndexes(editor);
}

function removeStep(button) {
  const editor = button.closest("[data-step-editor]");
  const cards = editor?.querySelectorAll("[data-step-editor-card]");
  if (!editor || !cards?.length) return;
  if (cards.length === 1) {
    alert("ステップは1つ以上必要です。");
    return;
  }
  button.closest("[data-step-editor-card]")?.remove();
  refreshStepEditorIndexes(editor);
}

function addChoiceOption(button) {
  const card = button.closest("[data-step-editor-card]");
  const list = card?.querySelector(".choice-option-editor-list");
  if (!list) return;
  list.insertAdjacentHTML("beforeend", renderChoiceOptionEditor());
}

function removeChoiceOption(button) {
  const list = button.closest(".choice-option-editor-list");
  const options = list?.querySelectorAll("[data-choice-option-editor]");
  if (!list || !options?.length) return;
  if (options.length === 1) {
    alert("分岐の選択肢は1つ以上必要です。");
    return;
  }
  button.closest("[data-choice-option-editor]")?.remove();
}

function refreshStepEditorIndexes(editor) {
  editor.querySelectorAll("[data-step-editor-card]").forEach((card, index) => {
    const indexElement = card.querySelector(".step-index");
    if (indexElement) indexElement.textContent = String(index + 1);
  });
}

function getFeaturedBenefits(habit, maxCount = 3) {
  const benefits = normalizeBenefits(habit);
  const preferred = [
    ...benefits.filter((benefit) => benefit.tags.includes("短期")),
    ...benefits.filter((benefit) => !benefit.tags.includes("短期")),
  ];
  return preferred.slice(0, maxCount);
}

function renderBenefitLibrary(habit, options = {}) {
  const benefits = options.featured ? getFeaturedBenefits(habit, options.limit || 3) : normalizeBenefits(habit);

  if (!benefits.length) {
    return `
      <div class="benefit-box">
        <p><strong>${escapeHtml(options.title || "メリット")}</strong></p>
        <p>この習慣を続ける理由を登録しておくと、迷った日に効きます。</p>
      </div>
    `;
  }

  return `
    <div class="benefit-box">
      <p><strong>${escapeHtml(options.title || "メリット")}</strong></p>
      <div class="benefit-list">
        ${benefits.map(renderBenefitItem).join("")}
      </div>
    </div>
  `;
}

function renderBenefitItem(benefit) {
  return `
    <div class="benefit-item">
      <p>${escapeHtml(benefit.text)}</p>
      ${
        benefit.tags.length
          ? `<div class="benefit-tags">${benefit.tags.map((tag) => `<span class="benefit-tag">#${escapeHtml(tag)}</span>`).join("")}</div>`
          : ""
      }
    </div>
  `;
}

function todayHabits() {
  const today = toDateKey(new Date());
  return state.habits.filter((habit) => isTargetDate(habit, today));
}

function overallRate() {
  const targetLogs = state.logs.filter((log) => log.status !== "skipped");
  if (!targetLogs.length) return 0;
  const done = targetLogs.filter((log) => log.status === "done").length;
  return Math.round((done / targetLogs.length) * 100);
}

function render() {
  app.innerHTML = `
    <div class="app-shell">
      ${renderTopbar()}
      <main class="main">
        ${renderToday()}
        ${renderHabits()}
        ${renderReviews()}
        ${renderSettings()}
        <p class="footer-note">現在はこの端末のブラウザに保存しています。Supabase接続後はログイン同期に切り替えます。</p>
      </main>
      ${renderDrawer()}
    </div>
  `;

  bindEvents();
}

function renderTopbar() {
  return `
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark">HG</div>
        <div>
          <p class="brand-title">Habit Grow</p>
          <p class="brand-subtitle">小さく始めて、静かに育てる</p>
        </div>
      </div>
      <nav class="nav" aria-label="メイン">
        ${navButton("today", "今日")}
        ${navButton("habits", "習慣")}
        ${navButton("reviews", "レビュー")}
        ${navButton("settings", "設定")}
      </nav>
    </header>
  `;
}

function navButton(view, label) {
  return `
    <button class="nav-button" data-view="${view}" aria-current="${activeView === view ? "page" : "false"}">
      ${label}
    </button>
  `;
}

function renderToday() {
  const habits = todayHabits();
  const doneCount = habits.filter((habit) => getLog(habit.id, toDateKey(new Date()))?.status === "done").length;
  const completion = habits.length ? Math.round((doneCount / habits.length) * 100) : 0;
  const today = toDateKey(new Date());
  const todayHolidayName = getHolidayName(today);

  return `
    <section class="section ${activeView === "today" ? "is-active" : ""}">
      <div class="hero">
        <div class="hero-panel">
          <p class="eyebrow">${formatDate(today)}${todayHolidayName ? ` / ${escapeHtml(todayHolidayName)}` : ""}</p>
          <h1>今日の一歩を、達成できる大きさで。</h1>
          <p class="lead">
            if-thenルールで迷う時間を減らし、最小達成条件で続ける入口を残します。
            完璧な日より、戻ってこられる設計を優先します。
          </p>
        </div>
        <aside class="side-panel" aria-label="今日の概要">
          <div class="metric">
            <p class="metric-label">今日の達成</p>
            <p class="metric-value">${doneCount}/${habits.length}</p>
          </div>
          <div class="metric">
            <p class="metric-label">今日の達成率</p>
            <p class="metric-value">${completion}%</p>
          </div>
        </aside>
      </div>

      <div class="toolbar">
        <div>
          <h2>今日の習慣</h2>
          <p>まずは最小達成条件だけでもOKです。</p>
        </div>
        <button class="btn primary" data-open-drawer>習慣を追加</button>
      </div>

      ${
        habits.length
          ? `<div class="grid">${habits.map(renderTodayCard).join("")}</div>`
          : renderEmpty("今日の対象習慣はありません", "新しい習慣を追加すると、ここに今日やることが表示されます。")
      }
    </section>
  `;
}

function renderTodayCard(habit) {
  const today = toDateKey(new Date());
  const log = getLog(habit.id, today);
  const stats = getCurrentStats(habit);
  const steps = getHabitSteps(habit);
  const completedStepIds = getCompletedStepIds(log, habit);
  const branchSelections = getBranchSelections(log);
  const displayStatus = getLogDisplayStatus(log, habit);
  const minimumLabel = getMinimumStepLabel(steps, habit.minimumStepId);

  return `
    <article class="card habit-card">
      <div class="habit-card-header">
        <div>
          <h3 class="habit-title">${escapeHtml(habit.title)}</h3>
          <p class="rule">もし ${escapeHtml(habit.ifTrigger)}、${escapeHtml(habit.thenAction)}</p>
        </div>
        <div class="log-state ${displayStatus.className}">${displayStatus.label}</div>
      </div>
      <div class="tag-list">
        <span class="tag">${escapeHtml(frequencyLabels[habit.frequencyType])}</span>
        <span class="tag">${habit.habitMode === "routine" ? "ルーティン" : "単発"}</span>
        <span class="tag blue">最小: ${escapeHtml(minimumLabel)}</span>
        <span class="tag accent">${escapeHtml(targetLabel(habit))}</span>
      </div>
      <div class="step-list">
        ${steps
          .map((step, index) => renderTodayStep(habit, step, index, completedStepIds, branchSelections))
          .join("")}
      </div>
      ${renderBenefitLibrary(habit, { title: "今日やる理由", featured: true, limit: 3 })}
      <div>
        <div class="progress" aria-label="今期の達成率">
          <div class="progress-bar" style="width: ${stats.successRate}%"></div>
        </div>
      </div>
      <p class="save-note">ステップや分岐を操作すると、その時点で保存されます。</p>
      <div class="button-row">
        <button class="btn primary" data-log="${habit.id}" data-status="done">すべて達成</button>
        <button class="btn" data-log="${habit.id}" data-status="missed">すべて未達</button>
        <button class="btn" data-log="${habit.id}" data-status="skipped">スキップ</button>
      </div>
    </article>
  `;
}

function renderTodayStep(habit, step, index, completedStepIds, branchSelections) {
  const minimumMark = step.id === habit.minimumStepId ? `<span class="minimum-badge">最小達成</span>` : "";
  const stepTarget = renderStepTarget(step);
  if (step.type === "choice") {
    return `
      <div class="step-item choice-step">
        <span class="step-index">${index + 1}</span>
        <div>
          <p class="choice-title">${escapeHtml(step.title)} ${minimumMark} ${stepTarget}</p>
          <div class="choice-options">
            ${step.options
              .map(
                (option) => `
                  <label class="choice-option">
                    <input
                      type="radio"
                      name="branch-${habit.id}-${step.id}"
                      data-branch-select="${habit.id}"
                      data-step-id="${step.id}"
                      data-option-id="${option.id}"
                      ${branchSelections[step.id] === option.id ? "checked" : ""}
                    />
                    <span><strong>${escapeHtml(option.label)}</strong>: ${escapeHtml(option.action)}</span>
                  </label>
                `,
              )
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  return `
    <label class="step-item">
      <input type="checkbox" data-step-toggle="${habit.id}" data-step-id="${step.id}" ${completedStepIds.includes(step.id) ? "checked" : ""} />
      <span class="step-index">${index + 1}</span>
      <span>${escapeHtml(step.title)} ${minimumMark} ${stepTarget}</span>
    </label>
  `;
}

function renderHabits() {
  return `
    <section class="section ${activeView === "habits" ? "is-active" : ""}">
      <div class="toolbar">
        <div>
          <h2>習慣一覧</h2>
          <p>${state.habits.length}件の習慣、全体達成率 ${overallRate()}%</p>
        </div>
        <button class="btn primary" data-open-drawer>習慣を追加</button>
      </div>
      ${
        state.habits.length
          ? `<div class="list">${state.habits.map(renderHabitListCard).join("")}</div>`
          : renderEmpty("まだ習慣がありません", "if-thenルールと最小達成条件をセットで登録してみましょう。")
      }
    </section>
  `;
}

function renderHabitListCard(habit) {
  const stats = getCurrentStats(habit);

  return `
    <article class="card habit-card">
      <div class="habit-card-header">
        <div>
          <h3 class="habit-title">${escapeHtml(habit.title)}</h3>
          <p class="rule">もし ${escapeHtml(habit.ifTrigger)}、${escapeHtml(habit.thenAction)}</p>
        </div>
        <div class="log-state">${stats.successRate}%</div>
      </div>
      <div class="tag-list">
        <span class="tag">${escapeHtml(frequencyLabels[habit.frequencyType])}</span>
        <span class="tag">${habit.habitMode === "routine" ? `${getHabitSteps(habit).length}ステップ` : "単発"}</span>
        <span class="tag blue">${habit.reviewIntervalDays}日レビュー</span>
        <span class="tag accent">${escapeHtml(targetLabel(habit))}</span>
        <span class="tag">${escapeHtml(habit.status)}</span>
      </div>
      ${renderBenefitLibrary(habit, { title: "理由ライブラリ" })}
      <div class="progress">
        <div class="progress-bar" style="width: ${stats.successRate}%"></div>
      </div>
      <div class="button-row">
        <button class="btn" data-edit="${habit.id}">編集</button>
        <button class="btn danger" data-delete="${habit.id}">削除</button>
      </div>
    </article>
  `;
}

function renderReviews() {
  const activeHabits = state.habits.filter((habit) => habit.status === "active");

  return `
    <section class="section ${activeView === "reviews" ? "is-active" : ""}">
      <div class="toolbar">
        <div>
          <h2>レビュー</h2>
          <p>達成率だけでなく、体感難易度も見て次の目標を決めます。</p>
        </div>
      </div>
      ${
        activeHabits.length
          ? `<div class="list">${activeHabits.map(renderReviewCard).join("")}</div>`
          : renderEmpty("レビュー対象がありません", "アクティブな習慣を追加するとレビューが表示されます。")
      }
    </section>
  `;
}

function renderSettings() {
  return `
    <section class="section ${activeView === "settings" ? "is-active" : ""}">
      <div class="toolbar">
        <div>
          <h2>設定</h2>
          <p>祝日リストを編集すると、平日・土日祝・祝日の判定に反映されます。</p>
        </div>
      </div>
      <div class="settings-layout">
        <article class="card settings-card">
          <h3>祝日リスト</h3>
          <p class="rule">1行に1件、日付と名前をカンマ区切りで入力します。</p>
          <form class="form" id="holiday-form">
            <label class="field">
              <span>祝日</span>
              <textarea name="holidays" class="large-textarea" placeholder="2026-01-01, 元日">${escapeHtml(formatHolidaysForTextarea())}</textarea>
            </label>
            <div class="button-row">
              <button class="btn primary" type="submit">祝日を保存</button>
              <button class="btn" type="button" data-reset-holidays>2026年の日本祝日に戻す</button>
            </div>
          </form>
        </article>
        <article class="card settings-card">
          <h3>頻度の判定</h3>
          <div class="holiday-help">
            <p><strong>平日（月〜金）</strong><span>祝日でも月〜金なら対象にします。</span></p>
            <p><strong>平日（祝日除く）</strong><span>月〜金から祝日を外します。</span></p>
            <p><strong>土日</strong><span>土曜・日曜だけ対象にします。</span></p>
            <p><strong>土日祝</strong><span>土曜・日曜・祝日を対象にします。</span></p>
            <p><strong>祝日のみ</strong><span>祝日リストにある日だけ対象にします。</span></p>
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderReviewCard(habit) {
  const stats = getCurrentStats(habit);
  const suggestion = getSuggestion(stats.successRate, "good");
  const recentReview = state.reviews
    .filter((review) => review.habitId === habit.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return `
    <article class="card review-card">
      <div class="habit-card-header">
        <div>
          <h3>${escapeHtml(habit.title)}</h3>
          <p class="rule">${formatDate(stats.periodStart)} から ${formatDate(stats.periodEnd)} の期間。集計は ${formatDate(stats.statsEnd)} まで</p>
        </div>
        <span class="tag">${habit.reviewIntervalDays}日ごと</span>
      </div>
      <div class="review-stats">
        <div class="review-stat"><span>対象日</span><strong>${stats.targetDays}</strong></div>
        <div class="review-stat"><span>開始率</span><strong>${stats.startRate}%</strong></div>
        <div class="review-stat"><span>最小達成率</span><strong>${stats.minimumRate}%</strong></div>
        <div class="review-stat"><span>完了率</span><strong>${stats.successRate}%</strong></div>
      </div>
      <div class="progress">
        <div class="progress-bar" style="width: ${stats.successRate}%"></div>
      </div>
      ${renderStepAnalysis(stats)}
      ${renderBranchAnalysis(stats)}
      <div class="suggestion">${escapeHtml(getSuggestionText(suggestion, habit))}</div>
      <form class="review-form" data-review="${habit.id}">
        <div class="form-grid">
          <label class="field">
            <span>体感難易度</span>
            <select name="perceivedDifficulty">
              <option value="easy">簡単</option>
              <option value="good" selected>ちょうどいい</option>
              <option value="hard">きつい</option>
            </select>
          </label>
          <label class="field">
            <span>次の調整</span>
            <select name="userDecision">
              <option value="increase">上げる</option>
              <option value="maintain" selected>維持する</option>
              <option value="decrease">下げる</option>
              <option value="adjust">条件変更</option>
            </select>
          </label>
        </div>
        <div class="button-row">
          <button class="btn primary" type="submit">レビューを保存</button>
        </div>
      </form>
      ${
        recentReview
          ? `<p class="rule">前回保存: 達成率 ${recentReview.successRate}% / 判断 ${escapeHtml(recentReview.userDecision)}</p>`
          : ""
      }
    </article>
  `;
}

function renderStepAnalysis(stats) {
  if (!stats.stepStats?.length) return "";

  return `
    <div class="step-analysis">
      <div class="step-analysis-header">
        <h3>ステップ別</h3>
        <p>${stats.bottleneck ? `つまずき: ${escapeHtml(stats.bottleneck.fromLabel)} → ${escapeHtml(stats.bottleneck.toLabel)} (${stats.bottleneck.rate}%)` : "つまずきはまだ判定できません"}</p>
      </div>
      <div class="step-bars">
        ${stats.stepStats
          .map(
            (step, index) => `
              <div class="step-bar-row">
                <div class="step-bar-label">${index + 1}. ${escapeHtml(getStepLabel(step))}</div>
                <div class="step-bar-track">
                  <div class="step-bar-fill" style="width: ${step.rate}%"></div>
                </div>
                <div class="step-bar-rate">${step.rate}%</div>
              </div>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderBranchAnalysis(stats) {
  const branchStats = stats.branchStats || [];
  if (!branchStats.length) return "";

  return `
    <div class="step-analysis">
      <div class="step-analysis-header">
        <h3>分岐別</h3>
        <p>その日に選んだ条件ごとの完了状況</p>
      </div>
      <div class="branch-analysis-list">
        ${branchStats
          .map(
            (branch) => `
              <div class="branch-analysis">
                <p class="choice-title">${escapeHtml(branch.title)}</p>
                ${branch.options
                  .map(
                    (option) => `
                      <div class="step-bar-row">
                        <div class="step-bar-label">${escapeHtml(option.label)}: ${escapeHtml(option.action || "行動未設定")}</div>
                        <div class="step-bar-track">
                          <div class="step-bar-fill" style="width: ${option.completionRate}%"></div>
                        </div>
                        <div class="step-bar-rate">${option.completedDays}/${option.selectedDays}</div>
                      </div>
                    `,
                  )
                  .join("")}
              </div>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderEmpty(title, body) {
  return `
    <div class="empty-panel">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
    </div>
  `;
}

function targetLabel(habit) {
  const targets = getHabitSteps(habit).filter((step) => step.currentTargetValue);
  if (!targets.length) return "目標: 設定なし";
  if (targets.length === 1) return `目標: ${getStepTargetText(targets[0])}`;
  return `目標: ${targets.length}ステップ`;
}

function getStepTargetText(step) {
  if (!step.currentTargetValue) return "";
  return `${step.currentTargetValue}${step.currentTargetUnit || ""} / ${growthTypeLabels[step.growthType] || "維持"}`;
}

function renderStepTarget(step) {
  const text = getStepTargetText(step);
  return text ? `<span class="step-target">${escapeHtml(text)}</span>` : "";
}

function renderDrawer() {
  const habit = state.habits.find((item) => item.id === editingHabitId);
  const today = toDateKey(new Date());
  const benefitsText = habit ? formatBenefitsForTextarea(habit) : "";
  const minimumStepNumber = habit ? Math.max(1, getHabitSteps(habit).findIndex((step) => step.id === habit.minimumStepId) + 1) : 1;

  return `
    <div class="drawer" role="dialog" aria-modal="true" aria-label="習慣フォーム">
      <div class="drawer-panel">
        <div class="drawer-header">
          <div>
            <p class="eyebrow">${habit ? "編集" : "新規作成"}</p>
            <h2>${habit ? "習慣を整える" : "習慣を追加"}</h2>
          </div>
          <button class="icon-btn" data-close-drawer aria-label="閉じる">×</button>
        </div>
        <form class="form" id="habit-form">
          <label class="field">
            <span>習慣名</span>
            <input name="title" value="${escapeHtml(habit?.title || "")}" placeholder="例: 朝のストレッチ" required />
          </label>
          <label class="field">
            <span>if条件</span>
            <input name="ifTrigger" value="${escapeHtml(habit?.ifTrigger || "")}" placeholder="例: 朝コーヒーを淹れたら" required />
          </label>
          <label class="field">
            <span>習慣タイプ</span>
            <select name="habitMode">
              ${option("single", "単発習慣", habit?.habitMode || "single")}
              ${option("routine", "ルーティン習慣", habit?.habitMode || "single")}
            </select>
          </label>
          <div class="field">
            <span>ステップ</span>
            ${renderStepEditor(habit)}
          </div>
          <label class="field">
            <span>then行動の要約</span>
            <input name="thenAction" value="${escapeHtml(habit?.thenAction || "")}" placeholder="未入力ならステップから自動作成します" />
          </label>
          <label class="field">
            <span>最小達成ステップ</span>
            <input name="minimumStepNumber" type="number" min="1" value="${minimumStepNumber}" required />
            <small>ステップ欄の何番目まで完了したら「最小達成」にするかを指定します。</small>
          </label>
          <div class="form-grid">
            <label class="field">
              <span>頻度</span>
              <select name="frequencyType">
                ${option("daily", "毎日", habit?.frequencyType)}
                ${option("weekdays", "平日（月〜金）", habit?.frequencyType)}
                ${option("business_days", "平日（祝日除く）", habit?.frequencyType)}
                ${option("weekends", "土日", habit?.frequencyType)}
                ${option("weekends_holidays", "土日祝", habit?.frequencyType)}
                ${option("holidays", "祝日のみ", habit?.frequencyType)}
                ${option("weekly", "週指定", habit?.frequencyType)}
              </select>
            </label>
            <label class="field">
              <span>週指定の日数</span>
              <input name="weeklyTargetCount" type="number" min="1" max="7" value="${habit?.weeklyTargetCount || 3}" />
            </label>
          </div>
          <label class="field">
            <span>レビュー周期</span>
            <select name="reviewIntervalDays">
              ${option("7", "7日", String(habit?.reviewIntervalDays || 7))}
              ${option("14", "14日", String(habit?.reviewIntervalDays || 7))}
            </select>
          </label>
          <label class="field">
            <span>メリットライブラリ</span>
            <textarea name="benefits" class="large-textarea" placeholder="例: 朝から自己肯定感が上がる #短期 #自信&#10;将来の健康不安が減る #長期 #健康&#10;仕事前に頭がすっきりする #短期 #仕事">${escapeHtml(benefitsText)}</textarea>
          </label>
          <div class="tag-suggestions" aria-label="おすすめタグ">
            ${defaultBenefitTags.map((tag) => `<span class="benefit-tag">#${escapeHtml(tag)}</span>`).join("")}
          </div>
          <div class="form-grid">
            <label class="field">
              <span>開始日</span>
              <input name="startDate" type="date" value="${habit?.startDate || today}" />
            </label>
            <label class="field">
              <span>状態</span>
              <select name="status">
                ${option("active", "active", habit?.status)}
                ${option("paused", "paused", habit?.status)}
                ${option("archived", "archived", habit?.status)}
              </select>
            </label>
          </div>
          <div class="button-row">
            <button class="btn primary" type="submit">${habit ? "保存" : "追加"}</button>
            <button class="btn" type="button" data-close-drawer>キャンセル</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function option(value, label, currentValue) {
  return `<option value="${escapeHtml(value)}" ${String(currentValue) === String(value) ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  document.querySelectorAll("[data-open-drawer]").forEach((button) => {
    button.addEventListener("click", () => openDrawer());
  });

  document.querySelectorAll("[data-close-drawer]").forEach((button) => {
    button.addEventListener("click", closeDrawer);
  });

  document.querySelectorAll("[data-log]").forEach((button) => {
    button.addEventListener("click", () => {
      const status = button.dataset.status;
      const missedReason = status === "missed" ? promptMissedReason() : "";
      upsertLog(button.dataset.log, status, { missedReason });
    });
  });

  document.querySelectorAll("[data-step-toggle]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      toggleStep(checkbox.dataset.stepToggle, checkbox.dataset.stepId);
    });
  });

  document.querySelectorAll("[data-branch-select]").forEach((radio) => {
    radio.addEventListener("pointerdown", () => {
      radio.dataset.wasChecked = radio.checked ? "true" : "false";
    });

    radio.addEventListener("keydown", (event) => {
      if ((event.key === " " || event.key === "Enter") && radio.checked) {
        event.preventDefault();
        clearBranchOption(radio.dataset.branchSelect, radio.dataset.stepId);
      }
    });

    radio.addEventListener("click", (event) => {
      if (radio.dataset.wasChecked === "true") {
        event.preventDefault();
        radio.checked = false;
        clearBranchOption(radio.dataset.branchSelect, radio.dataset.stepId);
      }
    });

    radio.addEventListener("change", () => {
      selectBranchOption(radio.dataset.branchSelect, radio.dataset.stepId, radio.dataset.optionId);
    });
  });

  document.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => openDrawer(button.dataset.edit));
  });

  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteHabit(button.dataset.delete));
  });

  document.querySelector("#habit-form")?.addEventListener("submit", handleHabitSubmit);
  document.querySelector("#habit-form")?.addEventListener("click", handleHabitFormClick);
  document.querySelector("#holiday-form")?.addEventListener("submit", handleHolidaySubmit);

  document.querySelector("[data-reset-holidays]")?.addEventListener("click", resetHolidays);

  document.querySelectorAll(".review-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      createReview(
        form.dataset.review,
        String(formData.get("perceivedDifficulty")),
        String(formData.get("userDecision")),
      );
    });
  });
}

function handleHabitFormClick(event) {
  const target = event.target.closest("button");
  if (!target) return;

  if (target.matches("[data-add-task-step]")) {
    addTaskStep(target);
  } else if (target.matches("[data-add-choice-step]")) {
    addChoiceStep(target);
  } else if (target.matches("[data-remove-step]")) {
    removeStep(target);
  } else if (target.matches("[data-add-choice-option]")) {
    addChoiceOption(target);
  } else if (target.matches("[data-remove-choice-option]")) {
    removeChoiceOption(target);
  } else {
    return;
  }

  event.preventDefault();
}

function promptMissedReason() {
  const input = prompt(
    `未達理由を数字で入力できます。\n1: ${missedReasonLabels.forgot}\n2: ${missedReasonLabels.busy}\n3: ${missedReasonLabels.too_hard}\n4: ${missedReasonLabels.condition}\n5: ${missedReasonLabels.other}`,
    "1",
  );

  const map = {
    1: "forgot",
    2: "busy",
    3: "too_hard",
    4: "condition",
    5: "other",
  };

  return map[input] || "";
}

render();
