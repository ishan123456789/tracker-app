// Script to add sample categorized tasks for testing category analysis
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://your-convex-deployment.convex.cloud");

const sampleTasks = [
  // Fitness tasks
  {
    text: "Morning run - 5km",
    done: true,
    mainCategory: "🏃 Fitness",
    subcategory: "Cardio",
    activityType: "Running",
    priority: "medium",
    estimatedMinutes: 30,
    actualMinutes: 28,
    timeSpent: 28
  },
  {
    text: "Gym workout - chest and triceps",
    done: true,
    mainCategory: "🏃 Fitness",
    subcategory: "Strength Training",
    activityType: "Weightlifting",
    priority: "high",
    estimatedMinutes: 60,
    actualMinutes: 65,
    timeSpent: 65
  },
  {
    text: "Yoga session",
    done: true,
    mainCategory: "🏃 Fitness",
    subcategory: "Flexibility",
    activityType: "Yoga",
    priority: "low",
    estimatedMinutes: 45,
    actualMinutes: 50,
    timeSpent: 50
  },

  // Learning tasks
  {
    text: "Read chapter 5 of JavaScript book",
    done: true,
    mainCategory: "🧠 Learning",
    subcategory: "Reading",
    activityType: "Books",
    priority: "high",
    estimatedMinutes: 90,
    actualMinutes: 85,
    timeSpent: 85
  },
  {
    text: "Complete React course module",
    done: true,
    mainCategory: "🧠 Learning",
    subcategory: "Courses",
    activityType: "Online",
    priority: "high",
    estimatedMinutes: 120,
    actualMinutes: 135,
    timeSpent: 135
  },
  {
    text: "Practice Spanish vocabulary",
    done: true,
    mainCategory: "🧠 Learning",
    subcategory: "Languages",
    activityType: "Vocabulary",
    priority: "medium",
    estimatedMinutes: 30,
    actualMinutes: 25,
    timeSpent: 25
  },

  // Work tasks
  {
    text: "Team standup meeting",
    done: true,
    mainCategory: "💼 Work",
    subcategory: "Meetings",
    activityType: "Team",
    priority: "medium",
    estimatedMinutes: 15,
    actualMinutes: 20,
    timeSpent: 20
  },
  {
    text: "Code review for feature X",
    done: true,
    mainCategory: "💼 Work",
    subcategory: "Projects",
    activityType: "Development",
    priority: "high",
    estimatedMinutes: 45,
    actualMinutes: 40,
    timeSpent: 40
  },
  {
    text: "Update project documentation",
    done: true,
    mainCategory: "💼 Work",
    subcategory: "Admin",
    activityType: "Documentation",
    priority: "low",
    estimatedMinutes: 60,
    actualMinutes: 75,
    timeSpent: 75
  },

  // Hobbies tasks
  {
    text: "Chess puzzle practice",
    done: true,
    mainCategory: "🎮 Hobbies",
    subcategory: "Games",
    activityType: "Chess",
    priority: "low",
    estimatedMinutes: 30,
    actualMinutes: 35,
    timeSpent: 35
  },
  {
    text: "Digital art practice",
    done: true,
    mainCategory: "🎮 Hobbies",
    subcategory: "Creative",
    activityType: "Art",
    priority: "medium",
    estimatedMinutes: 90,
    actualMinutes: 100,
    timeSpent: 100
  },

  // Personal tasks
  {
    text: "Grocery shopping",
    done: true,
    mainCategory: "🏠 Personal",
    subcategory: "Household",
    activityType: "Shopping",
    priority: "medium",
    estimatedMinutes: 45,
    actualMinutes: 50,
    timeSpent: 50
  },
  {
    text: "Pay monthly bills",
    done: true,
    mainCategory: "🏠 Personal",
    subcategory: "Finance",
    activityType: "Bills",
    priority: "high",
    estimatedMinutes: 30,
    actualMinutes: 25,
    timeSpent: 25
  }
];

async function addSampleTasks() {
  try {
    console.log("Adding sample categorized tasks...");

    for (const task of sampleTasks) {
      // Set completion timestamp to recent dates for analytics
      const completedAt = Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000; // Random time in last 7 days

      await client.mutation("todos:add", {
        ...task,
        completedAt,
        doneAt: completedAt
      });

      console.log(`Added: ${task.text}`);
    }

    console.log("✅ Sample categorized tasks added successfully!");
    console.log("You can now test the category analysis with different filters.");

  } catch (error) {
    console.error("❌ Error adding sample tasks:", error);
  }
}

// Run the script
addSampleTasks();
