// Create and export the questions used by the faction assessment.
export const factionAssessmentQuestions = [
  {
    id: "q1",

    question:
      "When training becomes difficult, what motivates you to keep going?",

    options: [
      {
        id: "q1-a",

        text: "Knowing I am becoming better than I was yesterday.",

        faction: "helix",

        points: 2,
      },

      {
        id: "q1-b",

        text: "Proving that I can endure even when things get difficult.",

        faction: "aegis",

        points: 2,
      },

      {
        id: "q1-c",

        text: "The desire to crush the goal I set for myself.",

        faction: "nova",

        points: 2,
      },

      {
        id: "q1-d",

        text: "Knowing other people are pushing alongside me.",

        faction: "rally",

        points: 2,
      },
    ],
  },

  // Question 2.
  {
    id: "q2",

    question:
      "Which description sounds most like the athlete you want to become?",

    options: [
      {
        id: "q2-a",
        text: "Always learning, adapting, and improving.",
        faction: "helix",
        points: 2,
      },

      {
        id: "q2-b",
        text: "Reliable, disciplined, and difficult to break.",
        faction: "aegis",
        points: 2,
      },

      {
        id: "q2-c",
        text: "Fearless, ambitious, and constantly chasing bigger goals.",
        faction: "nova",
        points: 2,
      },

      {
        id: "q2-d",
        text: "Someone who makes themselves and everyone around them stronger.",
        faction: "rally",
        points: 2,
      },
    ],
  },

  {
    id: "q3",

    question: "What matters most to you when pursuing a difficult goal?",

    options: [
      {
        id: "q3-a",
        text: "Finding ways to improve and evolve along the way.",
        faction: "helix",
        points: 2,
      },

      {
        id: "q3-b",
        text: "Staying consistent even when motivation disappears.",
        faction: "aegis",
        points: 2,
      },

      {
        id: "q3-c",
        text: "Pushing beyond what I previously thought was possible.",
        faction: "nova",
        points: 2,
      },

      {
        id: "q3-d",
        text: "Sharing the challenge with people who hold me accountable.",
        faction: "rally",
        points: 2,
      },
    ],
  },

  {
    id: "q4",

    question: "Which environment brings out your best performance?",

    options: [
      {
        id: "q4-a",
        text: "An environment where I can experiment, learn, and improve.",
        faction: "helix",
        points: 2,
      },

      {
        id: "q4-b",
        text: "A structured environment built around discipline and consistency.",
        faction: "aegis",
        points: 2,
      },

      {
        id: "q4-c",
        text: "A competitive environment that pushes me to outperform myself.",
        faction: "nova",
        points: 2,
      },

      {
        id: "q4-d",
        text: "A team environment where everyone pushes each other forward.",
        faction: "rally",
        points: 2,
      },
    ],
  },
];
