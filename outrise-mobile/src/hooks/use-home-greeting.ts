import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

type GreetingPeriod = "morning" | "afternoon" | "evening" | "night";

const greetings: Record<GreetingPeriod, string[]> = {
  morning: [
    "Good morning",
    "Morning, legend",
    "Rise and rep",
    "Coffee first. PRs second",
    "Up early. Already winning",
  ],
  afternoon: [
    "Good afternoon",
    "What's up",
    "Ready to lift",
    "Your next PR is waiting",
    "Lunch break or leg day",
  ],
  evening: [
    "Good evening",
    "Finish strong",
    "One more win today",
    "Evening, heavyweight",
    "The couch can wait",
  ],
  night: [
    "Hey, night owl",
    "Midnight gains",
    "Still chasing greatness",
    "The weights don't have a bedtime",
    "Sleep is a recovery stat, too",
  ],
};

const anytimeGreetings = [
  "You showed up. That counts",
  "Ready to make gravity jealous",
  "Your faction could use a hero",
  "Let's earn that post-workout snack",
  "Another day. Another chance to level up",
];

function getPeriod(hour: number): GreetingPeriod {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

function pickGreeting(period: GreetingPeriod) {
  const options = [...greetings[period], ...anytimeGreetings];
  return {
    period,
    text: `${options[Math.floor(Math.random() * options.length)]},`,
  };
}

export function useHomeGreeting() {
  const [greeting, setGreeting] = useState(() =>
    pickGreeting(getPeriod(new Date().getHours())),
  );

  useFocusEffect(
    useCallback(() => {
      const refreshPeriod = () => {
        // Device-local time; keep the choice stable until the time period changes.
        const period = getPeriod(new Date().getHours());
        setGreeting((current) =>
          current.period === period ? current : pickGreeting(period),
        );
      };
      refreshPeriod();
      const timer = setInterval(refreshPeriod, 60_000);
      return () => clearInterval(timer);
    }, []),
  );

  return greeting.text;
}
