/**
 * Outrise exercise library catalog.
 *
 * This file is a standalone seeder; normal API startup does not import it.
 * Manual use from outrise-api:
 *   node src/seeds/seedExercises.js --dry-run   # Validate only; no DB connection.
 *   node src/seeds/seedExercises.js            # Insert missing exercises.
 *
 * Reads MONGO_URI from the environment or outrise-api/.env only when seeding.
 * Existing exercises (including archived ones) keep their IDs, XP, content,
 * and timestamps. No exercises are deleted, overwritten, or reactivated.
 * New exercises have explicit XP values, original instructions, and no video
 * URL because the catalog does not invent instructional video links.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath, pathToFileURL } from "node:url";
import Exercise from "../models/Exercise.js";
import { createExerciseSchema } from "../middleware/validators/exercise.validators.js";

// Exercises are grouped by category and sorted by name within each group.
// BEGIN EXERCISE CATALOG
export const exerciseCatalog = [
  {
    name: "45-Degree Leg Press",
    description:
      "A supported leg press that moves a loaded sled along inclined rails.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "hamstrings"],
    equipment: ["machine"],
    instructions: [
      "Sit with your hips and back supported and place both feet securely on the platform.",
      "Release the safety handles and brace your trunk.",
      "Bend your knees to lower the sled only as far as your pelvis stays supported.",
      "Press through both feet to extend your legs, then engage the catches before leaving.",
    ],
    measurementType: "weight_reps",
    baseXP: 15,
  },
  {
    name: "Alternating Dumbbell Bench Press",
    description:
      "An alternating chest press that requires one arm to hold its position while the other completes a repetition.",
    category: "strength",
    muscleGroups: ["chest", "triceps", "shoulders", "core"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Lie on a flat bench with both dumbbells held above the chest and feet firmly planted.",
      "Keep one arm extended as the opposite dumbbell lowers beside the chest and presses back up.",
      "Switch sides only after the moving weight reaches the top, keeping the torso level throughout.",
    ],
  },
  {
    name: "Alternating Dumbbell Biceps Curl",
    description:
      "An alternating dumbbell curl that lets each arm complete a controlled elbow-flexion repetition in turn.",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["dumbbell"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Stand tall with the dumbbells at the sides and palms facing inward.",
      "Curl one weight while turning its palm upward, keeping the other arm still at the side.",
      "Lower and reverse the rotation before curling the other arm without rocking the torso.",
    ],
  },
  {
    name: "Arnold Press",
    description:
      "A dumbbell shoulder press that combines an overhead press with a controlled change in forearm orientation.",
    category: "strength",
    muscleGroups: ["shoulders", "triceps"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Sit upright with dumbbells in front of the shoulders and palms facing the chest.",
      "Rotate the forearms outward as you press overhead so the palms face forward near the top.",
      "Lower while reversing the rotation, keeping the movement smooth and the ribs steady.",
    ],
  },
  {
    name: "B-Stance Barbell Hip Thrust",
    description:
      "A hip thrust using a staggered foot position to place most of the load on one leg.",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings", "core"],
    equipment: ["barbell", "bench"],
    instructions: [
      "Position your upper back on a stable bench and a padded bar over your hips.",
      "Plant the working foot and place the other foot slightly forward with light heel contact.",
      "Drive mainly through the working foot to extend your hips while keeping your pelvis square.",
      "Lower with control and maintain the staggered stance for the intended side.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Backward Sled Drag",
    description:
      "A backward walk pulling a weighted sled with the arms holding its straps.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "calves", "core"],
    equipment: ["sled"],
    instructions: [
      "Face the sled, hold its straps securely, and step back until they are taut.",
      "Brace with a slight bend in your hips and knees.",
      "Walk backward with short, deliberate steps while keeping your torso steady and the straps tight.",
      "Stop carefully and lower or release the straps after the sled is stationary.",
    ],
    measurementType: "distance_time",
    baseXP: 20,
  },
  {
    name: "Barbell Back Squat",
    description:
      "A barbell squat with the load across the upper back, using the hips and knees together to lower and stand.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["barbell"],
    instructions: [
      "Set the bar across your upper traps and grip it evenly before stepping clear of the rack.",
      "Plant your feet about shoulder width apart, brace your trunk, and keep pressure across each whole foot.",
      "Bend your hips and knees together, letting the knees follow the direction of your toes.",
      "Descend to a controlled depth, then push through the floor and stand without tipping forward.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Barbell Bench Press",
    description:
      "A flat-bench barbell press that trains the chest while the shoulders and triceps assist.",
    category: "strength",
    muscleGroups: ["chest", "shoulders", "triceps"],
    equipment: ["barbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Lie on the bench with feet planted, shoulder blades drawn together, and hands just outside shoulder width.",
      "Unrack the bar and lower it under control toward the lower chest with wrists stacked above elbows.",
      "Press the bar upward until the arms straighten, keeping the shoulders supported against the bench.",
    ],
  },
  {
    name: "Barbell Bent-Over Row",
    description:
      "A hinged barbell row that trains the back while the trunk maintains a stable torso angle.",
    category: "strength",
    muscleGroups: ["back", "biceps", "core"],
    equipment: ["barbell"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Hinge at the hips with softly bent knees and grip the bar slightly wider than shoulder width.",
      "Pull the bar toward the lower ribs while keeping the torso angle fixed and neck aligned.",
      "Lower the bar to straight arms without rounding the back or bouncing the hips.",
    ],
  },
  {
    name: "Barbell Biceps Curl",
    description:
      "A standing barbell curl that loads both elbow flexors through a fixed underhand grip.",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["barbell"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Stand tall holding the bar with palms upward and hands about shoulder width apart.",
      "Bend the elbows to curl the bar toward the shoulders while keeping the upper arms beside the torso.",
      "Lower to comfortable elbow extension without leaning backward or swinging the hips.",
    ],
  },
  {
    name: "Barbell Box Squat",
    description:
      "A back squat that uses a stable box to define depth and a controlled seated transition.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "hamstrings", "core"],
    equipment: ["barbell", "plyometric box"],
    instructions: [
      "Position a sturdy box behind you and place the bar across your upper back.",
      "Brace and sit your hips back while bending your knees toward the box.",
      "Contact the box under control without rocking backward or relaxing your trunk.",
      "Push through your feet to stand and reset your balance before the next repetition.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Barbell Bulgarian Split Squat",
    description:
      "A split squat with the rear foot supported on a bench and a barbell across the upper back.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["barbell", "bench"],
    instructions: [
      "Place your rear foot on a stable bench and secure the bar across your upper back.",
      "Position the front foot far enough forward to lower without losing balance.",
      "Bend the front knee and hip while allowing the rear knee to descend.",
      "Push through the front foot to return upright, then change legs after completing your repetitions.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Barbell Clean",
    description:
      "An Olympic lift moving a barbell from the floor into a front rack while receiving it in a squat.",
    category: "strength",
    muscleGroups: ["full body", "quadriceps", "glutes", "back", "core"],
    equipment: ["barbell"],
    instructions: [
      "Set the bar over midfoot, take a clean grip, and brace in a balanced starting position.",
      "Push through the floor and keep the bar close as it passes your knees.",
      "Extend your legs and hips, then move under the bar and rotate your elbows forward into the front rack.",
      "Receive the bar in a stable squat and stand before returning it under control.",
    ],
    measurementType: "weight_reps",
    baseXP: 30,
  },
  {
    name: "Barbell Clean and Jerk",
    description:
      "A two-part Olympic lift combining a floor-to-front-rack clean with an overhead jerk.",
    category: "strength",
    muscleGroups: [
      "full body",
      "quadriceps",
      "glutes",
      "back",
      "shoulders",
      "core",
    ],
    equipment: ["barbell"],
    instructions: [
      "Clean the bar from the floor into a secure front rack and stand fully.",
      "Reset your feet and grip, then brace with the bar supported on your shoulders.",
      "Dip vertically, drive through your legs, and move under the bar into a stable split with locked arms.",
      "Recover your feet to a balanced standing position with the bar overhead before lowering it safely.",
    ],
    measurementType: "weight_reps",
    baseXP: 30,
  },
  {
    name: "Barbell Clean High Pull",
    description:
      "An explosive clean-grip pull that continues upward with the elbows after leg and hip extension.",
    category: "strength",
    muscleGroups: ["glutes", "quadriceps", "back", "shoulders", "core"],
    equipment: ["barbell"],
    instructions: [
      "Start in a clean pulling position with the bar close and your trunk braced.",
      "Drive through the floor and extend your legs and hips while keeping the bar near you.",
      "After extension, pull your elbows upward and outward so the bar rises close to your torso.",
      "Lower the bar under control and reset without turning it into a front rack.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Barbell Clean Pull",
    description:
      "The explosive pulling portion of a clean without turning the bar into a rack position.",
    category: "strength",
    muscleGroups: ["glutes", "quadriceps", "hamstrings", "back", "core"],
    equipment: ["barbell"],
    instructions: [
      "Set up as for a clean with the bar close to your shins and arms straight.",
      "Push through the floor and keep the bar close as it passes your knees.",
      "Extend your hips and knees forcefully and finish with a natural upward shrug.",
      "Keep the arms long and lower the bar under control without attempting a catch.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Barbell Deadlift",
    description:
      "A floor pull that raises a barbell by extending the hips and knees together.",
    category: "strength",
    muscleGroups: [
      "glutes",
      "hamstrings",
      "quadriceps",
      "back",
      "forearms",
      "core",
    ],
    equipment: ["barbell"],
    instructions: [
      "Stand with the bar over the middle of your feet and grip it just outside your legs.",
      "Bend your hips and knees, brace your trunk, and keep the bar close to your shins.",
      "Push through the floor and extend your hips and knees together to stand.",
      "Hinge and bend your knees to return the bar to the floor under control.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Barbell Floor Press",
    description:
      "A barbell press from the floor that limits the bottom range and emphasizes strong elbow extension.",
    category: "strength",
    muscleGroups: ["chest", "triceps", "shoulders"],
    equipment: ["barbell"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Lie beneath a securely racked bar with knees bent and shoulder blades settled against the floor.",
      "Lower the bar until the backs of the upper arms gently contact the floor.",
      "Pause without relaxing the shoulders, then press the bar upward to straighten the elbows.",
    ],
  },
  {
    name: "Barbell Forward Lunge",
    description:
      "A forward-stepping lunge performed with a barbell on the back.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["barbell"],
    instructions: [
      "Secure the bar across your upper back and establish a balanced standing position.",
      "Step forward with one foot and settle your weight over the whole front foot.",
      "Bend both knees to lower under control without pitching your torso forward.",
      "Push off the front foot to return to standing, then repeat on the intended side.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Barbell Front Raise",
    description:
      "A two-arm front shoulder raise performed with an overhand barbell grip.",
    category: "strength",
    muscleGroups: ["shoulders"],
    equipment: ["barbell"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Hold a light barbell in front of the thighs with an overhand grip about shoulder width.",
      "Raise the bar forward toward shoulder height while keeping the elbows softly bent.",
      "Lower under control and keep the hips still rather than swinging the bar upward.",
    ],
  },
  {
    name: "Barbell Front Squat",
    description:
      "A squat with the bar supported on the front of the shoulders, emphasizing an upright torso.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core", "back"],
    equipment: ["barbell"],
    instructions: [
      "Rest the bar on your front shoulders with your elbows lifted and your hands guiding the bar.",
      "Stand with feet around shoulder width and brace your abdomen.",
      "Sit down between your hips while keeping your elbows up and your heels grounded.",
      "Press through your feet to stand, maintaining the shoulder rack throughout.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Barbell Front-Rack Carry",
    description:
      "A loaded walk with a barbell supported across the front of the shoulders.",
    category: "strength",
    muscleGroups: ["core", "back", "shoulders", "glutes", "calves"],
    equipment: ["barbell"],
    instructions: [
      "Unrack the bar onto your front shoulders with a secure grip and elbows forward.",
      "Brace and establish a clear walking route with room for the bar ends.",
      "Walk carefully with your torso upright and the bar level.",
      "Stop in balance and place the bar back on supports under control.",
    ],
    measurementType: "distance_time",
    baseXP: 20,
  },
  {
    name: "Barbell Glute Bridge",
    description:
      "A floor-based hip extension with a barbell supported across the hips.",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings", "core"],
    equipment: ["barbell"],
    instructions: [
      "Lie on your back with bent knees, planted feet, and a padded bar over your hips.",
      "Hold the bar in place and brace your abdomen.",
      "Press through your feet to lift your pelvis until your hips are extended.",
      "Lower your hips to the floor under control without overextending your lower back.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Barbell Good Morning",
    description: "A hip hinge with a barbell supported across the upper back.",
    category: "strength",
    muscleGroups: ["hamstrings", "glutes", "back", "core"],
    equipment: ["barbell"],
    instructions: [
      "Place the bar securely across your upper back and stand with soft knees.",
      "Brace your trunk and move your hips backward as your torso inclines forward.",
      "Lower only while you can keep your spine and foot pressure controlled.",
      "Extend your hips to return upright without arching backward.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Barbell Hack Squat",
    description:
      "A floor lift with the bar behind the legs, using a squat-like leg drive to raise the load.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "forearms"],
    equipment: ["barbell"],
    instructions: [
      "Stand in front of a barbell on the floor and grip it behind your legs with straight arms.",
      "Bend your hips and knees while setting a firm, neutral trunk position.",
      "Push through your feet to stand, allowing the bar to travel close behind your legs.",
      "Lower the bar under control by bending your knees and hips, then reset on the floor.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Barbell Hang Clean",
    description:
      "A clean starting from a held position above the floor and received in a squat.",
    category: "strength",
    muscleGroups: ["full body", "quadriceps", "glutes", "back", "core"],
    equipment: ["barbell"],
    instructions: [
      "Stand holding the bar in a clean grip and lower it to a controlled hang above the knees.",
      "Maintain whole-foot balance and keep the bar close while setting your hips.",
      "Drive upward through your legs and hips, then move under the bar into a front-rack squat.",
      "Stand from the receiving position before lowering the bar to the hang.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Barbell Hang Power Clean",
    description:
      "A hang-start clean received with a shallow knee bend rather than a full squat.",
    category: "strength",
    muscleGroups: ["full body", "quadriceps", "glutes", "back", "core"],
    equipment: ["barbell"],
    instructions: [
      "Hold the bar in a clean grip and hinge to a hang position above your knees.",
      "Brace with the bar close and pressure balanced through your feet.",
      "Extend your legs and hips, then rotate your elbows under as you move into the receiving stance.",
      "Catch the bar on your shoulders above parallel and stand before resetting.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Barbell Hang Power Snatch",
    description: "A hang-start snatch received with the thighs above parallel.",
    category: "strength",
    muscleGroups: [
      "full body",
      "quadriceps",
      "glutes",
      "shoulders",
      "back",
      "core",
    ],
    equipment: ["barbell"],
    instructions: [
      "Stand with a wide grip and hinge to a controlled hang above your knees.",
      "Set your balance through the whole feet and keep the bar against your legs.",
      "Extend your legs and hips, then move into the receiving stance while locking your arms overhead.",
      "Catch above parallel, stabilize, and stand before resetting.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Barbell Hang Snatch",
    description:
      "A snatch from a held hang position, received in an overhead squat.",
    category: "strength",
    muscleGroups: [
      "full body",
      "quadriceps",
      "glutes",
      "shoulders",
      "back",
      "core",
    ],
    equipment: ["barbell"],
    instructions: [
      "Hold the bar in a wide grip and lower it to a balanced hang above your knees.",
      "Keep the bar close and brace before accelerating.",
      "Drive through your legs and hips, then move beneath the bar into a squat with arms locked overhead.",
      "Stabilize and stand before lowering the bar back to the hang.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Barbell Hip Thrust",
    description:
      "A hip extension with the upper back on a bench and a barbell supported across the hips.",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings", "core"],
    equipment: ["barbell", "bench"],
    instructions: [
      "Sit with your upper back against a stable bench and position a padded bar across your hips.",
      "Plant your feet firmly and brace with your chin gently tucked.",
      "Drive through your feet to raise your hips until your torso and thighs align.",
      "Lower your hips under control without rolling the bar away from your pelvis.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Barbell Lateral Lunge",
    description:
      "A side-stepping lunge with the barbell supported on the back.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "adductors", "core"],
    equipment: ["barbell"],
    instructions: [
      "Secure the bar across your upper back and stand with your feet close enough to step comfortably.",
      "Step sideways and shift your hips back over the stepping leg.",
      "Bend the stepping knee while keeping the other leg longer and both feet grounded.",
      "Push through the bent leg to return to the starting stance.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Barbell Low-Bar Back Squat",
    description:
      "A back squat with the bar resting lower on the rear shoulders and a greater forward torso angle.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "hamstrings", "core"],
    equipment: ["barbell"],
    instructions: [
      "Place the bar on the rear shoulder shelf below the upper traps, keeping your wrists supported by your grip.",
      "Unrack, set a stable stance, and brace before initiating the descent.",
      "Move your hips back as your knees bend, maintaining the bar over the middle of your feet.",
      "Drive your hips and shoulders upward together until you return to standing.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Barbell Muscle Clean",
    description:
      "A clean pull that finishes in the front rack without rebending the knees to receive the bar.",
    category: "strength",
    muscleGroups: ["glutes", "quadriceps", "back", "shoulders", "core"],
    equipment: ["barbell"],
    instructions: [
      "Set up over the bar with a clean grip and a braced starting position.",
      "Push through the floor and extend your hips and legs while keeping the bar close.",
      "Continue guiding the bar upward with elbows moving out, keeping your legs extended.",
      "Rotate your elbows forward to place the bar smoothly on your shoulders without a second knee bend.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Barbell Muscle Snatch",
    description:
      "A snatch pull that turns the bar overhead while the legs stay extended after the drive.",
    category: "strength",
    muscleGroups: ["glutes", "quadriceps", "back", "shoulders", "core"],
    equipment: ["barbell"],
    instructions: [
      "Set up with a wide snatch grip and brace over the bar.",
      "Drive through your legs and hips, keeping the bar close through the upward pull.",
      "With your legs remaining extended, lift the elbows outward and turn the bar overhead in one continuous movement.",
      "Finish with stable straight arms, then lower the bar without rebending to catch it.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Barbell Overhead Hold",
    description:
      "A stationary standing hold with a barbell secured above the head.",
    category: "strength",
    muscleGroups: ["shoulders", "triceps", "core", "back"],
    equipment: ["barbell"],
    instructions: [
      "Move the bar into a stable overhead position using a controlled lift you can perform reliably.",
      "Stand with a stable base and keep the bar balanced above your shoulders.",
      "Maintain straight elbows and a braced trunk without leaning backward.",
      "Lower the bar safely or return it to suitable supports when the hold ends.",
    ],
    measurementType: "duration",
    baseXP: 25,
  },
  {
    name: "Barbell Overhead Squat",
    description:
      "A squat performed with a wide-grip barbell locked overhead, combining leg strength with overhead control.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "shoulders", "core"],
    equipment: ["barbell"],
    instructions: [
      "Secure the bar overhead with a wide grip and straight elbows before beginning the squat.",
      "Set your feet in a comfortable squat stance and brace with the bar balanced above midfoot.",
      "Bend your hips and knees while actively pressing upward into the bar.",
      "Stand from a stable bottom position, keeping the bar over your base of support.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Barbell Pin Squat",
    description:
      "A squat that begins each ascent with the bar supported on rack pins at a chosen depth.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["barbell"],
    instructions: [
      "Set both rack pins to the same height and place the bar on them at your intended squat depth.",
      "Position yourself under the bar with your feet planted and trunk braced.",
      "Push through the floor to lift the bar clear of the pins and stand.",
      "Lower the bar gently back onto both pins and reset before lifting again.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Barbell Power Clean",
    description: "A floor-to-front-rack clean received above a full squat.",
    category: "strength",
    muscleGroups: ["full body", "quadriceps", "glutes", "back", "core"],
    equipment: ["barbell"],
    instructions: [
      "Start with the bar close to your shins, a clean grip, and your trunk braced.",
      "Drive through the floor and keep the bar near your legs as you accelerate upward.",
      "Extend your legs and hips, then bring your elbows around as you move under the bar.",
      "Receive the bar with bent knees above parallel and stand to finish.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Barbell Power Jerk",
    description:
      "An overhead jerk received in a shallow squat with the feet moving to a wider stance.",
    category: "strength",
    muscleGroups: [
      "full body",
      "quadriceps",
      "glutes",
      "shoulders",
      "triceps",
      "core",
    ],
    equipment: ["barbell"],
    instructions: [
      "Hold the bar securely in the front rack and brace from a hip-width stance.",
      "Dip vertically through the knees and drive upward with the legs.",
      "Move your feet to your receiving stance and bend your knees as your arms lock overhead.",
      "Stabilize above parallel, stand fully, and lower the bar under control.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Barbell Power Snatch",
    description: "A floor-to-overhead snatch received above a full squat.",
    category: "strength",
    muscleGroups: [
      "full body",
      "quadriceps",
      "glutes",
      "shoulders",
      "back",
      "core",
    ],
    equipment: ["barbell"],
    instructions: [
      "Set a wide grip and a balanced pulling position with the bar close to your shins.",
      "Drive through the floor and extend your legs and hips while guiding the bar close to your body.",
      "Move under the bar and lock your arms overhead with your knees bent above parallel.",
      "Stand after stabilizing the overhead load, then reset under control.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Barbell Preacher Curl",
    description:
      "A barbell curl on a preacher bench that supports both upper arms during elbow flexion.",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["barbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Adjust the preacher bench so the upper arms rest fully on the pad with a shoulder-width underhand grip.",
      "Curl the bar upward while keeping the shoulders and elbows anchored in the supported position.",
      "Lower to a comfortable near-straight elbow position without bouncing at the bottom.",
    ],
  },
  {
    name: "Barbell Push Press",
    description:
      "An overhead barbell press that uses a brief leg drive before the arms finish the lift.",
    category: "strength",
    muscleGroups: ["shoulders", "triceps", "quadriceps", "glutes", "core"],
    equipment: ["barbell"],
    measurementType: "weight_reps",
    baseXP: 25,
    instructions: [
      "Hold the bar at the upper chest and stand tall with feet about hip width.",
      "Dip straight down a short distance, then extend the legs forcefully as you press the bar overhead.",
      "Finish with straight arms and a braced torso, then lower the bar to the shoulders under control.",
    ],
  },
  {
    name: "Barbell Rack Pull",
    description:
      "A partial-range deadlift beginning with a barbell supported on rack pins.",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings", "back", "forearms", "core"],
    equipment: ["barbell"],
    instructions: [
      "Set both rack pins to the same height and center the bar over your feet.",
      "Grip the bar, brace your trunk, and position your hips for the shortened pull.",
      "Drive through the floor to stand with the bar close to your body.",
      "Hinge back and lower the bar gently onto both pins before resetting.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Barbell Reverse Lunge",
    description:
      "A loaded lunge that starts by stepping backward from a standing position.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "hamstrings", "core"],
    equipment: ["barbell"],
    instructions: [
      "Place the bar across your upper back and stand with your feet hip width apart.",
      "Brace and step one foot backward while keeping the front foot grounded.",
      "Bend both knees to lower your body with your hips facing forward.",
      "Push through the front foot and bring the rear foot forward to the starting stance.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Barbell Romanian Deadlift",
    description:
      "A hip hinge that lowers a barbell from standing with only a small bend in the knees.",
    category: "strength",
    muscleGroups: ["hamstrings", "glutes", "back", "core"],
    equipment: ["barbell"],
    instructions: [
      "Stand holding the bar against your thighs with your feet around hip width.",
      "Brace, soften your knees, and push your hips backward while keeping the bar near your legs.",
      "Lower until you reach a controlled hamstring stretch without changing your trunk position.",
      "Drive your hips forward to stand and stop with your body upright.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Barbell Seal Row",
    description:
      "A prone barbell row on an elevated flat bench that removes the need to support a standing hip hinge.",
    category: "strength",
    muscleGroups: ["back", "biceps"],
    equipment: ["barbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Use a stable elevated seal-row bench that allows the bar and arms to hang freely underneath.",
      "Lie face down and pull the bar toward the underside of the bench with controlled elbow movement.",
      "Lower to straight arms while keeping the chest against the pad and avoiding neck extension.",
    ],
  },
  {
    name: "Barbell Shrug",
    description:
      "A barbell shoulder elevation that loads the upper trapezius with the arms remaining straight.",
    category: "strength",
    muscleGroups: ["back", "shoulders", "forearms"],
    equipment: ["barbell"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Stand tall holding a barbell in front of the thighs with straight arms and a secure grip.",
      "Raise the shoulders toward the ears without rolling them or bending the elbows.",
      "Lower the shoulders slowly to a relaxed starting height while keeping the head centered.",
    ],
  },
  {
    name: "Barbell Single-Leg Romanian Deadlift",
    description: "A single-leg hip hinge with a barbell held in both hands.",
    category: "strength",
    muscleGroups: ["hamstrings", "glutes", "core", "back"],
    equipment: ["barbell"],
    instructions: [
      "Stand holding the bar at your thighs and shift your balance onto one foot.",
      "Soften that knee and hinge forward as your free leg reaches backward.",
      "Keep your hips square and the bar close to the working leg through a controllable range.",
      "Extend the working hip to return to standing before placing the free foot down.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Barbell Skull Crusher",
    description:
      "A flat-bench triceps extension performed with a straight barbell and a stable upper-arm position.",
    category: "strength",
    muscleGroups: ["triceps"],
    equipment: ["barbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Lie on a bench holding a light barbell above the shoulders with hands around shoulder width.",
      "Bend the elbows slowly to bring the bar toward the forehead while keeping the shoulders stable.",
      "Straighten the elbows to lift the bar without bouncing at the bottom or bending the wrists.",
    ],
  },
  {
    name: "Barbell Snatch",
    description:
      "An Olympic lift taking a barbell from the floor to a locked overhead position in one movement.",
    category: "strength",
    muscleGroups: [
      "full body",
      "quadriceps",
      "glutes",
      "shoulders",
      "back",
      "core",
    ],
    equipment: ["barbell"],
    instructions: [
      "Take a wide snatch grip with the bar over midfoot and brace in your starting position.",
      "Push through the floor and keep the bar close as it passes your knees and reaches your hips.",
      "Extend your legs and hips, then move beneath the bar and lock your arms overhead as you descend into a squat.",
      "Stabilize the overhead position and stand before returning the bar safely.",
    ],
    measurementType: "weight_reps",
    baseXP: 30,
  },
  {
    name: "Barbell Snatch Balance",
    description:
      "A rapid drop into an overhead squat after a short dip and drive from a back-rack position.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "shoulders", "core"],
    equipment: ["barbell"],
    instructions: [
      "Support the bar across your upper back with a wide snatch grip and a stable stance.",
      "Make a shallow vertical knee dip and drive upward briefly to unload the bar.",
      "Move quickly beneath it while pressing into locked arms and landing in your squat stance.",
      "Stabilize in the overhead squat, then stand before returning the bar safely.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Barbell Snatch Pull",
    description:
      "The wide-grip explosive pull of a snatch without an overhead catch.",
    category: "strength",
    muscleGroups: ["glutes", "quadriceps", "hamstrings", "back", "core"],
    equipment: ["barbell"],
    instructions: [
      "Set a wide snatch grip and a balanced floor starting position.",
      "Push through the floor while keeping your arms long and the bar close.",
      "Extend your legs and hips fully and finish with a natural upward shrug.",
      "Lower the bar under control without bending your arms into a catch.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Barbell Split Jerk",
    description:
      "An overhead lift using leg drive and a split stance to receive the bar.",
    category: "strength",
    muscleGroups: [
      "full body",
      "quadriceps",
      "glutes",
      "shoulders",
      "triceps",
      "core",
    ],
    equipment: ["barbell"],
    instructions: [
      "Begin with the bar supported in the front rack and your feet around hip width.",
      "Dip by bending your knees with an upright trunk, then drive sharply upward.",
      "Move one foot forward and the other backward while locking your arms beneath the bar.",
      "Stabilize the split and bring your feet back beneath you in controlled steps.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Barbell Split Squat",
    description:
      "A stationary split-stance squat with a barbell carried on the upper back.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["barbell"],
    instructions: [
      "Secure the bar across your upper back and take a staggered stance with room between your feet.",
      "Brace and bend both knees to lower your rear knee toward the floor.",
      "Keep your front foot planted and your hips facing forward.",
      "Press through the front foot to rise, keeping the stance fixed until the set is complete.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Barbell Static Grip Hold",
    description:
      "A timed overhand barbell hold that develops supporting grip strength with the load held at the thighs.",
    category: "strength",
    muscleGroups: ["forearms", "back", "core"],
    equipment: ["barbell"],
    measurementType: "duration",
    baseXP: 15,
    instructions: [
      "Set a bar at a suitable rack height and take an overhand grip just outside the legs.",
      "Lift clear of the supports and stand tall with straight arms and the bar near the thighs.",
      "Time the hold without resting the bar on the legs, then return it to the supports under control.",
    ],
  },
  {
    name: "Barbell Step-Up",
    description:
      "A step onto a raised platform with a barbell carried across the upper back.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["barbell", "plyometric box"],
    instructions: [
      "Place the bar across your upper back and stand facing a stable platform.",
      "Set one entire foot on the platform and brace before rising.",
      "Drive through the elevated foot to stand on the platform with controlled balance.",
      "Step down carefully with the trailing foot and reset before repeating.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Barbell Stiff-Leg Deadlift",
    description:
      "A floor-starting hinge performed with relatively straight knees and a controlled range.",
    category: "strength",
    muscleGroups: ["hamstrings", "glutes", "back", "core"],
    equipment: ["barbell"],
    instructions: [
      "Place the bar near your feet and hinge to grip it with only a slight knee bend.",
      "Brace and set your back before lifting, using a range that lets you hold that position.",
      "Extend your hips to stand while keeping the bar close to your legs.",
      "Hinge back and lower the bar to the floor or a suitable raised starting height.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Barbell Sumo Deadlift",
    description:
      "A wide-stance deadlift with the hands gripping the bar inside the legs.",
    category: "strength",
    muscleGroups: [
      "glutes",
      "quadriceps",
      "hamstrings",
      "adductors",
      "back",
      "core",
    ],
    equipment: ["barbell"],
    instructions: [
      "Set a wide stance with toes turned out and the bar near your shins.",
      "Grip the bar inside your knees and brace with your chest and hips set.",
      "Push through your feet while extending your knees and hips, keeping the bar close.",
      "Lower by reversing the movement and reset your position on the floor.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Barbell Tall Clean",
    description:
      "A clean turnover drill beginning upright without a preceding leg drive.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "back", "shoulders", "core"],
    equipment: ["barbell"],
    instructions: [
      "Stand tall with a light bar at arm's length in a clean grip and balance over your whole feet.",
      "Initiate the movement by pulling your elbows up and moving your body downward rather than dipping first.",
      "Rotate your elbows forward and receive the bar smoothly in a front-rack squat.",
      "Stand from the squat and reset the upright start before repeating.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Barbell Tall Snatch",
    description:
      "A snatch turnover drill starting tall and moving directly beneath a light bar.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "shoulders", "back", "core"],
    equipment: ["barbell"],
    instructions: [
      "Stand upright with a light bar hanging at arm's length in your snatch grip.",
      "Without a preparatory dip, pull your elbows upward as you begin moving your body under the bar.",
      "Turn the bar overhead and lock your arms while your feet move into a squat stance.",
      "Stabilize in the receiving squat and stand before resetting.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Barbell Thruster",
    description:
      "A front squat that transitions directly into an overhead barbell press.",
    category: "strength",
    muscleGroups: [
      "full body",
      "quadriceps",
      "glutes",
      "shoulders",
      "triceps",
      "core",
    ],
    equipment: ["barbell"],
    instructions: [
      "Support the bar in a front rack and set a stable squat stance.",
      "Descend into a controlled front squat with your elbows comfortably forward.",
      "Drive through your legs to stand and continue the momentum into an overhead press.",
      "Lower the bar to your shoulders and rebrace before the next squat.",
    ],
    measurementType: "weight_reps",
    baseXP: 30,
  },
  {
    name: "Barbell Upright Row",
    description:
      "An overhand barbell row upward along the torso that trains the shoulders and upper back.",
    category: "strength",
    muscleGroups: ["shoulders", "back"],
    equipment: ["barbell"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Hold the bar in front of the thighs with a comfortable overhand grip around shoulder width.",
      "Lift the bar close to the torso, allowing the elbows to lead only within a comfortable shoulder range.",
      "Stop with the elbows no higher than the shoulders, then lower the bar smoothly.",
    ],
  },
  {
    name: "Barbell Walking Lunge",
    description:
      "A sequence of forward lunges that advances across the floor with a barbell on the upper back.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "hamstrings", "core"],
    equipment: ["barbell"],
    instructions: [
      "Set the bar across your upper back and begin in a clear, level walking lane.",
      "Step forward and bend both knees into a controlled lunge.",
      "Drive through the lead foot and bring the trailing leg forward into the next step.",
      "Continue with steady steps, keeping your torso braced and the bar level.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Barbell Zercher Carry",
    description:
      "A loaded walk with a barbell supported in the elbow creases in front of the torso.",
    category: "strength",
    muscleGroups: ["core", "back", "biceps", "glutes", "calves"],
    equipment: ["barbell"],
    instructions: [
      "Set the bar on rack supports and position it securely in the crooks of your elbows.",
      "Lift it clear while keeping it close to your torso and your hands together.",
      "Walk with short, steady steps and resist rounding or leaning back.",
      "Return to the supports or lower the bar under control before releasing it.",
    ],
    measurementType: "distance_time",
    baseXP: 20,
  },
  {
    name: "Barbell Zercher Squat",
    description:
      "A front-loaded squat with the bar supported in the crooks of the elbows.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core", "biceps"],
    equipment: ["barbell"],
    instructions: [
      "Set the bar at a height where you can securely position it in both elbow creases.",
      "Bring your hands together, hold the bar near your torso, and step into a stable squat stance.",
      "Brace and lower by bending your hips and knees while keeping the bar close.",
      "Drive through your whole feet and stand tall without leaning back.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Behind-the-Back Barbell Wrist Curl",
    description:
      "A standing wrist curl with the bar held behind the thighs to load the forearm flexors.",
    category: "strength",
    muscleGroups: ["forearms"],
    equipment: ["barbell"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Take the bar from a suitable rack height and hold it behind the thighs with palms facing backward.",
      "Keep the arms straight and curl the wrists to lift the bar a small distance.",
      "Lower the bar within a secure grip without swinging the shoulders or extending the lower back.",
    ],
  },
  {
    name: "Behind-the-Back Cable Lateral Raise",
    description:
      "A one-arm cable lateral raise whose starting cable path passes behind the hips.",
    category: "strength",
    muscleGroups: ["shoulders"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Stand sideways to a low pulley and hold the far-hand handle behind the hips.",
      "Lift the arm outward toward shoulder height without twisting the pelvis or shrugging.",
      "Lower along the same path to a comfortable behind-body position and switch sides.",
    ],
  },
  {
    name: "Behind-the-Body Cable Biceps Curl",
    description:
      "A one-arm cable curl with the working upper arm behind the torso to load the biceps in a lengthened position.",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Face away from a low pulley and step forward with its handle in a palm-up grip behind the hip.",
      "Curl the handle while keeping the upper arm slightly behind the torso and the shoulder still.",
      "Lower under control without letting the cable pull the shoulder backward, then switch arms.",
    ],
  },
  {
    name: "Belt Squat Machine",
    description:
      "A squat with resistance suspended from a hip belt rather than supported on the shoulders.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "adductors"],
    equipment: ["machine"],
    instructions: [
      "Fasten the machine's belt securely around your hips and connect it to the loading point.",
      "Stand on the platform in a stable stance and release the support mechanism.",
      "Bend your hips and knees while keeping your torso tall and the belt centered.",
      "Stand through both feet, then replace the load on its support before removing the belt.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Bent-Over Dumbbell Reverse Fly",
    description:
      "A standing hinged reverse fly that trains the rear shoulders and upper back.",
    category: "strength",
    muscleGroups: ["shoulders", "back"],
    equipment: ["dumbbell"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Hinge at the hips with softly bent knees and dumbbells hanging below the chest.",
      "Lift the arms out to the sides with a slight elbow bend while keeping the torso steady.",
      "Lower the weights slowly without swinging or letting the back round.",
    ],
  },
  {
    name: "Cable Face Pull",
    description:
      "A rope cable pull toward the face that trains the rear shoulders and upper-back musculature.",
    category: "strength",
    muscleGroups: ["shoulders", "back"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Set a rope attachment around face height and step back with the arms extended.",
      "Pull the rope toward the forehead while separating the hands and keeping elbows near shoulder height.",
      "Return slowly to extended arms without leaning backward or letting the shoulders rise.",
    ],
  },
  {
    name: "Cable Front Raise",
    description:
      "A front raise against a low cable that maintains resistance as the arm moves forward.",
    category: "strength",
    muscleGroups: ["shoulders"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Face away from a low pulley with a secure handle or bar held near the front of the thighs.",
      "Raise the hands forward to shoulder height without leaning backward or bending the elbows further.",
      "Lower smoothly to the starting position while keeping the cable clear of the legs.",
    ],
  },
  {
    name: "Cable Glute Kickback",
    description:
      "A standing hip extension against a low cable attached at the ankle.",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings", "core"],
    equipment: ["cable machine"],
    instructions: [
      "Attach an ankle cuff to a low pulley and fasten it securely around the working ankle.",
      "Face the machine and use its support lightly while keeping your trunk braced.",
      "Move the working leg backward from the hip without arching your lower back.",
      "Return the leg slowly without letting the weight stack crash.",
    ],
    measurementType: "weight_reps",
    baseXP: 15,
  },
  {
    name: "Cable Lateral Lunge",
    description:
      "A side lunge performed while holding a cable attachment at the torso.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "adductors", "core"],
    equipment: ["cable machine"],
    instructions: [
      "Set a low pulley and hold the handle close to your body from a balanced stance.",
      "Step laterally away from the stack while keeping the cable from twisting your trunk.",
      "Sit your hips over the stepping leg and bend its knee.",
      "Push through that foot to return under control, then change sides after securing the attachment.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Cable Pallof Hold",
    description:
      "A timed antirotation hold performed with the cable handle extended in front of the chest.",
    category: "strength",
    muscleGroups: ["core"],
    equipment: ["cable machine"],
    measurementType: "duration",
    baseXP: 15,
    instructions: [
      "Stand sideways to a chest-height pulley with a stable stance and the handle held against the chest.",
      "Extend both arms forward and hold without allowing the cable to rotate the torso.",
      "Time the steady position, return the handle to the chest, and repeat with the opposite side toward the pulley.",
    ],
  },
  {
    name: "Cable Pallof Press",
    description:
      "An antirotation cable press that trains the trunk to remain facing forward as the hands move away from the chest.",
    category: "strength",
    muscleGroups: ["core"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Stand sideways to a chest-height pulley and hold the handle in both hands against the sternum.",
      "Press the hands straight forward while keeping the shoulders and pelvis facing ahead.",
      "Bring the handle back to the chest without turning toward the stack and repeat on both sides.",
    ],
  },
  {
    name: "Cable Preacher Curl",
    description:
      "A preacher-supported curl using a low cable to maintain tension through elbow flexion.",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["cable machine", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Position a preacher bench facing a low pulley and rest the upper arms fully on the pad.",
      "Curl the cable handle upward without lifting the shoulders from the supported position.",
      "Lower slowly to comfortable elbow extension while keeping the cable clear of the bench.",
    ],
  },
  {
    name: "Cable Pull-Through",
    description:
      "A hip hinge pulling a low cable attachment forward between the legs.",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings", "core"],
    equipment: ["cable machine"],
    instructions: [
      "Attach a rope to a low pulley and stand facing away with the rope between your legs.",
      "Walk forward enough to maintain cable tension and set a stable stance.",
      "Hinge your hips backward with soft knees, letting your hands move between your thighs.",
      "Extend your hips to stand while keeping your arms relaxed and your trunk braced.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Cable Reverse Fly",
    description:
      "A crossed-cable reverse fly that loads the rear shoulders as the arms open outward.",
    category: "strength",
    muscleGroups: ["shoulders", "back"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Set the pulleys around shoulder height and hold the opposite handles so the cables cross in front.",
      "Open the arms outward with a soft elbow bend and the torso upright.",
      "Bring the hands back toward the front under control without letting the shoulders roll excessively forward.",
    ],
  },
  {
    name: "Cable Reverse Lunge",
    description:
      "A reverse lunge against the forward pull of a cable held near the chest.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["cable machine"],
    instructions: [
      "Hold a low pulley handle close to your chest and step back to create tension.",
      "Brace with feet hip width apart.",
      "Step one foot backward and lower into a lunge without being pulled toward the stack.",
      "Drive through the lead foot to return to the start with the cable still controlled.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Cable Shrug",
    description:
      "A low-cable shrug that trains shoulder elevation against the pulley resistance.",
    category: "strength",
    muscleGroups: ["back", "shoulders", "forearms"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Face a low pulley and hold a bar attachment at arm length near the thighs.",
      "Raise the shoulders straight upward while keeping the elbows extended and torso still.",
      "Lower to the starting shoulder position without letting the stack slam or the neck jut forward.",
    ],
  },
  {
    name: "Cable Squat",
    description:
      "A squat while holding a low cable attachment close to the torso.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["cable machine"],
    instructions: [
      "Attach a handle to a low pulley and hold it with both hands near your chest.",
      "Step back enough to keep cable tension and set your feet in a squat stance.",
      "Bend your hips and knees without letting the cable pull your trunk forward.",
      "Stand by pressing through your feet while keeping the handle close.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Cable Triceps Kickback",
    description:
      "A one-arm kickback using a low cable to maintain tension during elbow extension.",
    category: "strength",
    muscleGroups: ["triceps"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Face a low pulley, hinge forward, and hold the working upper arm close to the side with the elbow bent.",
      "Extend the elbow backward while keeping the shoulder and torso still.",
      "Return slowly to the bent-elbow position without letting the cable pull the upper arm forward.",
    ],
  },
  {
    name: "Cable Upright Row",
    description:
      "A low-cable upright row that lifts the elbows outward against continuous cable tension.",
    category: "strength",
    muscleGroups: ["shoulders", "back"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Face a low pulley and hold a straight bar or rope in front of the thighs.",
      "Pull upward with the elbows leading while keeping the hands close to the torso.",
      "Keep the elbows at or below shoulder height and lower under control without leaning back.",
    ],
  },
  {
    name: "Cable Wrist Curl",
    description:
      "A low-cable palm-up wrist curl that maintains resistance while training the forearm flexors.",
    category: "strength",
    muscleGroups: ["forearms"],
    equipment: ["cable machine", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Sit facing a low pulley with forearms supported and grasp a bar attachment palms up.",
      "Keep the elbows still and curl the wrists upward against the cable tension.",
      "Lower through a small comfortable wrist range without allowing the handle to pull the forearms off the support.",
    ],
  },
  {
    name: "Cable Y-Raise",
    description:
      "A low-cable shoulder raise that moves the arms upward and outward into a Y-shaped position.",
    category: "strength",
    muscleGroups: ["shoulders", "back"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Face low pulleys and hold the handles with light tension and thumbs pointing upward.",
      "Lift the arms forward and outward into a comfortable Y shape while keeping the ribs down.",
      "Return smoothly without shrugging or leaning backward to move the resistance.",
    ],
  },
  {
    name: "Chest-Supported Dumbbell Reverse Fly",
    description:
      "A rear-shoulder fly using incline-bench support to keep the torso stable.",
    category: "strength",
    muscleGroups: ["shoulders", "back"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Lie chest down on an incline bench with light dumbbells hanging beneath the shoulders.",
      "Raise the arms outward in a wide arc while keeping the chest on the bench.",
      "Lower slowly and stop the upward movement before the shoulders shrug toward the ears.",
    ],
  },
  {
    name: "Chest-Supported Dumbbell Row",
    description:
      "An incline-bench dumbbell row that supports the torso while both arms pull toward the hips.",
    category: "strength",
    muscleGroups: ["back", "biceps"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Lie face down on an incline bench with the chest supported and dumbbells hanging freely.",
      "Pull the weights toward the hips with the elbows close to the body.",
      "Lower slowly to an arm-length stretch without lifting the chest away from the pad.",
    ],
  },
  {
    name: "Chest-Supported Elbows-Out Dumbbell Row",
    description:
      "A supported dumbbell row with wider elbows that emphasizes the upper back and rear shoulders.",
    category: "strength",
    muscleGroups: ["back", "shoulders", "biceps"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Lie chest down on an incline bench and let the dumbbells hang with palms facing backward.",
      "Row toward the upper ribs with elbows angled outward instead of close to the hips.",
      "Lower the weights slowly while keeping the chest supported and the shoulders away from the ears.",
    ],
  },
  {
    name: "Chest-Supported Machine Row",
    description:
      "A horizontal machine row using a chest pad to support the torso throughout the back pull.",
    category: "strength",
    muscleGroups: ["back", "biceps"],
    equipment: ["machine"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Adjust the chest pad so the handles sit around lower-chest height at full arm reach.",
      "Keep the chest on the pad as you pull the handles toward the ribs.",
      "Lower smoothly to a comfortable stretch without driving the head forward.",
    ],
  },
  {
    name: "Chest-Supported T-Bar Row",
    description:
      "A supported T-bar machine row that loads the back while the chest pad limits torso movement.",
    category: "strength",
    muscleGroups: ["back", "biceps"],
    equipment: ["machine"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Adjust the chest pad and foot platform so the arms can reach the handles without rounding the shoulders.",
      "Pull the handles toward the torso while keeping the chest in contact with the pad.",
      "Lower to a controlled stretch without dropping the weight or extending the neck.",
    ],
  },
  {
    name: "Close-Grip Barbell Bench Press",
    description:
      "A narrow-grip bench press that increases the triceps contribution while retaining substantial chest loading.",
    category: "strength",
    muscleGroups: ["triceps", "chest", "shoulders"],
    equipment: ["barbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Lie on a flat bench and grip the bar around shoulder width with wrists above the forearms.",
      "Lower the bar toward the lower chest, keeping the elbows closer to the torso than in a standard press.",
      "Press to straight arms without flaring the elbows abruptly or lifting the shoulders off the bench.",
    ],
  },
  {
    name: "Cross-Body Cable Triceps Extension",
    description:
      "A one-arm cable extension that moves the forearm diagonally across the torso against a high pulley.",
    category: "strength",
    muscleGroups: ["triceps"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Stand beside a high pulley and hold its handle with the far hand near the opposite shoulder.",
      "Keep the upper arm stable while extending the elbow diagonally toward the working-side hip.",
      "Bend the elbow slowly along the same path without turning the trunk, then switch sides.",
    ],
  },
  {
    name: "Cross-Body Dumbbell Hammer Curl",
    description:
      "A neutral-grip curl that brings one dumbbell diagonally across the torso toward the opposite shoulder.",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["dumbbell"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Stand with the dumbbells beside the hips and palms facing inward.",
      "Curl one dumbbell across the front of the body toward the opposite chest while keeping the wrist neutral.",
      "Lower to the same-side hip and alternate arms without turning the torso.",
    ],
  },
  {
    name: "Decline Barbell Bench Press",
    description:
      "A barbell press on a declined bench that changes the pressing angle toward the lower chest.",
    category: "strength",
    muscleGroups: ["chest", "triceps", "shoulders"],
    equipment: ["barbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Secure the legs in a decline bench and position the eyes beneath the racked bar.",
      "Unrack with control and lower the bar toward the lower chest without bouncing.",
      "Press back above the chest while maintaining the same supported shoulder position.",
    ],
  },
  {
    name: "Decline Dumbbell Bench Press",
    description:
      "A dumbbell chest press using a declined bench to emphasize a lower pressing angle.",
    category: "strength",
    muscleGroups: ["chest", "triceps", "shoulders"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Secure the legs in the decline bench and receive or position the dumbbells safely beside the chest.",
      "Lower both weights evenly with the forearms nearly vertical at the bottom.",
      "Press upward under control and arrange assistance for removing the dumbbells after the set.",
    ],
  },
  {
    name: "Decline Dumbbell Chest Fly",
    description:
      "A decline-bench fly that trains chest adduction along a lower torso angle.",
    category: "strength",
    muscleGroups: ["chest", "shoulders"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Secure the legs on a decline bench and begin with dumbbells above the lower chest.",
      "Open the arms slowly, retaining a small elbow bend and stopping before shoulder discomfort.",
      "Sweep the weights together above the chest while keeping the hips and shoulders supported.",
    ],
  },
  {
    name: "Decline EZ-Bar Triceps Extension",
    description:
      "A lying elbow extension on a decline bench that changes the triceps loading angle while supporting the torso.",
    category: "strength",
    muscleGroups: ["triceps"],
    equipment: ["ez bar", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Secure the legs on a decline bench and hold a light EZ bar above the shoulders with an angled narrow grip.",
      "Bend the elbows to lower the bar toward the forehead while keeping the upper arms steady.",
      "Extend the elbows to raise the bar under control and use assistance to remove the bar after the set.",
    ],
  },
  {
    name: "Decline Weighted Sit-Up",
    description:
      "A weighted sit-up on a declined bench that increases the challenge of raising the torso against gravity.",
    category: "strength",
    muscleGroups: ["core", "hip flexors"],
    equipment: ["weight plate", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Secure the legs in a decline bench and hold a plate at the chest, recording its added load.",
      "Curl the torso upward to a controlled seated position without swinging the plate or pulling on the leg supports.",
      "Lower along the bench slowly and stop within a range that keeps the back movement controlled.",
    ],
  },
  {
    name: "Deficit Barbell Deadlift",
    description:
      "A deadlift from a low raised stance that increases the distance the bar travels from the floor.",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings", "quadriceps", "back", "core"],
    equipment: ["barbell", "weight plate"],
    instructions: [
      "Stand on a secure low platform with the bar close to your shins.",
      "Grip the bar and set your hips and trunk without rounding to reach it.",
      "Push through both feet to lift, extending your knees and hips together.",
      "Return the bar to the floor under control and re-establish your starting position.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Deficit Dumbbell Reverse Lunge",
    description:
      "A reverse lunge beginning on a low platform so the rear foot can descend below the lead foot.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["dumbbell", "step"],
    instructions: [
      "Stand on a stable low step while holding dumbbells at your sides.",
      "Step one foot backward off the step while the lead foot remains fully supported.",
      "Bend both knees and lower only as far as you can maintain control.",
      "Press through the lead foot to return the rear foot onto the step.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Donkey Calf Raise Machine",
    description:
      "A calf raise in a forward-leaning supported position with machine resistance over the hips.",
    category: "strength",
    muscleGroups: ["calves"],
    equipment: ["machine"],
    instructions: [
      "Adjust the machine's hip pad and place your forefeet on its foot ledge.",
      "Lean into the torso support and keep your legs comfortably straight.",
      "Lower your heels under control, then raise them by extending your ankles.",
      "Keep your hips stable and return slowly without bouncing.",
    ],
    measurementType: "weight_reps",
    baseXP: 15,
  },
  {
    name: "Double Kettlebell Clean",
    description:
      "A simultaneous clean of two kettlebells into a paired front rack.",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings", "back", "shoulders", "core"],
    equipment: ["kettlebell"],
    instructions: [
      "Set two kettlebells in front of you and grip them from a stable hinge.",
      "Hike both bells between your legs, then extend your hips to bring them upward.",
      "Keep the bells close and guide your hands through the handles into a secure double rack.",
      "Lower both bells under control into the next backswing or return them to the floor.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Double Kettlebell Clean and Jerk",
    description:
      "A paired kettlebell clean and overhead jerk using a coordinated leg drive.",
    category: "strength",
    muscleGroups: [
      "full body",
      "glutes",
      "quadriceps",
      "shoulders",
      "triceps",
      "core",
    ],
    equipment: ["kettlebell"],
    instructions: [
      "Clean both kettlebells into a secure double front rack.",
      "Brace, dip through the knees, and drive upward through your legs.",
      "Move beneath the bells by rebending your knees as both elbows lock overhead.",
      "Stand in balance, lower to the rack, and return both bells under control.",
    ],
    measurementType: "weight_reps",
    baseXP: 30,
  },
  {
    name: "Double Kettlebell Front Squat",
    description:
      "A squat with two kettlebells held in the front rack against the forearms and torso.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core", "shoulders"],
    equipment: ["kettlebell"],
    instructions: [
      "Bring both kettlebells into a secure rack with the bells resting against your forearms.",
      "Set your stance, keep your elbows close, and brace your trunk.",
      "Squat down between your hips without letting the bells pull you forward.",
      "Stand through both feet and maintain the rack position.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Double Kettlebell Front-Rack Carry",
    description:
      "A loaded walk with two kettlebells supported in the front rack.",
    category: "strength",
    muscleGroups: ["core", "back", "shoulders", "glutes", "calves"],
    equipment: ["kettlebell"],
    instructions: [
      "Bring both kettlebells into a secure rack close to your torso.",
      "Keep your elbows comfortably near your body and brace your abdomen.",
      "Walk with steady steps without letting the bells pull your upper body backward or forward.",
      "Stop in a stable stance and lower the bells safely.",
    ],
    measurementType: "distance_time",
    baseXP: 20,
  },
  {
    name: "Double Kettlebell Strict Press",
    description:
      "A simultaneous kettlebell overhead press from two rack positions that loads both shoulders and triceps.",
    category: "strength",
    muscleGroups: ["shoulders", "triceps", "core"],
    equipment: ["kettlebell"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Stand with both kettlebells racked, forearms nearly vertical, and elbows near the ribs.",
      "Press both bells overhead without dipping the knees or allowing the ribs to flare.",
      "Return the bells smoothly to the rack with the wrists straight and the torso upright.",
    ],
  },
  {
    name: "Double Kettlebell Swing",
    description: "A hip-driven swing using two kettlebells between the legs.",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings", "core", "back", "forearms"],
    equipment: ["kettlebell"],
    instructions: [
      "Place two kettlebells in front of you and take a stance that allows both to pass between your legs.",
      "Hinge, grip both handles, and hike the bells back with your trunk braced.",
      "Extend your hips to project both bells forward evenly without pulling them up with your shoulders.",
      "Rehinge as they return and park both bells with control.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Double Kettlebell Thruster",
    description:
      "A front squat that flows directly into an overhead press with two kettlebells.",
    category: "strength",
    muscleGroups: [
      "full body",
      "quadriceps",
      "glutes",
      "shoulders",
      "triceps",
      "core",
    ],
    equipment: ["kettlebell"],
    instructions: [
      "Rack both kettlebells securely against your forearms and torso.",
      "Squat to a controlled depth while keeping the bells close.",
      "Stand forcefully and use that upward momentum to press both bells overhead.",
      "Lower the bells to the rack before beginning the next squat.",
    ],
    measurementType: "weight_reps",
    baseXP: 30,
  },
  {
    name: "Dumbbell B-Stance Romanian Deadlift",
    description:
      "A supported unilateral hinge with most weight on the front foot and the rear toes used for balance.",
    category: "strength",
    muscleGroups: ["hamstrings", "glutes", "core"],
    equipment: ["dumbbell"],
    instructions: [
      "Hold dumbbells in front of your thighs and stagger one foot slightly behind the other.",
      "Place most of your weight through the front foot and keep the rear toes lightly grounded.",
      "Hinge your hips back with a soft front knee while lowering the dumbbells near the front leg.",
      "Extend the front hip to stand and avoid pushing strongly through the rear foot.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Dumbbell Bench Press",
    description:
      "A flat-bench press using independent dumbbells so each arm controls its own pressing path.",
    category: "strength",
    muscleGroups: ["chest", "shoulders", "triceps"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Lie back on a flat bench with a dumbbell above each side of the chest and feet planted.",
      "Lower the weights with elbows angled slightly inward until the chest is comfortably stretched.",
      "Press the dumbbells upward without colliding them or allowing one arm to lag.",
    ],
  },
  {
    name: "Dumbbell Bent-Over Row",
    description:
      "A two-dumbbell row from a standing hip hinge with independent arm paths.",
    category: "strength",
    muscleGroups: ["back", "biceps", "core"],
    equipment: ["dumbbell"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Hinge at the hips with knees softly bent and dumbbells hanging beneath the shoulders.",
      "Pull both weights toward the hips while maintaining a steady torso angle.",
      "Extend the arms slowly without swinging the weights or rounding the spine.",
    ],
  },
  {
    name: "Dumbbell Biceps Curl",
    description:
      "A simultaneous dumbbell curl with palms facing upward to load each biceps independently.",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["dumbbell"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Stand with a dumbbell in each hand, palms facing forward, and upper arms beside the torso.",
      "Curl both weights toward the shoulders without lifting the elbows forward.",
      "Lower the dumbbells evenly while maintaining the upward-facing palms and steady torso.",
    ],
  },
  {
    name: "Dumbbell Bulgarian Split Squat",
    description:
      "A rear-foot-elevated split squat with dumbbells hanging at the sides.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["dumbbell", "bench"],
    instructions: [
      "Hold dumbbells at your sides and place the top of your rear foot on a stable bench.",
      "Adjust the front foot so you can descend with the heel grounded.",
      "Bend the front hip and knee, allowing the rear knee to move down.",
      "Drive through the front foot to stand without using the rear leg to bounce.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Dumbbell Chest Fly",
    description:
      "A flat-bench fly that loads the chest through a controlled sweeping arc with a fixed elbow bend.",
    category: "strength",
    muscleGroups: ["chest", "shoulders"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Lie on a flat bench and hold the dumbbells above the chest with a slight bend in both elbows.",
      "Open the arms to the sides until the chest stretches comfortably without forcing the shoulders downward.",
      "Bring the weights together above the chest using the same elbow angle throughout the arc.",
    ],
  },
  {
    name: "Dumbbell Clean and Jerk",
    description:
      "A paired dumbbell lift from the floor to the shoulders followed by a leg-driven overhead jerk.",
    category: "strength",
    muscleGroups: [
      "full body",
      "glutes",
      "quadriceps",
      "shoulders",
      "triceps",
      "core",
    ],
    equipment: ["dumbbell"],
    instructions: [
      "Grip the dumbbells beside your feet from a stable, braced starting position.",
      "Drive through your legs and hips to bring the dumbbells to your shoulders.",
      "Dip and drive again, then rebend your knees as both arms lock overhead.",
      "Stand balanced and lower the dumbbells to the shoulders and floor under control.",
    ],
    measurementType: "weight_reps",
    baseXP: 30,
  },
  {
    name: "Dumbbell Concentration Curl",
    description:
      "A seated single-arm curl that braces the upper arm against the thigh for controlled biceps isolation.",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Sit with the legs apart and brace the working upper arm against the inside of the same-side thigh.",
      "Curl the dumbbell toward the shoulder without moving the braced upper arm or bending the wrist.",
      "Lower slowly to comfortable elbow extension and complete the set before switching arms.",
    ],
  },
  {
    name: "Dumbbell Crossover Step-Up",
    description:
      "A step-up in which the working leg crosses in front of the body onto the platform.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "abductors", "core"],
    equipment: ["dumbbell", "plyometric box"],
    instructions: [
      "Stand beside a low, stable platform with dumbbells at your sides.",
      "Cross the outside foot in front of you and place it fully on the platform.",
      "Push through the elevated foot to rise without twisting the planted knee.",
      "Reverse the crossing step carefully and regain a balanced start.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Dumbbell Curtsy Lunge",
    description: "A diagonal reverse lunge with dumbbells held at the sides.",
    category: "strength",
    muscleGroups: ["glutes", "quadriceps", "abductors", "core"],
    equipment: ["dumbbell"],
    instructions: [
      "Stand with dumbbells beside your hips and keep your pelvis facing forward.",
      "Step one foot diagonally behind the other without making the cross excessively narrow.",
      "Bend both knees, keeping the front knee following the front foot's direction.",
      "Press through the front foot to return upright before changing sides.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Dumbbell Deadlift",
    description:
      "A floor-oriented deadlift with a dumbbell held outside each leg.",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings", "quadriceps", "back", "core"],
    equipment: ["dumbbell"],
    instructions: [
      "Place the dumbbells beside your feet or on secure supports suited to your reach.",
      "Bend your hips and knees to grip them while bracing your trunk.",
      "Push through your feet to stand with the weights close to your sides.",
      "Lower them by bending your hips and knees under control.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Dumbbell Devil Press",
    description:
      "A dumbbell burpee followed by a two-weight swing into an overhead lockout.",
    category: "strength",
    muscleGroups: [
      "full body",
      "glutes",
      "hamstrings",
      "chest",
      "shoulders",
      "core",
    ],
    equipment: ["dumbbell"],
    instructions: [
      "Set two stable dumbbells on the floor, grip them, and move your feet back into a plank.",
      "Lower your chest between the dumbbells, then return your feet to a strong standing hinge position.",
      "Lift the dumbbells, swing them between your legs, and drive through your hips to guide them overhead.",
      "Stabilize with straight arms, lower the weights under control, and return them to the floor.",
    ],
    measurementType: "weight_reps",
    baseXP: 30,
  },
  {
    name: "Dumbbell Farmer Carry",
    description:
      "A loaded walk with a dumbbell held in each hand beside the body.",
    category: "strength",
    muscleGroups: ["forearms", "core", "back", "glutes", "calves"],
    equipment: ["dumbbell"],
    instructions: [
      "Lift both dumbbells with a braced hinge and stand tall.",
      "Set your shoulders comfortably and keep the weights beside your legs.",
      "Walk along a clear path with short, steady steps and a level torso.",
      "Stop in balance and lower the dumbbells with your hips and knees bent.",
    ],
    measurementType: "distance_time",
    baseXP: 20,
  },
  {
    name: "Dumbbell Farmer Hold",
    description:
      "A stationary upright hold with a dumbbell in each hand at the sides.",
    category: "strength",
    muscleGroups: ["forearms", "core", "back"],
    equipment: ["dumbbell"],
    instructions: [
      "Lift both dumbbells with a braced hinge and stand upright.",
      "Keep your arms straight, shoulders level, and the weights clear of your thighs.",
      "Maintain a stable standing position without shrugging, swaying, or holding your breath.",
      "Finish by lowering both dumbbells under control.",
    ],
    measurementType: "duration",
    baseXP: 20,
  },
  {
    name: "Dumbbell Floor Press",
    description:
      "A floor-based dumbbell press whose limited bottom range places substantial demand on the triceps.",
    category: "strength",
    muscleGroups: ["chest", "triceps", "shoulders"],
    equipment: ["dumbbell"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Lie on the floor with knees bent and dumbbells held above the chest.",
      "Lower the weights until the backs of the upper arms lightly touch the floor.",
      "Keep the forearms upright and press the weights back above the chest without bouncing the elbows.",
    ],
  },
  {
    name: "Dumbbell Forearm Pronation and Supination",
    description:
      "A light dumbbell rotation exercise that trains controlled turning of the forearm with the elbow supported.",
    category: "strength",
    muscleGroups: ["forearms"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Support the forearm with the elbow bent and hold a very light dumbbell securely near one end of its handle.",
      "Keep the wrist straight while rotating the forearm slowly to turn the palm upward and downward.",
      "Use a short comfortable rotation arc, keep the elbow still, and repeat on the opposite forearm.",
    ],
  },
  {
    name: "Dumbbell Forward Lunge",
    description: "A forward lunge with a dumbbell held in each hand.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["dumbbell"],
    instructions: [
      "Stand upright with dumbbells at your sides and your feet hip width apart.",
      "Take a forward step and land with the whole lead foot grounded.",
      "Lower by bending both knees while keeping the weights beside your hips.",
      "Push off the lead foot to return to the initial stance.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Dumbbell Front Raise",
    description:
      "A front shoulder raise that lifts dumbbells forward with minimal elbow movement.",
    category: "strength",
    muscleGroups: ["shoulders"],
    equipment: ["dumbbell"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Stand with dumbbells in front of the thighs and a slight elbow bend.",
      "Raise both arms forward toward shoulder height without leaning backward or swinging the weights.",
      "Lower the dumbbells smoothly while keeping the abdomen braced and the wrists straight.",
    ],
  },
  {
    name: "Dumbbell Front Squat",
    description:
      "A squat performed with two dumbbells supported near the front of the shoulders.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core", "shoulders"],
    equipment: ["dumbbell"],
    instructions: [
      "Bring a dumbbell to each shoulder and keep your elbows comfortably forward.",
      "Set a stable stance and brace before bending your hips and knees.",
      "Descend with the dumbbells close to your shoulders and your heels grounded.",
      "Stand by pressing through the floor while maintaining the shoulder position.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Dumbbell Goblet Box Squat",
    description: "A goblet squat that uses a box as a consistent depth target.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["dumbbell", "plyometric box"],
    instructions: [
      "Stand in front of a stable box with a dumbbell held close to your chest.",
      "Brace and bend your hips and knees to sit toward the box.",
      "Touch the box gently without collapsing your trunk or rocking back.",
      "Press through your feet to stand while keeping the dumbbell against your torso.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Dumbbell Goblet Squat",
    description:
      "A squat with one dumbbell held vertically against the chest for front-loaded resistance.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["dumbbell"],
    instructions: [
      "Hold the upper end of a dumbbell at chest height with both hands.",
      "Set your feet slightly wider than hip width and brace your trunk.",
      "Lower between your hips, keeping the dumbbell close and your knees aligned with your toes.",
      "Push through your whole feet to return to standing.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Dumbbell Hammer Curl",
    description:
      "A neutral-grip dumbbell curl that trains the elbow flexors with emphasis on the brachialis and forearms.",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["dumbbell"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Hold the dumbbells at the sides with palms facing inward and wrists straight.",
      "Curl both weights upward without rotating the palms or moving the upper arms forward.",
      "Lower slowly to extended elbows while maintaining the same neutral grip.",
    ],
  },
  {
    name: "Dumbbell Lateral Lunge",
    description:
      "A side lunge carrying dumbbells that lower beside the working leg.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "adductors", "core"],
    equipment: ["dumbbell"],
    instructions: [
      "Start upright with dumbbells hanging at your sides.",
      "Step out laterally and sit your hips back over the stepping foot.",
      "Bend that knee while keeping the opposite leg relatively straight and the trunk controlled.",
      "Push through the stepping foot to return to the start.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Dumbbell Lateral Raise",
    description:
      "A standing dumbbell raise that lifts the upper arms outward to train the lateral shoulders.",
    category: "strength",
    muscleGroups: ["shoulders"],
    equipment: ["dumbbell"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Stand tall with the dumbbells beside the thighs and a slight bend in both elbows.",
      "Lift the arms out to the sides toward shoulder height without swinging the hips.",
      "Lower slowly while keeping the shoulders relaxed and the same gentle elbow bend.",
    ],
  },
  {
    name: "Dumbbell Lateral Step-Up",
    description:
      "A sideways step onto a platform with dumbbells held at the sides.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "abductors", "core"],
    equipment: ["dumbbell", "plyometric box"],
    instructions: [
      "Stand beside a stable platform with a dumbbell in each hand.",
      "Place the nearest foot fully on the platform and keep your hips level.",
      "Drive through the elevated leg to lift your body onto the platform.",
      "Lower the outside foot to the floor slowly and repeat before switching sides.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Dumbbell Overhead Walking Lunge",
    description:
      "A traveling lunge with one dumbbell held overhead for an offset stability challenge.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "shoulders", "core"],
    equipment: ["dumbbell"],
    instructions: [
      "Secure one dumbbell overhead with a straight arm before starting to walk.",
      "Brace and step forward into a controlled lunge with the lead heel grounded.",
      "Push through the lead leg and advance into the next lunge while keeping the weight above your shoulder.",
      "Finish in a balanced stance and lower the dumbbell safely before switching arms.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Dumbbell Push Press",
    description:
      "A leg-assisted overhead press using independent dumbbells to train coordinated shoulder and lower-body drive.",
    category: "strength",
    muscleGroups: ["shoulders", "triceps", "quadriceps", "glutes", "core"],
    equipment: ["dumbbell"],
    measurementType: "weight_reps",
    baseXP: 25,
    instructions: [
      "Stand with dumbbells beside the shoulders and elbows beneath the wrists.",
      "Make a shallow knee dip, then extend the legs and press both dumbbells overhead.",
      "Stabilize the weights above the shoulders before returning them smoothly to the starting position.",
    ],
  },
  {
    name: "Dumbbell Renegade Row",
    description:
      "A dumbbell row from a high plank that combines back pulling with antirotation trunk control.",
    category: "strength",
    muscleGroups: ["back", "biceps", "core", "shoulders"],
    equipment: ["dumbbell"],
    measurementType: "weight_reps",
    baseXP: 25,
    instructions: [
      "Use stable flat-sided dumbbells and take a high plank with the feet wider than hip width.",
      "Row one dumbbell toward the ribs while pressing through the other hand and keeping the hips level.",
      "Place the weight down softly and alternate sides without shifting the torso excessively.",
    ],
  },
  {
    name: "Dumbbell Reverse Lunge",
    description:
      "A backward-stepping lunge with dumbbells carried at the sides.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "hamstrings", "core"],
    equipment: ["dumbbell"],
    instructions: [
      "Hold dumbbells beside your body and stand in a stable hip-width stance.",
      "Step one foot backward and keep the lead foot firmly planted.",
      "Bend both knees to lower your rear knee toward the floor.",
      "Drive through the lead foot and return the rear foot to standing.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Dumbbell Romanian Deadlift",
    description:
      "A standing hip hinge that lowers two dumbbells along the fronts of the legs.",
    category: "strength",
    muscleGroups: ["hamstrings", "glutes", "back", "core"],
    equipment: ["dumbbell"],
    instructions: [
      "Hold dumbbells in front of your thighs with your knees softly bent.",
      "Brace and push your hips backward, keeping the weights near your legs.",
      "Lower until you reach a controlled stretch without rounding your trunk.",
      "Drive your hips forward to stand tall and keep the weights from swinging.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Dumbbell Seal Row",
    description:
      "A prone dumbbell row from an elevated flat bench that allows a horizontal, fully supported torso.",
    category: "strength",
    muscleGroups: ["back", "biceps"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Lie face down on a stable elevated bench with room for the dumbbells to hang beneath you.",
      "Row the dumbbells toward the lower ribs while keeping the chest and abdomen on the bench.",
      "Lower the weights completely under control without reaching the head forward.",
    ],
  },
  {
    name: "Dumbbell Seated Calf Raise",
    description:
      "A seated calf raise with dumbbell resistance supported above the knees.",
    category: "strength",
    muscleGroups: ["calves"],
    equipment: ["dumbbell", "bench", "step"],
    instructions: [
      "Sit on a bench with your forefeet on a stable low step.",
      "Place the dumbbells securely on your lower thighs and hold them in position.",
      "Lift your heels by pressing through the balls of your feet while your knees remain bent.",
      "Lower your heels slowly through a comfortable ankle range.",
    ],
    measurementType: "weight_reps",
    baseXP: 15,
  },
  {
    name: "Dumbbell Shrug",
    description:
      "A dumbbell shrug that lets the shoulders elevate independently while the weights hang at the sides.",
    category: "strength",
    muscleGroups: ["back", "shoulders", "forearms"],
    equipment: ["dumbbell"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Stand upright with dumbbells at the sides and arms straight.",
      "Lift the shoulders vertically toward the ears without leaning forward or rotating them.",
      "Lower smoothly and keep the neck neutral rather than projecting the chin forward.",
    ],
  },
  {
    name: "Dumbbell Side Bend",
    description:
      "A controlled lateral trunk movement using one dumbbell to load the side of the abdomen.",
    category: "strength",
    muscleGroups: ["core"],
    equipment: ["dumbbell"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Stand tall holding one dumbbell beside the thigh with the free hand relaxed.",
      "Bend gently toward the weighted side within a comfortable range without rotating or leaning forward.",
      "Return to upright using the trunk, then repeat the same controlled range on the opposite side.",
    ],
  },
  {
    name: "Dumbbell Single-Leg Box Squat",
    description: "A loaded single-leg squat that uses a box as a depth target.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["dumbbell", "plyometric box"],
    instructions: [
      "Hold a dumbbell at chest height and stand in front of a stable box.",
      "Lift one foot and balance over the whole standing foot.",
      "Sit back onto the box with control while keeping the free foot clear.",
      "Press through the working foot to stand without rocking off the box.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Dumbbell Single-Leg Calf Raise",
    description:
      "A calf raise on one leg with a dumbbell providing added resistance.",
    category: "strength",
    muscleGroups: ["calves", "core"],
    equipment: ["dumbbell", "step"],
    instructions: [
      "Hold a dumbbell in one hand and use the other hand lightly on a stable support.",
      "Place the working forefoot on a step and lift the other foot clear.",
      "Lower the working heel, then press through the forefoot to rise.",
      "Keep the working knee steady and lower slowly before repeating.",
    ],
    measurementType: "weight_reps",
    baseXP: 15,
  },
  {
    name: "Dumbbell Single-Leg Hip Thrust",
    description:
      "A one-leg hip thrust with the upper back on a bench and a dumbbell over the working hip.",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings", "core"],
    equipment: ["dumbbell", "bench"],
    instructions: [
      "Set your upper back against a stable bench and secure a dumbbell across the working hip.",
      "Plant the working foot and lift the other foot clear of the floor.",
      "Drive through the planted heel and midfoot to raise your hips, keeping your pelvis level.",
      "Lower slowly and repeat without letting the free leg provide assistance.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Dumbbell Single-Leg Romanian Deadlift",
    description:
      "A single-leg hip hinge holding a dumbbell while the free leg reaches behind.",
    category: "strength",
    muscleGroups: ["hamstrings", "glutes", "core", "abductors"],
    equipment: ["dumbbell"],
    instructions: [
      "Hold a dumbbell in the hand opposite the working leg and balance over that foot.",
      "Soften the standing knee and hinge at the hip as the free leg extends behind you.",
      "Keep your pelvis facing the floor and lower the weight close to the standing leg.",
      "Press through the standing foot to return upright without rotating your hips.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Dumbbell Snatch",
    description:
      "A one-arm floor-to-overhead lift driven by the legs and hips.",
    category: "strength",
    muscleGroups: [
      "full body",
      "glutes",
      "quadriceps",
      "hamstrings",
      "shoulders",
      "core",
    ],
    equipment: ["dumbbell"],
    instructions: [
      "Place a dumbbell between your feet and grip it from a braced hinge with bent knees.",
      "Push through the floor and extend your hips to accelerate the dumbbell close to your body.",
      "Move beneath the weight as needed and finish with a straight arm above your shoulder.",
      "Stabilize, then lower the dumbbell under control before repeating or switching arms.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Dumbbell Spider Curl",
    description:
      "A prone incline-bench curl with the arms hanging forward to isolate elbow flexion.",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Lie chest down on an incline bench and let the dumbbells hang beneath the shoulders with palms forward.",
      "Curl the weights toward the shoulders while keeping the upper arms vertical and chest supported.",
      "Lower to straight arms without swinging the dumbbells or lifting the torso.",
    ],
  },
  {
    name: "Dumbbell Split Squat",
    description:
      "A stationary split squat with dumbbells held beside the body.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["dumbbell"],
    instructions: [
      "Hold a dumbbell in each hand and set a staggered stance with the rear heel raised.",
      "Keep your hips facing forward and brace your torso.",
      "Bend both knees to lower while your front heel stays grounded.",
      "Press through the front foot to rise, keeping your arms quiet at your sides.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Dumbbell Squeeze Press",
    description:
      "A chest press that maintains inward pressure between two dumbbells throughout the repetition.",
    category: "strength",
    muscleGroups: ["chest", "triceps", "shoulders"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Lie on a flat bench with the dumbbells touching above the chest and palms facing inward.",
      "Squeeze the weights together as you lower them toward the center of the chest.",
      "Maintain that inward pressure while pressing to straight arms, keeping the dumbbells in contact.",
    ],
  },
  {
    name: "Dumbbell Standing Calf Raise",
    description: "A two-leg calf raise holding dumbbells beside the body.",
    category: "strength",
    muscleGroups: ["calves", "forearms"],
    equipment: ["dumbbell", "step"],
    instructions: [
      "Hold dumbbells at your sides and stand with your forefeet on a stable step.",
      "Keep your trunk upright and your knees comfortably straight.",
      "Lower your heels slowly, then push through the balls of your feet to rise.",
      "Control the descent without swinging the weights or bouncing.",
    ],
    measurementType: "weight_reps",
    baseXP: 15,
  },
  {
    name: "Dumbbell Step-Down",
    description:
      "A controlled single-leg lowering from a step while holding dumbbells.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "abductors", "core"],
    equipment: ["dumbbell", "step"],
    instructions: [
      "Stand on a low step with dumbbells at your sides and one foot near the edge.",
      "Shift onto the working leg and let the free foot move beyond the step.",
      "Bend the working knee and hip until the free heel lightly touches the floor.",
      "Push through the working foot to return, keeping your pelvis level.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Dumbbell Step-Up",
    description:
      "A loaded step onto a raised platform with dumbbells at the sides.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["dumbbell", "plyometric box"],
    instructions: [
      "Stand facing a stable platform with dumbbells hanging beside you.",
      "Place one entire foot on the platform and keep your torso steady.",
      "Push through that foot to rise, minimizing the push from your floor foot.",
      "Lower the trailing foot to the floor under control and reset.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Dumbbell Suitcase Carry",
    description:
      "A loaded walk with one dumbbell carried at the side while resisting a lateral lean.",
    category: "strength",
    muscleGroups: ["forearms", "core", "glutes", "calves"],
    equipment: ["dumbbell"],
    instructions: [
      "Lift one dumbbell and stand with your shoulders and hips level.",
      "Brace your trunk without bending away from the weight.",
      "Walk with short, even steps along a clear path, keeping the weight from swinging.",
      "Set the dumbbell down under control before changing the loaded side.",
    ],
    measurementType: "distance_time",
    baseXP: 20,
  },
  {
    name: "Dumbbell Suitcase Deadlift",
    description:
      "A one-sided deadlift with a dumbbell outside one foot, resisting a sideways lean.",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings", "core", "forearms"],
    equipment: ["dumbbell"],
    instructions: [
      "Set a dumbbell beside one foot and stand with your feet around hip width.",
      "Hinge and bend your knees to grip it while keeping your shoulders level.",
      "Push through both feet to stand without bending sideways toward the weight.",
      "Lower the dumbbell under control and complete both loaded sides.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Dumbbell Suitcase Hold",
    description:
      "A stationary one-sided loaded hold that challenges grip and trunk control.",
    category: "strength",
    muscleGroups: ["forearms", "core"],
    equipment: ["dumbbell"],
    instructions: [
      "Lift one dumbbell and stand with your feet in a stable stance.",
      "Keep your loaded arm straight and shoulders level.",
      "Hold without bending sideways or resting the dumbbell against your leg.",
      "Lower the weight under control before changing sides.",
    ],
    measurementType: "duration",
    baseXP: 20,
  },
  {
    name: "Dumbbell Suitcase Squat",
    description:
      "A squat with dumbbells hanging at the sides, placing the load below the hips.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "forearms", "core"],
    equipment: ["dumbbell"],
    instructions: [
      "Hold a dumbbell in each hand with your arms straight beside your body.",
      "Set your feet in a squat stance and keep the weights clear of your thighs.",
      "Bend your hips and knees, lowering the dumbbells toward the floor without rounding your back.",
      "Stand through both feet and keep your shoulders level throughout.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Dumbbell Sumo Squat",
    description: "A wide-stance squat with a dumbbell held between the legs.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "adductors", "core"],
    equipment: ["dumbbell"],
    instructions: [
      "Hold one dumbbell with both hands and set your feet wider than shoulder width.",
      "Turn your toes outward enough for your knees to track naturally over them.",
      "Bend your knees and hips to lower the dumbbell vertically between your legs.",
      "Push through your feet to stand while keeping your torso controlled.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Dumbbell Thruster",
    description:
      "A dumbbell front squat combined with an overhead press in one continuous ascent.",
    category: "strength",
    muscleGroups: [
      "full body",
      "quadriceps",
      "glutes",
      "shoulders",
      "triceps",
      "core",
    ],
    equipment: ["dumbbell"],
    instructions: [
      "Hold a dumbbell at each shoulder and set a stable squat stance.",
      "Squat down while keeping your trunk braced and heels grounded.",
      "Drive up through your legs and continue directly into an overhead press.",
      "Lower the dumbbells to your shoulders before descending into the next repetition.",
    ],
    measurementType: "weight_reps",
    baseXP: 30,
  },
  {
    name: "Dumbbell Triceps Kickback",
    description:
      "A hinged one-arm triceps extension that keeps the upper arm close to the torso.",
    category: "strength",
    muscleGroups: ["triceps"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Support the free hand on a bench and hold the working upper arm beside the torso with the elbow bent.",
      "Extend the elbow so the dumbbell moves backward while the upper arm stays level.",
      "Bend the elbow slowly without swinging the shoulder or dropping the upper arm.",
    ],
  },
  {
    name: "Dumbbell Upright Row",
    description:
      "A two-dumbbell upright pull that allows independent arm paths while training the shoulders and upper back.",
    category: "strength",
    muscleGroups: ["shoulders", "back"],
    equipment: ["dumbbell"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Stand with the dumbbells in front of the thighs and palms facing the body.",
      "Draw the elbows outward and upward while keeping the weights close to the torso.",
      "Stop below any uncomfortable shoulder position and lower slowly without swinging.",
    ],
  },
  {
    name: "Dumbbell Waiter Carry",
    description:
      "A loaded walk with one dumbbell held in a stable overhead position.",
    category: "strength",
    muscleGroups: ["shoulders", "core", "forearms", "glutes", "calves"],
    equipment: ["dumbbell"],
    instructions: [
      "Press or assist one dumbbell overhead and establish a straight-arm position above the shoulder.",
      "Brace and keep your ribs controlled while standing tall.",
      "Walk slowly along a clear route with the weight steady over your base of support.",
      "Stop before lowering the dumbbell and repeat with the other arm.",
    ],
    measurementType: "distance_time",
    baseXP: 25,
  },
  {
    name: "Dumbbell Walking Lunge",
    description:
      "A traveling series of lunges with dumbbells held beside the body.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "hamstrings", "core"],
    equipment: ["dumbbell"],
    instructions: [
      "Hold your dumbbells at your sides and choose a clear path.",
      "Step forward and lower into a lunge with your lead heel grounded.",
      "Push through the lead leg and swing the rear foot into the next forward step.",
      "Keep the weights from swinging as you continue alternating steps.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "EZ-Bar Biceps Curl",
    description:
      "A standing curl using an angled EZ bar grip to train the biceps and forearms.",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["ez bar"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Take a comfortable underhand grip on the angled sections of the EZ bar and stand upright.",
      "Curl the bar upward while keeping the elbows near the ribs and the wrists aligned.",
      "Lower slowly to extended arms without shifting the torso to move the weight.",
    ],
  },
  {
    name: "EZ-Bar Preacher Curl",
    description:
      "A supported preacher curl using the EZ bar angled grip to load the biceps with minimal torso movement.",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["ez bar", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Set the preacher bench height and grip the angled bar sections with both upper arms on the pad.",
      "Curl the bar toward the shoulders without pulling the chest away from the bench.",
      "Lower slowly, stopping short of a forced elbow lockout at the bottom.",
    ],
  },
  {
    name: "EZ-Bar Skull Crusher",
    description:
      "A lying triceps extension using an EZ bar to load the elbow extensors while the upper arms remain steady.",
    category: "strength",
    muscleGroups: ["triceps"],
    equipment: ["ez bar", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Lie on a flat bench holding the EZ bar above the shoulders with a comfortable narrow grip.",
      "Bend the elbows to lower the bar toward or slightly behind the forehead without moving the upper arms widely.",
      "Extend the elbows to raise the bar while keeping the wrists aligned and avoiding an abrupt lockout.",
    ],
  },
  {
    name: "EZ-Bar Spider Curl",
    description:
      "A chest-supported curl using an EZ bar while the arms hang from an inclined bench.",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["ez bar", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Lie chest down on an incline bench and hold the EZ bar below the shoulders with an underhand angled grip.",
      "Curl the bar upward without moving the upper arms or pulling the chest from the pad.",
      "Lower slowly to comfortable elbow extension and keep the bar from contacting the bench.",
    ],
  },
  {
    name: "Flat-Bench Cable Chest Press",
    description:
      "A lying cable chest press that combines bench support with tension from low pulleys.",
    category: "strength",
    muscleGroups: ["chest", "triceps", "shoulders"],
    equipment: ["cable machine", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Center a flat bench between low pulleys and lie down with a handle in each hand.",
      "Begin with handles beside the chest, then press upward along a comfortable converging path.",
      "Lower under control while keeping the shoulder blades against the bench and cables clear of the arms.",
    ],
  },
  {
    name: "Forward Sled Drag",
    description:
      "A forward walk pulling a loaded sled with its attached harness or straps.",
    category: "strength",
    muscleGroups: ["glutes", "quadriceps", "hamstrings", "calves", "core"],
    equipment: ["sled"],
    instructions: [
      "Attach the sled's harness or straps securely and face away from the sled.",
      "Take up the slack with a stable stance and a braced torso.",
      "Walk forward with steady steps, keeping tension on the attachment and the sled behind you.",
      "Slow gradually and release the attachment only once the sled is stopped.",
    ],
    measurementType: "distance_time",
    baseXP: 20,
  },
  {
    name: "Front-Foot-Elevated Barbell Split Squat",
    description:
      "A barbell split squat with the front foot raised to permit a longer controlled descent.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["barbell", "step"],
    instructions: [
      "Set your front foot on a low, stable step and carry the bar securely across your upper back.",
      "Place the rear foot behind you and square your hips.",
      "Bend both knees, lowering the rear knee while keeping the front foot fully supported.",
      "Press through the elevated front foot to rise without shifting the step.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Front-Foot-Elevated Dumbbell Split Squat",
    description:
      "A dumbbell split squat with the front foot raised on a low step.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["dumbbell", "step"],
    instructions: [
      "Place the whole front foot on a stable low step and hold dumbbells at your sides.",
      "Set the rear foot behind you and keep your hips square.",
      "Lower by bending both knees, controlling the additional range below the front foot.",
      "Drive through the elevated foot to return to the top.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Grip Trainer Squeeze",
    description:
      "A hand-grip exercise using a spring gripper to strengthen finger flexion and closing grip.",
    category: "strength",
    muscleGroups: ["forearms"],
    equipment: ["grip trainer"],
    measurementType: "reps",
    baseXP: 10,
    instructions: [
      "Place the gripper handles securely across the palm and fingers with the wrist in a neutral position.",
      "Squeeze the handles together without bending the wrist or using the other hand to assist.",
      "Open the hand slowly against the spring and complete matching repetitions on both sides.",
    ],
  },
  {
    name: "Hack Squat Machine",
    description:
      "A supported squat on an angled sled machine with shoulder pads carrying the resistance.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes"],
    equipment: ["machine"],
    instructions: [
      "Place your back against the pad, shoulders under the pads, and feet securely on the platform.",
      "Release the handles with the machine's safety stops set.",
      "Bend your knees and hips to lower the sled while keeping your back supported.",
      "Press through your feet to raise the sled without forcefully snapping your knees straight.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Half-Kneeling Single-Arm Landmine Press",
    description:
      "A diagonal one-arm press from a half-kneeling position that trains the shoulder and stabilizing trunk.",
    category: "strength",
    muscleGroups: ["shoulders", "triceps", "chest", "core"],
    equipment: ["landmine", "barbell"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Kneel with the pressing-side knee down and hold the anchored bar end beside that shoulder.",
      "Keep the pelvis level as you press the bar upward and forward along its natural arc.",
      "Lower toward the shoulder without rotating the torso, then change sides.",
    ],
  },
  {
    name: "Heels-Elevated Barbell Squat",
    description:
      "A back squat performed with the heels raised on a secure support to permit a more upright descent.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["barbell", "weight plate"],
    instructions: [
      "Place each heel on an equally high, stable support and keep your forefeet on the floor.",
      "Secure the bar across your upper back and brace before descending.",
      "Bend your knees and hips while keeping your torso controlled and your feet stable.",
      "Stand by driving through both feet without shifting onto your toes.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Heels-Elevated Dumbbell Goblet Squat",
    description:
      "A chest-loaded dumbbell squat with both heels raised on secure supports.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["dumbbell", "weight plate"],
    instructions: [
      "Hold a dumbbell at your chest and place your heels on stable, equal-height supports.",
      "Brace and keep your forefeet firmly in contact with the floor.",
      "Lower by allowing the knees to travel forward while your torso remains controlled.",
      "Drive through both feet to stand without lifting your toes or losing balance.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "High Cable Biceps Curl",
    description:
      "A two-arm curl from high pulleys that trains the biceps with the upper arms held out to the sides.",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Stand between shoulder-height pulleys and hold both handles with the arms extended outward.",
      "Bend the elbows to bring the handles toward the sides of the head while keeping upper arms level.",
      "Extend the elbows slowly without dropping the arms or leaning to either side.",
    ],
  },
  {
    name: "High Cable Row",
    description:
      "A cable row from a high pulley that draws the elbows down and back toward the upper torso.",
    category: "strength",
    muscleGroups: ["back", "shoulders", "biceps"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Sit or stand securely facing a high pulley with a two-hand handle and arms reaching upward.",
      "Pull toward the upper chest by moving the elbows down and back without leaning excessively.",
      "Allow the arms to lengthen upward again while keeping the neck relaxed and the trunk steady.",
    ],
  },
  {
    name: "High-Handle Trap Bar Deadlift",
    description: "A shorter-range trap bar deadlift using raised handles.",
    category: "strength",
    muscleGroups: [
      "glutes",
      "quadriceps",
      "hamstrings",
      "back",
      "forearms",
      "core",
    ],
    equipment: ["trap bar"],
    instructions: [
      "Stand centered in the trap bar and grasp the raised handles.",
      "Brace and bend your knees and hips enough to establish a stable starting position.",
      "Drive through your feet to stand with the frame level.",
      "Return the frame to the floor slowly and reset your grip and posture.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "High-to-Low Cable Chest Fly",
    description:
      "A downward cable fly that draws the upper arms across the lower chest against high pulley resistance.",
    category: "strength",
    muscleGroups: ["chest", "shoulders", "core"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Set the pulleys above shoulder height and stand forward with one foot leading.",
      "With slightly bent elbows, bring the handles down and inward toward the front of the hips.",
      "Reverse the arc slowly while keeping the ribs steady and avoiding excessive shoulder extension.",
    ],
  },
  {
    name: "High-to-Low Cable Woodchop",
    description:
      "A diagonal cable rotation that moves resistance from above one shoulder toward the opposite hip.",
    category: "strength",
    muscleGroups: ["core", "shoulders"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Stand sideways to a high pulley and hold one handle with both hands near the elevated shoulder.",
      "Move the handle diagonally down across the body, allowing the hips and feet to turn with the torso.",
      "Return slowly along the same diagonal without forcing rotation through the lower back alone.",
    ],
  },
  {
    name: "Hip Abduction Machine",
    description:
      "A seated machine exercise that moves the thighs outward against padded resistance.",
    category: "strength",
    muscleGroups: ["abductors", "glutes"],
    equipment: ["machine"],
    instructions: [
      "Adjust the seat and pads so the outside of each thigh rests securely against them.",
      "Sit tall with your pelvis against the seat and hold the handles.",
      "Press your thighs outward through a controlled range without rocking your torso.",
      "Return inward slowly, keeping the weight stack controlled.",
    ],
    measurementType: "weight_reps",
    baseXP: 15,
  },
  {
    name: "Hip Adduction Machine",
    description:
      "A seated machine exercise that brings the thighs together against resistance.",
    category: "strength",
    muscleGroups: ["adductors"],
    equipment: ["machine"],
    instructions: [
      "Adjust the starting width and position the inner thighs against the machine pads.",
      "Sit with your pelvis supported and hold the handles.",
      "Bring your thighs inward smoothly without jerking your torso.",
      "Open back to the starting position under control.",
    ],
    measurementType: "weight_reps",
    baseXP: 15,
  },
  {
    name: "Hip Thrust Machine",
    description:
      "A seated or reclined hip extension using a machine's padded hip restraint.",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings"],
    equipment: ["machine"],
    instructions: [
      "Adjust the seat and hip pad or belt according to the machine's design.",
      "Place your feet securely on the platform and brace your trunk.",
      "Extend your hips to move the resistance while keeping your back supported.",
      "Return slowly to the starting position and release the restraint only after the load is secure.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Horizontal Leg Press",
    description:
      "A seated leg press moving the platform or seat along a horizontal path.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "hamstrings"],
    equipment: ["machine"],
    instructions: [
      "Adjust the seat to allow a controlled starting knee angle and plant both feet on the platform.",
      "Keep your pelvis against the seat and grasp the handles.",
      "Push through both feet to move the resistance without snapping your knees straight.",
      "Return slowly while keeping your back and hips supported.",
    ],
    measurementType: "weight_reps",
    baseXP: 15,
  },
  {
    name: "Incline Barbell Bench Press",
    description:
      "An inclined barbell press emphasizing the upper chest and front shoulders through a stable pressing path.",
    category: "strength",
    muscleGroups: ["chest", "shoulders", "triceps"],
    equipment: ["barbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Set the bench to a moderate incline and take a grip slightly wider than shoulder width.",
      "Lower the bar toward the upper chest while keeping the forearms nearly vertical.",
      "Press upward without lifting the hips or allowing the shoulder blades to slide forward.",
    ],
  },
  {
    name: "Incline Chest-Supported Dumbbell Shrug",
    description:
      "A prone incline-bench shrug that emphasizes shoulder-blade movement with the torso supported.",
    category: "strength",
    muscleGroups: ["back", "shoulders"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Lie chest down on an incline bench with dumbbells hanging beneath the shoulders.",
      "Keep the elbows straight and draw the shoulder blades together with a small controlled shrug.",
      "Release the shoulder blades slowly without lifting the chest or bending the elbows into a row.",
    ],
  },
  {
    name: "Incline Dumbbell Bench Press",
    description:
      "An incline press with independent weights that loads the upper chest and anterior shoulders.",
    category: "strength",
    muscleGroups: ["chest", "shoulders", "triceps"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Set a moderate bench incline and position the dumbbells beside the upper chest.",
      "Keep the shoulder blades supported as the weights descend along a comfortable elbow path.",
      "Press both weights above the upper chest while keeping the ribs and hips steady.",
    ],
  },
  {
    name: "Incline Dumbbell Biceps Curl",
    description:
      "A seated incline curl that positions the upper arms behind the torso to train the biceps from a lengthened position.",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Sit against an incline bench and let the arms hang beside it with palms facing forward.",
      "Curl the dumbbells while keeping the upper arms in place rather than bringing the elbows forward.",
      "Lower slowly to a comfortable straight-arm position without letting the shoulders roll forward.",
    ],
  },
  {
    name: "Incline Dumbbell Chest Fly",
    description:
      "An inclined dumbbell fly that directs the arm arc across the upper chest.",
    category: "strength",
    muscleGroups: ["chest", "shoulders"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Set a moderate incline and hold the weights above the upper chest with softly bent elbows.",
      "Lower the arms outward in a wide arc while keeping the shoulder blades supported.",
      "Sweep the weights back together above the upper chest without turning the movement into a press.",
    ],
  },
  {
    name: "Incline Dumbbell Hammer Curl",
    description:
      "An incline-bench curl with palms facing inward that combines a behind-torso arm position with neutral-grip loading.",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Recline on an incline bench with the dumbbells hanging beside it and palms facing inward.",
      "Bend the elbows while keeping the upper arms still and the wrists straight.",
      "Lower the weights under control to comfortable elbow extension without changing the neutral grip.",
    ],
  },
  {
    name: "Incline Dumbbell Triceps Extension",
    description:
      "An incline-bench triceps extension that places the upper arms at a different angle from the flat-bench variation.",
    category: "strength",
    muscleGroups: ["triceps"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Recline on an incline bench with dumbbells above the shoulders and palms facing inward.",
      "Bend the elbows to lower the weights beside and slightly behind the head while keeping upper arms steady.",
      "Extend the elbows under control without arching the back or moving the weights into a chest press.",
    ],
  },
  {
    name: "Incline Machine Chest Press",
    description:
      "An incline chest-press machine movement that directs the press upward to emphasize the upper chest.",
    category: "strength",
    muscleGroups: ["chest", "shoulders", "triceps"],
    equipment: ["machine"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Adjust the seat so the machine handles align with the upper chest and plant both feet.",
      "Press upward along the machine path with the back against the pad and wrists straight.",
      "Lower the handles under control until the elbows reach a comfortable starting depth.",
    ],
  },
  {
    name: "Incline-Bench Cable Chest Press",
    description:
      "An inclined cable press that directs continuous cable resistance through the upper chest pressing path.",
    category: "strength",
    muscleGroups: ["chest", "shoulders", "triceps"],
    equipment: ["cable machine", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Set an incline bench between low pulleys and position the handles beside the upper chest.",
      "Press the handles above the upper chest while maintaining contact with the bench backrest.",
      "Return along the same path without allowing the shoulders to roll forward or the cables to snag.",
    ],
  },
  {
    name: "Kettlebell Bottoms-Up Carry",
    description:
      "A walk holding a kettlebell inverted near shoulder height, requiring careful grip and balance.",
    category: "strength",
    muscleGroups: ["forearms", "shoulders", "core", "glutes", "calves"],
    equipment: ["kettlebell"],
    instructions: [
      "Bring a light kettlebell to a bottoms-up position with its body above the handle.",
      "Keep your wrist aligned and your elbow close to your torso.",
      "Walk slowly with steady steps while keeping the inverted bell from tipping.",
      "Stop and lower the bell safely before switching hands.",
    ],
    measurementType: "distance_time",
    baseXP: 25,
  },
  {
    name: "Kettlebell Bottoms-Up Rack Hold",
    description:
      "A stationary hold balancing an inverted kettlebell near shoulder height.",
    category: "strength",
    muscleGroups: ["forearms", "shoulders", "core"],
    equipment: ["kettlebell"],
    instructions: [
      "Bring a light kettlebell into a bottoms-up position with its body directly above the handle.",
      "Keep your wrist aligned and elbow close to your torso.",
      "Maintain a quiet stance and a firm grip without letting the bell tilt.",
      "Lower the bell with control before switching hands.",
    ],
    measurementType: "duration",
    baseXP: 25,
  },
  {
    name: "Kettlebell Clean and Jerk",
    description:
      "A single-arm kettlebell clean followed by a leg-driven overhead jerk.",
    category: "strength",
    muscleGroups: [
      "full body",
      "glutes",
      "quadriceps",
      "shoulders",
      "triceps",
      "core",
    ],
    equipment: ["kettlebell"],
    instructions: [
      "Clean the kettlebell into the front rack and establish a balanced stance.",
      "Make a short knee dip, then drive upward with your legs.",
      "Rebend your knees as your arm locks overhead to receive the bell.",
      "Stand fully, lower to the rack, and return the bell under control.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Kettlebell Clean and Press",
    description:
      "A kettlebell clean into the rack followed by a controlled overhead press.",
    category: "strength",
    muscleGroups: [
      "full body",
      "glutes",
      "hamstrings",
      "shoulders",
      "triceps",
      "core",
    ],
    equipment: ["kettlebell"],
    instructions: [
      "Clean the kettlebell into a stable rack close to your torso.",
      "Brace, keep your knees steady, and press the bell upward without an added leg dip.",
      "Finish with your arm straight and the bell balanced above your shoulder.",
      "Lower to the rack with control and return through the clean path before repeating.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Kettlebell Deadlift",
    description:
      "A deadlift raising a kettlebell from between the feet with both hands.",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings", "quadriceps", "core"],
    equipment: ["kettlebell"],
    instructions: [
      "Place the kettlebell between your feet with its handle centered beneath you.",
      "Bend your hips and knees to grip it while keeping your trunk braced.",
      "Push through both feet and extend your hips to stand with straight arms.",
      "Return the bell between your feet by reversing the movement.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Kettlebell Goblet Cossack Squat",
    description:
      "A deep lateral squat holding a kettlebell at the chest while the opposite leg stays extended.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "adductors", "core"],
    equipment: ["kettlebell"],
    instructions: [
      "Hold the kettlebell by its horns and take a wide stance.",
      "Shift your hips toward one foot as that knee bends, keeping the opposite leg long.",
      "Keep the working heel grounded and turn the extended foot upward only as comfortable.",
      "Press through the bent leg to return to center and alternate sides.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Kettlebell Gorilla Row",
    description:
      "An alternating kettlebell row from a wide hip hinge with the nonworking bell grounded for support.",
    category: "strength",
    muscleGroups: ["back", "biceps", "core"],
    equipment: ["kettlebell"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Place two kettlebells between a wide stance and hinge to grip both handles with a neutral spine.",
      "Keep one bell grounded as you row the other toward the hip without turning the torso.",
      "Return the lifted bell to the floor and alternate arms from the same stable hinge.",
    ],
  },
  {
    name: "Kettlebell Shrug",
    description:
      "A two-kettlebell shrug that loads shoulder elevation with the bells held beside the legs.",
    category: "strength",
    muscleGroups: ["back", "shoulders", "forearms"],
    equipment: ["kettlebell"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Stand tall with a kettlebell in each hand and the arms extended at the sides.",
      "Lift the shoulders straight upward while keeping the bells still and the elbows straight.",
      "Lower the shoulders under control without rolling them forward or backward.",
    ],
  },
  {
    name: "Kettlebell Snatch",
    description:
      "A single-arm ballistic lift that finishes with the kettlebell locked overhead.",
    category: "strength",
    muscleGroups: ["full body", "glutes", "hamstrings", "shoulders", "core"],
    equipment: ["kettlebell"],
    instructions: [
      "Start from a controlled one-arm backswing with your trunk braced.",
      "Drive your hips and guide the bell close to your body as it rises.",
      "Insert your hand through the handle to settle the bell softly behind the wrist with the arm straight overhead.",
      "Lower through a controlled path into a backswing or rack and park the bell safely.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Kettlebell Turkish Get-Up",
    description:
      "A controlled transition from lying to standing and back while holding a kettlebell overhead.",
    category: "strength",
    muscleGroups: ["full body", "core", "shoulders", "glutes", "quadriceps"],
    equipment: ["kettlebell"],
    instructions: [
      "Lie on your back with the kettlebell securely held above one shoulder, that-side knee bent, and the other leg extended.",
      "Press through the planted foot and roll onto the opposite elbow, then rise onto that hand while keeping the loaded arm vertical.",
      "Lift your hips enough to bring the extended leg underneath you into a supported half-kneeling position.",
      "Bring your torso upright, align the rear leg, and stand from the half kneel with the bell stable overhead.",
      "Reverse the sequence slowly to return to the floor, then lower the kettlebell with both hands before switching sides.",
    ],
    measurementType: "weight_reps",
    baseXP: 30,
  },
  {
    name: "Kettlebell Windmill",
    description:
      "A loaded hip hinge with one kettlebell overhead and the free hand reaching down the opposite leg.",
    category: "strength",
    muscleGroups: ["core", "glutes", "hamstrings", "shoulders"],
    equipment: ["kettlebell"],
    instructions: [
      "Secure the kettlebell overhead and turn both feet slightly away from the loaded side.",
      "Shift your hips toward the loaded side while keeping that leg mostly straight and the other knee soft.",
      "Hinge and rotate through the hips and upper torso as the free hand slides down the opposite leg.",
      "Keep the bell stacked over the loaded shoulder and return upright through a controllable range.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Kneeling Cable Crunch",
    description:
      "A kneeling cable crunch that loads controlled spinal flexion against resistance from a high pulley.",
    category: "strength",
    muscleGroups: ["core"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Kneel facing a high pulley and hold a rope beside the head without pulling on the neck.",
      "Curl the ribs toward the pelvis while keeping the hips mostly stationary and the hands near the temples.",
      "Return slowly to the starting trunk position without letting the cable lift the knees or hips.",
    ],
  },
  {
    name: "Landmine Lateral Lunge",
    description:
      "A side lunge using the free end of a landmine bar for front-loaded resistance.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "adductors", "core"],
    equipment: ["barbell", "landmine"],
    instructions: [
      "Hold the anchored bar's free end at chest height and set a balanced starting stance.",
      "Step laterally and move your hips back over the stepping leg.",
      "Bend that knee while keeping the other leg longer and the bar close.",
      "Push through the bent leg to return to center without twisting your torso.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Landmine Reverse Lunge",
    description:
      "A backward lunge holding the free end of an anchored barbell at the chest.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["barbell", "landmine"],
    instructions: [
      "Secure the bar in a landmine and hold its free end close to your chest.",
      "Stand facing the anchor with room to step backward.",
      "Step back and bend both knees while following the bar's arc with a braced torso.",
      "Drive through the front foot to return to standing.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Landmine Romanian Deadlift",
    description:
      "A hip hinge holding the free end of an anchored barbell between the legs.",
    category: "strength",
    muscleGroups: ["hamstrings", "glutes", "back", "core"],
    equipment: ["barbell", "landmine"],
    instructions: [
      "Secure the bar in a landmine and hold its free end with both hands.",
      "Stand with soft knees and the bar end in front of your hips.",
      "Push your hips backward as the bar travels through its arc, keeping your trunk braced.",
      "Extend your hips to stand and stop with the load controlled in front of you.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Landmine Rotation",
    description:
      "A two-hand diagonal barbell movement that trains the trunk through coordinated rotation and stabilization.",
    category: "strength",
    muscleGroups: ["core", "shoulders"],
    equipment: ["landmine", "barbell"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Stand facing the landmine and hold the anchored bar end with both hands in front of the upper chest.",
      "Guide the bar in an arc toward one hip while allowing the feet and hips to turn with the torso.",
      "Bring the bar through center toward the opposite hip without forcing rotation from the lower back.",
    ],
  },
  {
    name: "Landmine Single-Leg Romanian Deadlift",
    description:
      "A single-leg hinge using a landmine bar to provide an angled load path.",
    category: "strength",
    muscleGroups: ["hamstrings", "glutes", "core", "abductors"],
    equipment: ["barbell", "landmine"],
    instructions: [
      "Hold the landmine bar end with the hand opposite the working leg.",
      "Balance on the working foot with a slight knee bend.",
      "Hinge your hips back while extending the free leg behind and keeping your pelvis square.",
      "Extend the working hip to rise, guiding the bar along its arc without twisting.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Landmine Split Squat",
    description:
      "A stationary split squat holding the end of a landmine bar near the chest.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["barbell", "landmine"],
    instructions: [
      "Face the landmine anchor and hold the bar end at your chest.",
      "Take a staggered stance and brace with your hips squared forward.",
      "Lower by bending both knees, allowing the bar to follow its arc.",
      "Press through the front foot to rise while keeping the stance fixed.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Landmine Squat",
    description:
      "A front-loaded squat holding the free end of an anchored barbell.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["barbell", "landmine"],
    instructions: [
      "Secure one end of the bar in a landmine and hold the free end at chest height.",
      "Stand facing the anchor with a stable squat stance and brace your trunk.",
      "Lower between your hips as the bar follows its natural arc.",
      "Push through both feet to stand while keeping the bar close to your chest.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Landmine T-Bar Row",
    description:
      "A two-hand row with a landmine-mounted barbell that loads the back through an arcing bar path.",
    category: "strength",
    muscleGroups: ["back", "biceps", "core"],
    equipment: ["landmine", "barbell"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Straddle the bar, hinge at the hips, and hold a secure close-grip attachment near the loaded end.",
      "Pull the handle toward the lower chest without lifting the torso out of the hinge.",
      "Lower the plates smoothly and keep the bar anchored throughout the set.",
    ],
  },
  {
    name: "Leaning Dumbbell Lateral Raise",
    description:
      "A supported one-arm lateral raise performed with the body leaning away from a secure handhold.",
    category: "strength",
    muscleGroups: ["shoulders"],
    equipment: ["dumbbell"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Hold a secure support with the free hand and lean slightly away while the feet remain stable.",
      "Raise the dumbbell out to the side with a soft elbow bend and the torso held in the same lean.",
      "Lower without swinging, then repeat with the other arm using a matched body angle.",
    ],
  },
  {
    name: "Leg Extension Machine",
    description: "A seated knee extension against a padded machine lever.",
    category: "strength",
    muscleGroups: ["quadriceps"],
    equipment: ["machine"],
    instructions: [
      "Adjust the seat so the machine's pivot aligns with your knees and the roller rests above your ankles.",
      "Sit back against the pad and hold the handles.",
      "Straighten your knees to raise the roller without lifting your hips.",
      "Bend your knees slowly to return the load to the start.",
    ],
    measurementType: "weight_reps",
    baseXP: 15,
  },
  {
    name: "Leg Press Calf Raise",
    description: "An ankle extension on a leg press with the legs held steady.",
    category: "strength",
    muscleGroups: ["calves"],
    equipment: ["machine"],
    instructions: [
      "Sit in the leg press with your back and hips supported.",
      "Position the balls of your feet on the platform with heels free to move, using the machine's secure setup.",
      "Keep your knee angle steady as you lower your heels and then press through your forefeet.",
      "Move only through the ankles and engage the catches before leaving the machine.",
    ],
    measurementType: "weight_reps",
    baseXP: 15,
  },
  {
    name: "Low-to-High Cable Chest Fly",
    description:
      "An upward cable fly that brings the arms inward toward the upper chest from low pulley positions.",
    category: "strength",
    muscleGroups: ["chest", "shoulders", "core"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Start between low pulleys with handles beside the hips and a small bend in the elbows.",
      "Sweep the arms upward and together until the handles meet around upper-chest height.",
      "Lower along the same arc without shrugging or leaning backward to move the load.",
    ],
  },
  {
    name: "Low-to-High Cable Lift",
    description:
      "A diagonal cable lift that moves resistance from one hip toward the opposite shoulder.",
    category: "strength",
    muscleGroups: ["core", "shoulders"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Stand sideways to a low pulley and hold its handle with both hands near the closer hip.",
      "Lift the handle diagonally across the torso toward the opposite shoulder with coordinated hip and foot movement.",
      "Lower along the same path while keeping the arms controlled and the back from overextending.",
    ],
  },
  {
    name: "Lying Cable Triceps Extension",
    description:
      "A bench-supported triceps extension using cable tension from behind the head.",
    category: "strength",
    muscleGroups: ["triceps"],
    equipment: ["cable machine", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Place a flat bench in front of a low pulley and lie with the head toward the cable attachment.",
      "Hold the handle above the shoulders and bend the elbows to lower it behind the head.",
      "Extend the elbows without lifting the shoulders from the bench or allowing the cable to catch.",
    ],
  },
  {
    name: "Lying Dumbbell Triceps Extension",
    description:
      "A lying triceps extension with independent dumbbells and inward-facing palms.",
    category: "strength",
    muscleGroups: ["triceps"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Lie on a flat bench with the dumbbells above the shoulders and palms facing each other.",
      "Bend the elbows so the weights descend beside the head while the upper arms remain nearly fixed.",
      "Extend the elbows to return the weights above the shoulders without letting the arms flare widely.",
    ],
  },
  {
    name: "Lying Leg Curl Machine",
    description: "A prone knee curl that pulls a padded lever toward the hips.",
    category: "strength",
    muscleGroups: ["hamstrings", "calves"],
    equipment: ["machine"],
    instructions: [
      "Lie face down and align your knees with the machine's pivot.",
      "Position the roller just above your heels and hold the handles.",
      "Bend your knees to bring your heels toward your glutes while your hips stay on the pad.",
      "Lower the roller slowly without letting the stack drop.",
    ],
    measurementType: "weight_reps",
    baseXP: 15,
  },
  {
    name: "Machine Abdominal Crunch",
    description:
      "A supported abdominal crunch against a machine resistance path that loads trunk flexion.",
    category: "strength",
    muscleGroups: ["core"],
    equipment: ["machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Adjust the seat and pads so the machine pivot matches the intended trunk movement and plant the feet.",
      "Curl the ribs toward the pelvis while keeping the hands from pulling the handles to do the work.",
      "Return slowly to the supported starting position without letting the weight stack slam.",
    ],
  },
  {
    name: "Machine Biceps Curl",
    description:
      "A supported curl machine movement that loads elbow flexion through a guided resistance path.",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Adjust the seat so the elbows align with the machine pivot and the upper arms rest on the pad.",
      "Curl the handles while keeping the shoulders and upper arms supported.",
      "Lower smoothly to a comfortable elbow extension without allowing the weight stack to crash.",
    ],
  },
  {
    name: "Machine Chest Press",
    description:
      "A guided seated chest press that allows the chest, shoulders, and triceps to work against a stable resistance path.",
    category: "strength",
    muscleGroups: ["chest", "triceps", "shoulders"],
    equipment: ["machine"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Adjust the seat so the handles sit around mid-chest height and keep the back supported.",
      "Press the handles forward without lifting the shoulders or forcing the elbows to lock abruptly.",
      "Return until the elbows reach a comfortable depth, keeping the weight stack from slamming.",
    ],
  },
  {
    name: "Machine High Row",
    description:
      "A supported high-row machine pull that draws the arms downward and backward from an elevated starting position.",
    category: "strength",
    muscleGroups: ["back", "biceps", "shoulders"],
    equipment: ["machine"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Adjust the seat and chest support so the high handles are reachable without lifting the shoulders.",
      "Pull the handles down toward the upper ribs while keeping the chest against the pad.",
      "Return along the machine arc slowly without shrugging or letting the plates crash.",
    ],
  },
  {
    name: "Machine Lateral Raise",
    description:
      "A supported machine raise that lifts the elbows outward against pads to train the lateral shoulders.",
    category: "strength",
    muscleGroups: ["shoulders"],
    equipment: ["machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Adjust the seat so the machine axis aligns near the shoulder joints and place the upper arms against the pads.",
      "Lift the elbows outward toward shoulder height while keeping the torso against the support.",
      "Lower the pads under control without letting the shoulders collapse inward.",
    ],
  },
  {
    name: "Machine Low Row",
    description:
      "A low-path machine row that brings the elbows toward the hips against guided resistance.",
    category: "strength",
    muscleGroups: ["back", "biceps"],
    equipment: ["machine"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Set the seat and support pads so the low handles begin within a comfortable arm-length reach.",
      "Pull the handles toward the waist while keeping the torso stable and wrists straight.",
      "Extend the arms slowly without pushing the chest forward or dropping the resistance.",
    ],
  },
  {
    name: "Machine Pullover",
    description:
      "A supported machine pullover that loads shoulder extension while minimizing elbow movement.",
    category: "strength",
    muscleGroups: ["back", "chest"],
    equipment: ["machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Adjust the seat and place the elbows or upper arms against the machine pads as instructed by its design.",
      "Draw the arms downward toward the front of the torso while keeping the back supported.",
      "Return to the comfortable overhead starting position without lifting the ribs away from the pad.",
    ],
  },
  {
    name: "Machine Shoulder Press",
    description:
      "A seated guided shoulder press that loads overhead elbow extension with a supported torso.",
    category: "strength",
    muscleGroups: ["shoulders", "triceps"],
    equipment: ["machine"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Adjust the seat so the handles begin around shoulder height and keep both feet planted.",
      "Press the handles upward without shrugging excessively or arching away from the backrest.",
      "Lower along the machine path to a comfortable depth without dropping the weight stack.",
    ],
  },
  {
    name: "Machine Shrug",
    description:
      "A guided shoulder-elevation movement that loads the upper trapezius through dedicated machine handles.",
    category: "strength",
    muscleGroups: ["back", "shoulders", "forearms"],
    equipment: ["machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Adjust the machine handles or seat so the arms can remain straight at the starting position.",
      "Elevate the shoulders toward the ears without bending the elbows or tilting the head.",
      "Lower slowly through the machine path and keep the resistance from dropping abruptly.",
    ],
  },
  {
    name: "Machine Triceps Extension",
    description:
      "A supported elbow-extension machine movement that isolates the triceps through a guided path.",
    category: "strength",
    muscleGroups: ["triceps"],
    equipment: ["machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Adjust the seat so the elbows align with the machine pivot and the upper arms rest on the support.",
      "Extend the elbows against the machine handles while keeping the shoulders still.",
      "Return to a comfortable elbow bend without lifting off the seat or dropping the resistance.",
    ],
  },
  {
    name: "Mid-Cable Chest Fly",
    description:
      "A standing cable fly that brings the arms together horizontally across the chest.",
    category: "strength",
    muscleGroups: ["chest", "shoulders", "core"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Set both pulleys around shoulder height and step forward with softly bent elbows and a staggered stance.",
      "Sweep the handles together in front of the chest without changing the elbow bend significantly.",
      "Open the arms slowly until the chest stretches comfortably while keeping the trunk still.",
    ],
  },
  {
    name: "Neutral-Grip Dumbbell Bench Press",
    description:
      "A flat-bench dumbbell press with palms facing inward throughout the movement.",
    category: "strength",
    muscleGroups: ["chest", "triceps", "shoulders"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Lie on the bench holding the dumbbells over the chest with palms facing each other.",
      "Lower the weights beside the rib cage while keeping the elbows relatively close to the torso.",
      "Press straight upward while preserving the neutral grip and supported shoulder position.",
    ],
  },
  {
    name: "Neutral-Grip Dumbbell Shoulder Press",
    description:
      "An overhead dumbbell press performed with palms facing inward and elbows held closer to the torso.",
    category: "strength",
    muscleGroups: ["shoulders", "triceps"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Sit against an upright bench and hold the weights beside the shoulders with palms facing each other.",
      "Press upward while keeping the elbows under the wrists and the shoulders away from the ears.",
      "Lower along the same neutral-grip path without arching away from the bench.",
    ],
  },
  {
    name: "Neutral-Grip Lat Pulldown",
    description:
      "A vertical cable pull with inward-facing palms that keeps the elbows near the torso.",
    category: "strength",
    muscleGroups: ["back", "biceps"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Secure the thighs under the pad and grasp a neutral-grip attachment above the head.",
      "Pull the handle toward the upper chest with elbows moving down beside the ribs.",
      "Extend the arms overhead slowly without arching the lower back to lift the stack.",
    ],
  },
  {
    name: "Neutral-Grip Seated Cable Row",
    description:
      "A seated cable row using a close neutral handle to draw the elbows toward the hips.",
    category: "strength",
    muscleGroups: ["back", "biceps"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Sit with feet braced, knees softly bent, and hands on a close neutral-grip cable handle.",
      "Pull toward the lower ribs while keeping the torso upright and shoulders away from the ears.",
      "Extend the arms with control without collapsing the chest or rocking backward.",
    ],
  },
  {
    name: "Overhead Rope Cable Triceps Extension",
    description:
      "An overhead triceps extension with a rope cable attachment that loads the arms from behind.",
    category: "strength",
    muscleGroups: ["triceps", "core"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Face away from the pulley with a staggered stance and the rope held behind the head.",
      "Keep the upper arms angled overhead as you extend the elbows to move the hands forward and upward.",
      "Bend the elbows under control while maintaining a steady trunk and secure rope grip.",
    ],
  },
  {
    name: "Paused Barbell Back Squat",
    description:
      "A back squat with a deliberate motionless pause at the bottom before the ascent.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["barbell"],
    instructions: [
      "Support the bar on your upper back, set your stance, and brace.",
      "Lower into your squat while keeping the bar balanced over your feet.",
      "Hold the bottom position briefly with your legs and trunk engaged, avoiding a bounce.",
      "Drive upward from the pause and finish in a balanced standing position.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Paused Barbell Deadlift",
    description:
      "A deadlift with a deliberate pause during the pull to reinforce control of the starting position.",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings", "quadriceps", "back", "core"],
    equipment: ["barbell"],
    instructions: [
      "Set up for a conventional deadlift with the bar over midfoot and your trunk braced.",
      "Lift the bar slightly from the floor and pause while keeping it close to your legs.",
      "Resume the pull by extending your hips and knees to stand.",
      "Lower to the floor under control and reset rather than bouncing into the next repetition.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Pec Deck Chest Fly",
    description:
      "A supported machine fly that trains the chest by bringing the upper arms toward the body midline.",
    category: "strength",
    muscleGroups: ["chest", "shoulders"],
    equipment: ["machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Adjust the seat so the elbows or handles are level with the chest and select a comfortable starting width.",
      "Keep the back against the pad as you bring the arms together in front of the torso.",
      "Open slowly without allowing the machine to pull the shoulders beyond a comfortable stretch.",
    ],
  },
  {
    name: "Pendlay Row",
    description:
      "A barbell row that begins each repetition from the floor with the torso held near horizontal.",
    category: "strength",
    muscleGroups: ["back", "biceps", "core"],
    equipment: ["barbell"],
    measurementType: "weight_reps",
    baseXP: 25,
    instructions: [
      "Set the bar on the floor and hinge until the torso is nearly parallel to the ground.",
      "Brace and pull the bar toward the lower chest without lifting the torso to start the repetition.",
      "Return the bar fully to the floor and reset your position before the next pull.",
    ],
  },
  {
    name: "Pendulum Squat Machine",
    description:
      "A supported squat using a machine whose loaded arm moves through an arc.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes"],
    equipment: ["machine"],
    instructions: [
      "Set the machine's depth stops and position your shoulders beneath its pads.",
      "Place your feet securely on the platform and release the start mechanism.",
      "Lower along the machine's arc while keeping your torso against the support.",
      "Push evenly through both feet to return to the start and secure the machine.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Prone Incline Dumbbell Y-Raise",
    description:
      "A light supported raise in a Y-shaped arm position that trains shoulder control and the upper back.",
    category: "strength",
    muscleGroups: ["shoulders", "back"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Lie chest down on a shallow incline bench holding light dumbbells with thumbs angled upward.",
      "Raise the arms forward and outward into a Y shape without lifting the chest off the bench.",
      "Lower slowly while keeping the shoulders away from the ears and using a comfortable range.",
    ],
  },
  {
    name: "Resistance Band Biceps Curl",
    description:
      "A standing band curl that loads elbow flexion against increasing elastic resistance.",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["resistance band"],
    measurementType: "reps",
    baseXP: 10,
    instructions: [
      "Stand securely on the band and hold its handles with palms facing upward beside the thighs.",
      "Curl the hands toward the shoulders while keeping the elbows close to the torso.",
      "Lower under control without letting the band snap the arms straight or rocking the body.",
    ],
  },
  {
    name: "Resistance Band Chest Fly",
    description:
      "A band-resisted chest fly that brings the arms together while maintaining a soft elbow bend.",
    category: "strength",
    muscleGroups: ["chest", "shoulders", "core"],
    equipment: ["resistance band"],
    measurementType: "reps",
    baseXP: 10,
    instructions: [
      "Secure the band behind you at chest height and step forward with arms opened comfortably.",
      "Bring the hands together in front of the chest while maintaining the same small elbow bend.",
      "Open the arms under control and keep the band from snapping the shoulders backward.",
    ],
  },
  {
    name: "Resistance Band Chest Press",
    description:
      "A standing chest press performed against a securely anchored band behind the torso.",
    category: "strength",
    muscleGroups: ["chest", "triceps", "shoulders", "core"],
    equipment: ["resistance band"],
    measurementType: "reps",
    baseXP: 10,
    instructions: [
      "Anchor the band at chest height and step forward until the handles have light starting tension.",
      "Use a staggered stance and press both hands forward from beside the chest.",
      "Return slowly without letting the band pull the elbows far behind the body.",
    ],
  },
  {
    name: "Resistance Band Clamshell",
    description: "A side-lying hip rotation with a loop band above the knees.",
    category: "strength",
    muscleGroups: ["glutes", "abductors"],
    equipment: ["resistance band"],
    instructions: [
      "Place a loop band above your knees and lie on your side with hips and knees bent.",
      "Stack your hips and keep your heels touching.",
      "Rotate the top knee upward against the band without rolling your pelvis backward.",
      "Lower the knee slowly and keep tension before repeating.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Resistance Band Donkey Kick",
    description: "A quadruped hip extension against a loop band.",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings", "core"],
    equipment: ["resistance band"],
    instructions: [
      "Place a loop band around your thighs above the knees and start on hands and knees.",
      "Brace and keep your shoulders over your hands.",
      "Lift one bent leg backward and upward from the hip without arching your back.",
      "Return the knee toward the floor slowly while keeping the band engaged.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Resistance Band Face Pull",
    description:
      "A band-resisted pull toward the face that emphasizes the rear shoulders and controlled upper-back movement.",
    category: "strength",
    muscleGroups: ["shoulders", "back"],
    equipment: ["resistance band"],
    measurementType: "reps",
    baseXP: 10,
    instructions: [
      "Anchor the band at face height and grasp it with both hands at arm length.",
      "Pull toward the forehead while spreading the hands and keeping the ribs steady.",
      "Extend the arms slowly without allowing the anchor to pull the torso forward.",
    ],
  },
  {
    name: "Resistance Band Fire Hydrant",
    description:
      "A quadruped outward thigh lift with a loop band above the knees.",
    category: "strength",
    muscleGroups: ["glutes", "abductors", "core"],
    equipment: ["resistance band"],
    instructions: [
      "Place the band above your knees and set your hands under your shoulders on the floor.",
      "Brace your trunk and keep both knees bent.",
      "Lift one knee out to the side without twisting your pelvis or leaning onto the other arm.",
      "Lower under control and repeat on the intended side.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Resistance Band Front Raise",
    description:
      "A band-resisted front raise that trains the anterior shoulders through a forward lifting arc.",
    category: "strength",
    muscleGroups: ["shoulders"],
    equipment: ["resistance band"],
    measurementType: "reps",
    baseXP: 10,
    instructions: [
      "Stand securely on the band and hold the handles in front of the thighs.",
      "Lift the hands forward toward shoulder height while keeping the torso upright.",
      "Lower slowly with straight wrists and avoid using the hips to overcome the band tension.",
    ],
  },
  {
    name: "Resistance Band Lat Pulldown",
    description:
      "A vertical band pull from a secure overhead anchor that loads the back and elbow flexors.",
    category: "strength",
    muscleGroups: ["back", "biceps"],
    equipment: ["resistance band"],
    measurementType: "reps",
    baseXP: 10,
    instructions: [
      "Attach the band to a secure high anchor and kneel or sit with the hands overhead.",
      "Pull the hands toward the upper chest while moving the elbows down beside the torso.",
      "Return overhead slowly without leaning backward or losing the band tension.",
    ],
  },
  {
    name: "Resistance Band Lateral Raise",
    description:
      "A lateral shoulder raise against a band anchored beneath the feet.",
    category: "strength",
    muscleGroups: ["shoulders"],
    equipment: ["resistance band"],
    measurementType: "reps",
    baseXP: 10,
    instructions: [
      "Stand on the band with hands beside the thighs and enough slack for a comfortable starting position.",
      "Lift the arms outward with softly bent elbows until they approach shoulder height.",
      "Lower slowly without leaning back or allowing the band to snap the hands downward.",
    ],
  },
  {
    name: "Resistance Band Lateral Walk",
    description:
      "Sideways steps against a loop band while maintaining a slight squat.",
    category: "strength",
    muscleGroups: ["glutes", "abductors", "core"],
    equipment: ["resistance band"],
    instructions: [
      "Place a loop band above your knees or around your ankles and take a shallow squat stance.",
      "Keep your feet pointing forward and your pelvis level.",
      "Step sideways with the lead foot, then follow with the trailing foot without bringing the feet fully together.",
      "Continue along a clear path with controlled band tension, then travel back.",
    ],
    measurementType: "distance_time",
    baseXP: 10,
  },
  {
    name: "Resistance Band Monster Walk",
    description:
      "Diagonal forward or backward steps against a loop band from a shallow squat.",
    category: "strength",
    muscleGroups: ["glutes", "abductors", "quadriceps", "core"],
    equipment: ["resistance band"],
    instructions: [
      "Position a loop band above your knees or around your ankles and soften your knees.",
      "Brace and keep enough width between your feet to maintain band tension.",
      "Take short diagonal steps forward with alternating feet while keeping your hips level.",
      "Reverse with controlled backward steps, keeping the band from snapping your feet together.",
    ],
    measurementType: "distance_time",
    baseXP: 10,
  },
  {
    name: "Resistance Band Overhead Triceps Extension",
    description:
      "An overhead triceps extension using elastic resistance anchored low behind the body.",
    category: "strength",
    muscleGroups: ["triceps", "core"],
    equipment: ["resistance band"],
    measurementType: "reps",
    baseXP: 10,
    instructions: [
      "Secure the band low behind you and hold its ends behind the head in a stable staggered stance.",
      "Keep the elbows pointed upward as you extend them to raise the hands overhead.",
      "Bend the elbows slowly without flaring the ribs or allowing the band to snap backward.",
    ],
  },
  {
    name: "Resistance Band Pull-Apart",
    description:
      "A horizontal band pull that trains the rear shoulders and upper back by separating the hands.",
    category: "strength",
    muscleGroups: ["shoulders", "back"],
    equipment: ["resistance band"],
    measurementType: "reps",
    baseXP: 10,
    instructions: [
      "Hold a light band at chest height with arms nearly straight and hands spaced to create mild tension.",
      "Pull the hands apart until the band approaches the chest while keeping the shoulders away from the ears.",
      "Bring the hands together slowly without letting the band snap or arching the lower back.",
    ],
  },
  {
    name: "Resistance Band Romanian Deadlift",
    description: "A hip hinge against a long band anchored under the feet.",
    category: "strength",
    muscleGroups: ["hamstrings", "glutes", "back", "core"],
    equipment: ["resistance band"],
    instructions: [
      "Stand on the center of a long band and hold an end in each hand.",
      "Begin upright with soft knees and even tension on both sides.",
      "Push your hips backward while keeping your trunk controlled and hands close to your legs.",
      "Extend your hips to stand against the increasing band tension.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Resistance Band Shoulder Press",
    description:
      "A standing overhead press against a band secured beneath the feet.",
    category: "strength",
    muscleGroups: ["shoulders", "triceps", "core"],
    equipment: ["resistance band"],
    measurementType: "reps",
    baseXP: 10,
    instructions: [
      "Stand securely on the middle of the band and bring the handles to shoulder height.",
      "Press overhead with the abdomen braced and knees straight without leaning backward.",
      "Lower the hands beside the shoulders while preventing the band from pulling them down abruptly.",
    ],
  },
  {
    name: "Resistance Band Squat",
    description: "A squat with band resistance increasing as the legs extend.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["resistance band"],
    instructions: [
      "Stand securely on the middle of a long resistance band and hold its ends at shoulder level.",
      "Set your stance and keep the band evenly positioned under both feet.",
      "Lower into a controlled squat while maintaining tension in the band.",
      "Drive through your feet to stand and resist the band's pull throughout.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Resistance Band Triceps Pushdown",
    description:
      "An elbow-extension movement against a securely anchored overhead resistance band.",
    category: "strength",
    muscleGroups: ["triceps"],
    equipment: ["resistance band"],
    measurementType: "reps",
    baseXP: 10,
    instructions: [
      "Anchor the band overhead and hold its ends with the elbows tucked beside the torso.",
      "Straighten the elbows to move the hands downward without leaning on the band.",
      "Allow a controlled elbow bend on the return while keeping the upper arms still.",
    ],
  },
  {
    name: "Reverse Hack Squat Machine",
    description:
      "A squat facing the hack squat machine pad, allowing a hip-focused supported descent.",
    category: "strength",
    muscleGroups: ["glutes", "quadriceps", "hamstrings"],
    equipment: ["machine"],
    instructions: [
      "Face the machine pad and position your shoulders under the supports according to the machine design.",
      "Plant both feet on the platform, brace, and release the safety handles.",
      "Bend your hips and knees while maintaining contact with the pad.",
      "Drive through your feet to rise, then engage the machine's catches.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Reverse Hyperextension Machine",
    description:
      "A prone hip extension with the legs lifting a machine's suspended resistance.",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings", "back"],
    equipment: ["machine"],
    instructions: [
      "Position your torso on the machine pad and secure your feet in the designated strap or attachment.",
      "Hold the machine handles and brace your abdomen.",
      "Lift your legs by extending your hips until they align approximately with your torso.",
      "Lower the resistance smoothly without using a forceful pendulum swing.",
    ],
    measurementType: "weight_reps",
    baseXP: 15,
  },
  {
    name: "Reverse Pec Deck Fly",
    description:
      "A supported reverse-fly machine movement that loads the rear shoulders and upper back.",
    category: "strength",
    muscleGroups: ["shoulders", "back"],
    equipment: ["machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Face the machine pad and adjust the seat so the handles are near shoulder height.",
      "Move the handles outward and backward while keeping the chest in contact with the pad.",
      "Return slowly without bending the elbows substantially or craning the neck forward.",
    ],
  },
  {
    name: "Reverse-Grip Barbell Bench Press",
    description:
      "A bench press performed with palms facing toward the head to change the chest and triceps loading angle.",
    category: "strength",
    muscleGroups: ["chest", "triceps", "shoulders"],
    equipment: ["barbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 25,
    instructions: [
      "Use a light bar and a spotter to establish a comfortable underhand grip on the flat bench.",
      "Keep the wrists aligned with the forearms as the bar descends toward the lower chest.",
      "Press upward with elbows relatively close to the torso and return the bar securely to the rack.",
    ],
  },
  {
    name: "Reverse-Grip Barbell Curl",
    description:
      "An overhand barbell curl that emphasizes the forearms and brachialis while the biceps assist.",
    category: "strength",
    muscleGroups: ["forearms", "biceps"],
    equipment: ["barbell"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Hold a light barbell with palms facing downward and hands around shoulder width.",
      "Curl the bar while keeping wrists straight and elbows beside the torso.",
      "Lower slowly without leaning backward or allowing the wrists to fold under the weight.",
    ],
  },
  {
    name: "Reverse-Grip EZ-Bar Curl",
    description:
      "An overhand EZ-bar curl that trains the elbow flexors with an angled pronated grip.",
    category: "strength",
    muscleGroups: ["forearms", "biceps"],
    equipment: ["ez bar"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Grip the angled sections of the EZ bar with palms down and stand with a steady torso.",
      "Curl upward while keeping the elbows close to the ribs and wrists aligned with the forearms.",
      "Lower under control without shifting the shoulders forward or using hip momentum.",
    ],
  },
  {
    name: "Reverse-Grip Triceps Pushdown",
    description:
      "An underhand cable pushdown that trains elbow extension while the wrists maintain a palm-up grip.",
    category: "strength",
    muscleGroups: ["triceps", "forearms"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Take a light underhand grip on a high-pulley bar with elbows beside the torso.",
      "Extend the elbows to lower the bar while keeping the palms upward and wrists straight.",
      "Bend the elbows under control without allowing the upper arms to swing forward.",
    ],
  },
  {
    name: "Rope Cable Hammer Curl",
    description:
      "A neutral-grip cable curl using a rope attachment to train the biceps and forearms.",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Attach a rope to a low pulley and hold its ends with palms facing each other.",
      "Curl the rope upward while keeping the elbows close to the ribs and the trunk still.",
      "Lower under control without letting the wrists bend or the shoulders pull forward.",
    ],
  },
  {
    name: "Rope Triceps Pushdown",
    description:
      "A cable pushdown with a rope attachment that lets each hand follow an independent extension path.",
    category: "strength",
    muscleGroups: ["triceps"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Hold both rope ends from a high pulley with palms facing inward and elbows close to the torso.",
      "Extend the elbows and separate the rope ends slightly near the bottom without moving the upper arms.",
      "Return slowly to a comfortable elbow bend while keeping the torso steady.",
    ],
  },
  {
    name: "Sandbag Bear-Hug Carry",
    description:
      "A loaded walk hugging a sandbag tightly against the front of the torso.",
    category: "strength",
    muscleGroups: ["core", "back", "biceps", "glutes", "calves"],
    equipment: ["sandbag"],
    instructions: [
      "Lift the sandbag into a secure bear hug with it close to your chest and abdomen.",
      "Stand tall and brace before starting to move.",
      "Walk with controlled steps without allowing the bag to slide downward or pull you forward.",
      "Stop in balance and lower the bag with your hips and knees bent.",
    ],
    measurementType: "distance_time",
    baseXP: 20,
  },
  {
    name: "Sandbag Bear-Hug Squat",
    description: "A squat with a sandbag hugged against the chest and abdomen.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core", "back"],
    equipment: ["sandbag"],
    instructions: [
      "Lift the sandbag into a secure bear hug and keep it close to your torso.",
      "Set a stable stance and brace before lowering.",
      "Bend your hips and knees while keeping your shoulders above your hips as comfortably as possible.",
      "Stand through both feet and keep the bag from sliding away from you.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Sandbag Clean",
    description:
      "A floor lift bringing a sandbag into a front-held position at the chest.",
    category: "strength",
    muscleGroups: ["full body", "glutes", "quadriceps", "back", "core"],
    equipment: ["sandbag"],
    instructions: [
      "Grip the sandbag from a braced floor setup with it close to your feet.",
      "Use your legs and hips to raise it into a lap position and secure your grip.",
      "Extend your hips to bring the bag higher and receive it against your chest.",
      "Stand balanced and lower the bag in controlled stages to the floor.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Sandbag Deadlift",
    description:
      "A floor lift using a sandbag that requires a close grip and controlled leg drive.",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings", "quadriceps", "back", "core"],
    equipment: ["sandbag"],
    instructions: [
      "Place the sandbag between your feet and grasp its handles or a secure section of fabric.",
      "Bend your hips and knees, bring the bag close, and brace your trunk.",
      "Push through the floor to stand without letting the bag drift away.",
      "Lower the bag under control by bending your hips and knees.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Sandbag Shoulder Carry",
    description: "A loaded walk with a sandbag supported on one shoulder.",
    category: "strength",
    muscleGroups: ["core", "back", "glutes", "calves"],
    equipment: ["sandbag"],
    instructions: [
      "Place the sandbag securely on one shoulder and steady it with your hands.",
      "Brace and keep your shoulders and pelvis as level as the load allows.",
      "Walk along a clear path with short steps and a controlled torso.",
      "Stop, lower the bag safely, and switch shoulders as intended.",
    ],
    measurementType: "distance_time",
    baseXP: 20,
  },
  {
    name: "Sandbag Shoulder Reverse Lunge",
    description: "A reverse lunge with a sandbag supported on one shoulder.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core", "back"],
    equipment: ["sandbag"],
    instructions: [
      "Position the sandbag securely on one shoulder and stabilize it with your hands.",
      "Stand tall, brace against the offset load, and step one foot backward.",
      "Bend both knees with your hips forward and your lead foot planted.",
      "Push through the lead foot to return upright, then change the loaded side as needed.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Sandbag Shouldering",
    description:
      "A floor-to-shoulder lift that uses a lap position to control an awkward sandbag.",
    category: "strength",
    muscleGroups: ["full body", "glutes", "quadriceps", "back", "core"],
    equipment: ["sandbag"],
    instructions: [
      "Straddle the sandbag and grip it securely with your hips and knees bent.",
      "Lift the bag onto your thighs and reset your grip while keeping it close.",
      "Extend your hips and guide the bag onto one shoulder without twisting abruptly.",
      "Stand securely, then lower the bag under control before lifting to the other shoulder.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Seated Barbell Good Morning",
    description:
      "A seated hip hinge with a barbell on the upper back and both feet firmly planted.",
    category: "strength",
    muscleGroups: ["back", "hamstrings", "glutes", "core"],
    equipment: ["barbell", "bench"],
    instructions: [
      "Sit astride a stable bench with the bar across your upper back and your feet wide and grounded.",
      "Brace before hinging your torso forward between your thighs.",
      "Use a controlled range and keep the bar secure on your shoulders.",
      "Extend through your hips and trunk to return upright without swinging.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Seated Barbell Overhead Press",
    description:
      "A seated barbell shoulder press that uses bench support to reduce the balance demands of standing.",
    category: "strength",
    muscleGroups: ["shoulders", "triceps"],
    equipment: ["barbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Sit against a near-upright bench with feet planted and the bar held in front of the shoulders.",
      "Press the bar overhead while keeping the ribs down and the upper back supported.",
      "Lower in front of the face to a comfortable upper-chest position without flaring the wrists backward.",
    ],
  },
  {
    name: "Seated Barbell Reverse Wrist Curl",
    description:
      "A supported palm-down wrist curl that loads the forearm extensors.",
    category: "strength",
    muscleGroups: ["forearms"],
    equipment: ["barbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Rest the forearms on a bench or thighs with wrists beyond the edge and hold a light bar palms down.",
      "Lift the backs of the hands upward using only the wrists while keeping the elbows still.",
      "Lower slowly to a comfortable range without allowing the forearms to lift from their support.",
    ],
  },
  {
    name: "Seated Barbell Wrist Curl",
    description:
      "A supported palm-up wrist curl that trains the forearm flexors without moving the elbows.",
    category: "strength",
    muscleGroups: ["forearms"],
    equipment: ["barbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Sit with forearms supported on the thighs or a bench and hold the bar palms up with wrists beyond the edge.",
      "Lower the hands through a comfortable wrist extension while keeping the forearms supported.",
      "Curl the wrists upward without lifting the elbows or rolling the bar out of a secure grip.",
    ],
  },
  {
    name: "Seated Bent-Over Dumbbell Reverse Fly",
    description:
      "A reverse fly from a seated forward hinge that reduces leg movement while training the rear shoulders.",
    category: "strength",
    muscleGroups: ["shoulders", "back"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Sit near the front of a bench and lean forward from the hips with dumbbells below the knees.",
      "Raise the arms outward while keeping the chest angled toward the thighs and elbows softly bent.",
      "Lower with control without lifting the torso to generate momentum.",
    ],
  },
  {
    name: "Seated Cable Chest Press",
    description:
      "A seated chest press using cable handles for independent arm paths and continuous resistance.",
    category: "strength",
    muscleGroups: ["chest", "triceps", "shoulders"],
    equipment: ["cable machine", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Place a supported bench between chest-height pulleys and sit with the handles beside the chest.",
      "Press forward while keeping the upper back against the bench and forearms aligned with the handles.",
      "Return both handles evenly, avoiding an excessively deep shoulder stretch at the bottom.",
    ],
  },
  {
    name: "Seated Cable Shoulder Press",
    description:
      "An overhead shoulder press using low cable handles and an upright bench for torso support.",
    category: "strength",
    muscleGroups: ["shoulders", "triceps"],
    equipment: ["cable machine", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Place an upright bench between low pulleys and hold the handles beside the shoulders.",
      "Press overhead while keeping the forearms aligned with the cable tension and the back supported.",
      "Return slowly to shoulder height, keeping the cables clear of the arms and bench.",
    ],
  },
  {
    name: "Seated Calf Raise Machine",
    description:
      "A bent-knee calf raise with the machine pads supported on the thighs.",
    category: "strength",
    muscleGroups: ["calves"],
    equipment: ["machine"],
    instructions: [
      "Sit with the balls of your feet on the foot ledge and the thigh pads securely positioned.",
      "Release the start lever while keeping your knees bent.",
      "Lower your heels slowly, then press through your forefeet to raise the load.",
      "Return with control and replace the load on its support when finished.",
    ],
    measurementType: "weight_reps",
    baseXP: 15,
  },
  {
    name: "Seated Dip Machine",
    description:
      "A supported downward machine press that trains the triceps with assistance from the chest and shoulders.",
    category: "strength",
    muscleGroups: ["triceps", "chest", "shoulders"],
    equipment: ["machine"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Adjust the seat and handles so the elbows begin at a comfortable bent position beside the torso.",
      "Press the handles downward while keeping the back supported and shoulders controlled.",
      "Return slowly without allowing the elbows to travel excessively behind the body.",
    ],
  },
  {
    name: "Seated Dumbbell Lateral Raise",
    description:
      "A seated lateral raise that reduces leg momentum while loading the outer shoulders.",
    category: "strength",
    muscleGroups: ["shoulders"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Sit upright on a bench with dumbbells beside the hips and feet planted.",
      "Raise the upper arms out to the sides with softly bent elbows until they approach shoulder height.",
      "Lower the weights smoothly without rocking the torso or shrugging to finish the lift.",
    ],
  },
  {
    name: "Seated Dumbbell Shoulder Press",
    description:
      "A supported seated shoulder press that lets both dumbbells move through independent overhead paths.",
    category: "strength",
    muscleGroups: ["shoulders", "triceps"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Sit against a near-upright bench and hold the dumbbells beside the shoulders with feet grounded.",
      "Press the weights overhead along comfortable arcs without striking them together.",
      "Lower evenly to shoulder height while keeping the torso in contact with the backrest.",
    ],
  },
  {
    name: "Seated Leg Curl Machine",
    description:
      "A seated knee curl with the thighs secured beneath a restraint pad.",
    category: "strength",
    muscleGroups: ["hamstrings", "calves"],
    equipment: ["machine"],
    instructions: [
      "Adjust the seat, lower roller, and thigh restraint so your knees align with the pivot.",
      "Sit back, secure the restraint, and hold the handles.",
      "Bend your knees to pull the lower pad beneath the seat without lifting your hips.",
      "Extend your knees slowly to return the resistance.",
    ],
    measurementType: "weight_reps",
    baseXP: 15,
  },
  {
    name: "Seated Resistance Band Hip Abduction",
    description: "A seated outward knee press against a loop band.",
    category: "strength",
    muscleGroups: ["glutes", "abductors"],
    equipment: ["resistance band", "bench"],
    instructions: [
      "Sit on a stable bench with a loop band above your knees and both feet planted.",
      "Keep your pelvis steady and your knees aligned with your feet.",
      "Move both knees outward against the band without lifting your feet.",
      "Return slowly toward the starting width while maintaining band tension.",
    ],
    measurementType: "weight_reps",
    baseXP: 10,
  },
  {
    name: "Seated Resistance Band Row",
    description:
      "A seated band row that loads the back as the elbows travel toward the torso.",
    category: "strength",
    muscleGroups: ["back", "biceps"],
    equipment: ["resistance band"],
    measurementType: "reps",
    baseXP: 10,
    instructions: [
      "Sit upright facing a securely anchored low band with the legs comfortably bent.",
      "Pull the band handles toward the lower ribs without leaning backward.",
      "Extend the arms slowly while keeping tension in the band and the chest lifted.",
    ],
  },
  {
    name: "Side-Lying Incline Dumbbell Lateral Raise",
    description:
      "A side-lying raise on an incline bench that changes the resistance angle for the lateral shoulder.",
    category: "strength",
    muscleGroups: ["shoulders"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Lie sideways against an incline bench and hold a light dumbbell in the upper hand near the hip.",
      "Raise the arm away from the torso while keeping the elbow softly bent and the body supported.",
      "Lower slowly to the starting position and switch sides without changing the bench angle.",
    ],
  },
  {
    name: "Single-Arm Cable Chest Fly",
    description:
      "A one-arm cable fly that trains chest adduction while the torso resists turning toward the pulley.",
    category: "strength",
    muscleGroups: ["chest", "shoulders", "core"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Stand sideways to a chest-height pulley and hold the handle with the nearer arm extended outward.",
      "Sweep the handle across the chest with a gentle elbow bend while keeping the hips square.",
      "Return slowly to the starting stretch and complete equal repetitions on the opposite side.",
    ],
  },
  {
    name: "Single-Arm Cable Lateral Raise",
    description:
      "A lateral shoulder raise using a low cable to resist the arm as it moves outward.",
    category: "strength",
    muscleGroups: ["shoulders"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Stand sideways to a low pulley and hold the handle in the hand farther from the stack.",
      "Raise that arm out to the side toward shoulder height while keeping the trunk upright.",
      "Lower across the front of the body under control and repeat on the opposite side.",
    ],
  },
  {
    name: "Single-Arm Cable Triceps Pushdown",
    description:
      "A unilateral cable pushdown that lets each triceps work independently with a stable upper arm.",
    category: "strength",
    muscleGroups: ["triceps"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Face a high pulley and hold one handle with the elbow close to the ribs.",
      "Extend the elbow to bring the hand toward the thigh without moving the shoulder.",
      "Return to a comfortable elbow bend slowly and complete equal work on the other side.",
    ],
  },
  {
    name: "Single-Arm Dumbbell Bench Press",
    description:
      "A one-arm bench press that combines chest loading with resistance to torso rotation.",
    category: "strength",
    muscleGroups: ["chest", "triceps", "shoulders", "core"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Lie on a flat bench with one dumbbell above the chest and a wide, stable foot position.",
      "Lower the dumbbell beside the chest while keeping both shoulders and hips centered on the bench.",
      "Press upward without twisting, then complete the same controlled repetitions on the other side.",
    ],
  },
  {
    name: "Single-Arm Dumbbell Overhead Triceps Extension",
    description:
      "A unilateral overhead extension that trains each triceps with an independent elbow path.",
    category: "strength",
    muscleGroups: ["triceps", "core"],
    equipment: ["dumbbell"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Stand tall holding one light dumbbell overhead with the wrist straight and elbow pointing upward.",
      "Bend the elbow to lower the weight behind the head without leaning the torso sideways.",
      "Extend the elbow smoothly, then complete matching repetitions with the other arm.",
    ],
  },
  {
    name: "Single-Arm Dumbbell Preacher Curl",
    description:
      "A one-arm dumbbell curl supported on a preacher pad to limit upper-arm movement.",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Place the upper arm securely on a preacher pad with the armpit near its top edge.",
      "Curl the dumbbell upward while keeping the elbow and upper arm on the pad.",
      "Lower slowly without forcefully locking the elbow or letting the shoulder lift away.",
    ],
  },
  {
    name: "Single-Arm Dumbbell Reverse Wrist Curl",
    description:
      "A one-arm wrist extension exercise performed with the palm facing downward and the forearm supported.",
    category: "strength",
    muscleGroups: ["forearms"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Rest the working forearm on a bench or thigh with the palm down and the wrist beyond the edge.",
      "Raise the back of the hand while keeping the elbow and forearm stationary.",
      "Lower the light dumbbell slowly and repeat on the other side without forcing the wrist range.",
    ],
  },
  {
    name: "Single-Arm Dumbbell Row",
    description:
      "A supported one-arm dumbbell row that trains each side of the back independently.",
    category: "strength",
    muscleGroups: ["back", "biceps", "core"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Support one hand and knee on a bench while the other foot rests firmly on the floor.",
      "Pull the hanging dumbbell toward the hip with the elbow close to the torso.",
      "Lower to straight arms without twisting the rib cage upward, then switch sides.",
    ],
  },
  {
    name: "Single-Arm Dumbbell Shoulder Press",
    description:
      "A unilateral standing overhead press that adds trunk stabilization to shoulder and triceps loading.",
    category: "strength",
    muscleGroups: ["shoulders", "triceps", "core"],
    equipment: ["dumbbell"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Stand tall with one dumbbell beside the shoulder and feet set in a stable stance.",
      "Press overhead without leaning to the opposite side or using a knee dip.",
      "Lower beside the shoulder under control and perform matching repetitions on the other arm.",
    ],
  },
  {
    name: "Single-Arm Dumbbell Wrist Curl",
    description:
      "A supported one-arm palm-up wrist curl that isolates the forearm flexors.",
    category: "strength",
    muscleGroups: ["forearms"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Support the working forearm on a bench or thigh with the wrist free and palm facing upward.",
      "Lower the dumbbell through a small comfortable wrist range while keeping a secure grip.",
      "Curl the wrist upward without bending the elbow, then complete the same repetitions on the other arm.",
    ],
  },
  {
    name: "Single-Arm Kettlebell Clean",
    description:
      "A hip-driven lift bringing one kettlebell from a swing into the front rack.",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings", "back", "shoulders", "core"],
    equipment: ["kettlebell"],
    instructions: [
      "Hinge and hike the kettlebell between your legs with one hand.",
      "Extend your hips while keeping the bell's path close to your body.",
      "Guide your hand through the handle so the bell rolls softly around your forearm into the rack.",
      "Lower the bell back into a controlled backswing or park it before repeating.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Single-Arm Kettlebell Front-Rack Reverse Lunge",
    description:
      "A reverse lunge with a kettlebell held in one front rack position.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["kettlebell"],
    instructions: [
      "Rack the kettlebell against one forearm with your elbow close to your torso.",
      "Brace and step backward into a lunge while keeping the lead foot planted.",
      "Lower with your chest steady and your shoulders level against the offset load.",
      "Push through the lead foot to return, then repeat with the intended leg and rack side.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Single-Arm Kettlebell Overhead Squat",
    description:
      "A squat under a single overhead kettlebell that challenges unilateral overhead stability.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "shoulders", "core"],
    equipment: ["kettlebell"],
    instructions: [
      "Establish a stable overhead lockout with the kettlebell above one shoulder.",
      "Set your squat stance and keep your free arm available for balance.",
      "Lower slowly while keeping the loaded arm straight and the bell over your base.",
      "Stand from a controlled depth, then lower the bell safely before switching sides.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Single-Arm Kettlebell Row",
    description:
      "A one-arm kettlebell row that loads the back from a stable hinged stance.",
    category: "strength",
    muscleGroups: ["back", "biceps", "core"],
    equipment: ["kettlebell"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Take a staggered stance, hinge at the hips, and support the free hand on the front thigh.",
      "Pull the kettlebell toward the hip while keeping the shoulder and pelvis square.",
      "Lower the bell to a straight arm and repeat on the other side without using torso rotation.",
    ],
  },
  {
    name: "Single-Arm Kettlebell Strict Press",
    description:
      "A one-arm kettlebell press from the rack position that trains overhead strength without leg drive.",
    category: "strength",
    muscleGroups: ["shoulders", "triceps", "core"],
    equipment: ["kettlebell"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Hold the kettlebell in a comfortable rack with the wrist straight and the bell resting against the forearm.",
      "Brace the trunk and press overhead until the arm is straight without bending the knees.",
      "Bring the bell back to the rack slowly and repeat on the opposite arm.",
    ],
  },
  {
    name: "Single-Arm Kettlebell Swing",
    description:
      "A one-handed kettlebell swing that adds an offset loading challenge to the hip hinge.",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings", "core", "forearms"],
    equipment: ["kettlebell"],
    instructions: [
      "Hinge to grip the kettlebell with one hand and set your free arm for balance.",
      "Hike the bell between your thighs while keeping your shoulders and hips square.",
      "Drive through your hips to swing the bell forward with the loaded arm relaxed.",
      "Guide the bell back into the hinge without rotating your trunk, then park it safely.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Single-Arm Kneeling Cable Lat Pulldown",
    description:
      "A unilateral pulldown from a kneeling position that lets one shoulder move through an independent overhead pulling path.",
    category: "strength",
    muscleGroups: ["back", "biceps", "core"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Kneel facing a high pulley with one handle held overhead and the torso tall.",
      "Pull the elbow down toward the same-side hip while keeping the ribs over the pelvis.",
      "Reach overhead slowly without leaning to the side and repeat with the opposite arm.",
    ],
  },
  {
    name: "Single-Arm Landmine Row",
    description:
      "A one-arm row using the loaded end of a landmine barbell for a diagonal pulling path.",
    category: "strength",
    muscleGroups: ["back", "biceps", "core"],
    equipment: ["landmine", "barbell"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Stand beside the loaded end of the anchored bar and hinge with a staggered, stable stance.",
      "Grip the bar securely and pull toward the hip while keeping the shoulders facing the floor.",
      "Lower without rotating the torso and repeat the same position on the other side.",
    ],
  },
  {
    name: "Single-Arm Low Cable Biceps Curl",
    description:
      "A unilateral low-pulley curl that allows independent loading and control of each elbow flexor.",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Face a low pulley with one handle held in a palm-up grip and the elbow beside the torso.",
      "Curl the handle toward the shoulder without lifting the upper arm forward.",
      "Lower slowly to extended elbows and repeat on the other side using the same stance.",
    ],
  },
  {
    name: "Single-Arm Overhead Cable Triceps Extension",
    description:
      "A one-arm overhead cable extension that isolates elbow extension with continuous resistance.",
    category: "strength",
    muscleGroups: ["triceps", "core"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Face away from a low pulley with one handle held behind the head and the elbow pointed upward.",
      "Straighten the elbow without changing the upper-arm angle or leaning away from the cable.",
      "Return slowly to the bent-elbow position and repeat on the opposite arm.",
    ],
  },
  {
    name: "Single-Arm Seated Cable Row",
    description:
      "A one-arm seated cable row that lets each side of the back move and load independently.",
    category: "strength",
    muscleGroups: ["back", "biceps", "core"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Sit facing a low pulley with feet braced and one handle held at arm length.",
      "Pull the handle toward the hip while keeping the torso square to the cable.",
      "Extend the arm slowly and complete equal repetitions on both sides without twisting.",
    ],
  },
  {
    name: "Single-Arm Standing Cable Chest Press",
    description:
      "A unilateral cable chest press that challenges pressing strength and resistance to trunk rotation.",
    category: "strength",
    muscleGroups: ["chest", "triceps", "shoulders", "core"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Stand in a staggered stance with one chest-height cable handle beside the shoulder.",
      "Press the handle forward while keeping the sternum and pelvis facing straight ahead.",
      "Return without twisting toward the stack, then repeat the set with the other arm.",
    ],
  },
  {
    name: "Single-Arm Standing Cable Row",
    description:
      "A standing unilateral cable row that combines a back pull with resistance to trunk rotation.",
    category: "strength",
    muscleGroups: ["back", "biceps", "core"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Face a chest-height pulley with a staggered stance and one handle held in front of you.",
      "Pull the handle toward the side of the rib cage while keeping the pelvis square.",
      "Reach forward under control without turning toward the pulley, then switch arms.",
    ],
  },
  {
    name: "Single-Leg Leg Press",
    description: "A supported leg press using one leg at a time.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "hamstrings"],
    equipment: ["machine"],
    instructions: [
      "Adjust the seat and position one foot securely on the platform.",
      "Keep the unused leg clear and your pelvis evenly supported.",
      "Bend the working knee to lower the load through a controllable range.",
      "Press through the working foot to extend the leg and secure the machine before switching sides.",
    ],
    measurementType: "weight_reps",
    baseXP: 15,
  },
  {
    name: "Sled Push",
    description:
      "A forward drive of a weighted sled using the legs while the hands support the handles.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "calves", "core", "shoulders"],
    equipment: ["sled"],
    instructions: [
      "Load the sled securely and grip both handles with your arms steady.",
      "Lean forward from a braced trunk and place your feet where you can drive without slipping.",
      "Push through the ground with alternating short steps to move the sled forward.",
      "Maintain the sled's direction and slow to a controlled stop.",
    ],
    measurementType: "distance_time",
    baseXP: 20,
  },
  {
    name: "Smith Machine Bench Press",
    description:
      "A flat-bench press using the Smith machine guide rails to constrain the bar path.",
    category: "strength",
    muscleGroups: ["chest", "triceps", "shoulders"],
    equipment: ["smith machine", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Position a flat bench so the lowered bar reaches the lower chest and set the safety stops.",
      "Unhook the bar and lower it while keeping wrists above elbows and feet planted.",
      "Press along the rails without shifting the shoulders, then rotate the bar securely into the hooks.",
    ],
  },
  {
    name: "Smith Machine Bent-Over Row",
    description:
      "A bent-over row using Smith machine rails to guide the bar through a fixed pulling path.",
    category: "strength",
    muscleGroups: ["back", "biceps", "core"],
    equipment: ["smith machine"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Stand facing the bar, take an overhand grip, and establish a stable hip hinge.",
      "Unhook the bar and pull it toward the lower ribs while keeping the torso angle steady.",
      "Lower to straight arms and securely rehook the bar once the set is complete.",
    ],
  },
  {
    name: "Smith Machine Bulgarian Split Squat",
    description:
      "A rear-foot-elevated split squat beneath a guided Smith machine bar.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes"],
    equipment: ["smith machine", "bench"],
    instructions: [
      "Place a stable bench behind the machine and set its safety stops.",
      "Rest one rear foot on the bench and position the front foot to suit the rails.",
      "Unhook the bar and bend the front knee and hip to lower under control.",
      "Drive through the front foot to rise and secure the bar before changing legs.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Smith Machine Close-Grip Bench Press",
    description:
      "A guided narrow-grip bench press that loads the triceps through a fixed bar path.",
    category: "strength",
    muscleGroups: ["triceps", "chest", "shoulders"],
    equipment: ["smith machine", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Position a flat bench beneath the bar, set safety stops, and take a grip around shoulder width.",
      "Unhook and lower the bar toward the lower chest with elbows close to the torso.",
      "Press along the rails through elbow extension and rehook securely after the final repetition.",
    ],
  },
  {
    name: "Smith Machine Decline Bench Press",
    description:
      "A guided decline-bench press that targets the chest along a lower pressing angle.",
    category: "strength",
    muscleGroups: ["chest", "triceps", "shoulders"],
    equipment: ["smith machine", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Secure the legs in a decline bench positioned beneath the bar and set the machine safety stops.",
      "Unhook the bar and lower it toward the lower chest without losing shoulder support.",
      "Press upward along the guide rails and securely rehook the bar at the end of the set.",
    ],
  },
  {
    name: "Smith Machine Hip Thrust",
    description: "A hip thrust with the bar guided by Smith machine rails.",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings", "core"],
    equipment: ["smith machine", "bench"],
    instructions: [
      "Place a stable bench behind the bar and set the machine's safety stops.",
      "Rest your upper back on the bench and position the padded bar across your hips.",
      "Unhook the bar and drive through your planted feet to lift your hips.",
      "Lower with control, then rehook the bar before moving away.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Smith Machine Incline Bench Press",
    description:
      "An incline press on Smith machine rails that loads the upper chest through a fixed bar path.",
    category: "strength",
    muscleGroups: ["chest", "shoulders", "triceps"],
    equipment: ["smith machine", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Place an incline bench so the bar lowers toward the upper chest and set appropriate safety stops.",
      "Unhook and lower the bar with controlled elbows while keeping the back supported.",
      "Press along the rails to straighten the arms, then rehook the bar before leaving the bench.",
    ],
  },
  {
    name: "Smith Machine Reverse Lunge",
    description:
      "A reverse lunge performed under the guided Smith machine bar.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes"],
    equipment: ["smith machine"],
    instructions: [
      "Set the machine's safety stops and support the bar on your upper back.",
      "Unhook the bar from a stable stance suited to the rail direction.",
      "Step one foot back and bend both knees while the front foot remains grounded.",
      "Press through the front foot to return to standing and rehook when finished.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Smith Machine Romanian Deadlift",
    description:
      "A Romanian deadlift with the bar constrained to the Smith machine rails.",
    category: "strength",
    muscleGroups: ["hamstrings", "glutes", "back", "core"],
    equipment: ["smith machine"],
    instructions: [
      "Set the safety stops and grip the bar in front of your thighs.",
      "Unhook the bar, position your feet for the rail angle, and soften your knees.",
      "Hinge your hips back while lowering the bar close to your legs.",
      "Extend your hips to stand and rehook the bar after the final repetition.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Smith Machine Shoulder Press",
    description:
      "A seated overhead press that uses Smith machine rails to guide the bar in front of the head.",
    category: "strength",
    muscleGroups: ["shoulders", "triceps"],
    equipment: ["smith machine", "bench"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Position an upright bench so the bar lowers in front of the face and set the machine safety stops.",
      "Unhook the bar and press overhead with the back supported and wrists above the elbows.",
      "Lower to a comfortable front-shoulder position and securely rehook the bar after the set.",
    ],
  },
  {
    name: "Smith Machine Split Squat",
    description:
      "A stationary split squat with the load guided by Smith machine rails.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes"],
    equipment: ["smith machine"],
    instructions: [
      "Set the safety stops and position the bar across your upper back.",
      "Take a split stance aligned with the machine's bar path and unhook the bar.",
      "Bend both knees to lower with the front foot planted.",
      "Drive through the front foot to return upright, then rehook the bar.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Smith Machine Squat",
    description:
      "A squat performed beneath a guided bar with the feet positioned for the machine's fixed path.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["smith machine"],
    instructions: [
      "Set the safety stops, place the bar across your upper back, and position your feet for the rail angle.",
      "Unhook the bar, brace, and maintain firm contact through both feet.",
      "Bend your hips and knees to lower while following the guided bar path.",
      "Stand smoothly and rotate the bar back onto its hooks when finished.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Smith Machine Standing Calf Raise",
    description:
      "A standing calf raise with a guided bar and the forefeet on a raised support.",
    category: "strength",
    muscleGroups: ["calves", "core"],
    equipment: ["smith machine", "step"],
    instructions: [
      "Place a stable step under the Smith bar and set its safety stops.",
      "Support the bar on your upper back and place the balls of both feet on the step.",
      "Unhook the bar, lower your heels with control, and then rise onto your forefeet.",
      "Keep your knees steady and rehook the bar after the final repetition.",
    ],
    measurementType: "weight_reps",
    baseXP: 15,
  },
  {
    name: "Smith Machine Sumo Squat",
    description: "A wide-stance squat under the Smith machine bar.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "adductors"],
    equipment: ["smith machine"],
    instructions: [
      "Place the bar across your upper back and set the safety stops before unhooking it.",
      "Take a wide stance with your toes angled outward and feet positioned for the rails.",
      "Lower by bending your hips and knees while keeping the knees in line with the toes.",
      "Push through both feet to stand and rehook the bar securely.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Snatch-Grip Deadlift",
    description:
      "A deadlift using a wide snatch grip, increasing the pull distance and upper-back demand.",
    category: "strength",
    muscleGroups: ["hamstrings", "glutes", "quadriceps", "back", "core"],
    equipment: ["barbell"],
    instructions: [
      "Take a wide, secure grip with the bar over the middle of your feet.",
      "Bend your hips and knees until you can set a braced trunk and keep your shoulders above the bar.",
      "Push through the floor and stand with the bar close to your legs.",
      "Lower by hinging and bending the knees while maintaining your wide grip.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Standing Barbell Overhead Press",
    description:
      "A standing strict barbell press that trains the shoulders and triceps while the trunk maintains an upright position.",
    category: "strength",
    muscleGroups: ["shoulders", "triceps", "core"],
    equipment: ["barbell"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Hold the bar at the upper chest with hands just outside shoulder width and the elbows slightly forward.",
      "Brace the abdomen and press overhead without bending the knees or arching the lower back.",
      "Lower to the upper chest under control, moving the head slightly to clear the bar path.",
    ],
  },
  {
    name: "Standing Cable Chest Press",
    description:
      "A standing cable press that trains the chest while the trunk stabilizes against backward cable tension.",
    category: "strength",
    muscleGroups: ["chest", "triceps", "shoulders", "core"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Set two pulleys around chest height and step forward with a staggered stance and handles beside the chest.",
      "Brace the trunk and press both handles forward without letting the cables pull the shoulders backward.",
      "Return the handles slowly until the elbows reach a comfortable position beside the torso.",
    ],
  },
  {
    name: "Standing Cable Crunch",
    description:
      "A standing cable crunch that trains trunk flexion while the legs maintain a stable stance.",
    category: "strength",
    muscleGroups: ["core"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Face a high pulley with a rope beside the head, feet planted, and knees softly bent.",
      "Curl the upper torso downward by bringing the ribs toward the pelvis without turning the movement into a squat.",
      "Straighten the trunk under control while keeping the hands near the head and the hips steady.",
    ],
  },
  {
    name: "Standing Cable Hip Abduction",
    description:
      "A standing outward leg movement against cable resistance at the ankle.",
    category: "strength",
    muscleGroups: ["abductors", "glutes", "core"],
    equipment: ["cable machine"],
    instructions: [
      "Fasten an ankle cuff to the leg farther from a low pulley and stand sideways to the stack.",
      "Hold a stable support and keep your pelvis level.",
      "Move the cuffed leg outward without turning your trunk or leaning heavily.",
      "Bring the leg back under control, maintaining cable tension.",
    ],
    measurementType: "weight_reps",
    baseXP: 15,
  },
  {
    name: "Standing Cable Hip Adduction",
    description:
      "A standing inward leg movement against a low cable attached to the near ankle.",
    category: "strength",
    muscleGroups: ["adductors", "core"],
    equipment: ["cable machine"],
    instructions: [
      "Fasten the ankle cuff to the leg nearest a low pulley and stand sideways to the machine.",
      "Move the starting leg slightly toward the stack while holding a support for balance.",
      "Draw that leg inward across your midline without rotating your hips.",
      "Return slowly to the starting position and avoid swinging the weight.",
    ],
    measurementType: "weight_reps",
    baseXP: 15,
  },
  {
    name: "Standing Cable Row",
    description:
      "A standing two-hand cable row that trains the back while the trunk stabilizes the body against forward tension.",
    category: "strength",
    muscleGroups: ["back", "biceps", "core"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Set a pulley around lower-chest height and step back with knees soft and the handle at arm length.",
      "Brace the abdomen and pull the handle toward the ribs without leaning backward.",
      "Return to extended arms while keeping the feet planted and the torso upright.",
    ],
  },
  {
    name: "Standing Calf Raise Machine",
    description: "A standing ankle extension against shoulder-pad resistance.",
    category: "strength",
    muscleGroups: ["calves"],
    equipment: ["machine"],
    instructions: [
      "Set the shoulder pads and place the balls of your feet on the machine's foot ledge.",
      "Stand with your trunk firm and knees straight but relaxed.",
      "Lower your heels under control, then press through the forefeet to rise onto your toes.",
      "Pause with the ankles extended and lower without bouncing.",
    ],
    measurementType: "weight_reps",
    baseXP: 15,
  },
  {
    name: "Standing Dumbbell Shoulder Press",
    description:
      "A standing overhead press using independent dumbbells and a steady trunk position.",
    category: "strength",
    muscleGroups: ["shoulders", "triceps", "core"],
    equipment: ["dumbbell"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Stand with feet about hip width and dumbbells beside the shoulders with palms facing forward.",
      "Press both weights overhead without using the legs or leaning backward.",
      "Lower the dumbbells beside the shoulders while keeping the forearms aligned beneath the weights.",
    ],
  },
  {
    name: "Standing Leg Curl Machine",
    description:
      "A single-leg knee curl performed standing against a machine pad.",
    category: "strength",
    muscleGroups: ["hamstrings", "calves"],
    equipment: ["machine"],
    instructions: [
      "Adjust the machine so your working knee aligns with its pivot and the roller sits above your heel.",
      "Hold the handles and keep your thigh against the support.",
      "Bend the working knee to curl the heel upward without moving your hip.",
      "Lower the roller slowly and repeat before changing legs.",
    ],
    measurementType: "weight_reps",
    baseXP: 15,
  },
  {
    name: "Standing Resistance Band Row",
    description:
      "A standing band row that trains the back while the trunk holds a steady upright position.",
    category: "strength",
    muscleGroups: ["back", "biceps", "core"],
    equipment: ["resistance band"],
    measurementType: "reps",
    baseXP: 10,
    instructions: [
      "Anchor the band around chest height and step back until the arms are extended with light tension.",
      "Draw the hands toward the ribs with the elbows close to the body.",
      "Reach forward under control without allowing the band to pull the body off balance.",
    ],
  },
  {
    name: "Straight-Arm Cable Pulldown",
    description:
      "A nearly straight-arm cable pull that trains the lats by extending the shoulders toward the hips.",
    category: "strength",
    muscleGroups: ["back", "core"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Face a high pulley holding a bar or rope with softly bent elbows and a slight hip hinge.",
      "Sweep the hands toward the thighs without changing the elbow angle or rocking the torso.",
      "Raise the arms under control until the lats stretch, keeping the ribs from flaring upward.",
    ],
  },
  {
    name: "Straight-Bar Cable Biceps Curl",
    description:
      "A standing underhand cable curl that loads both biceps from a low pulley.",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Face a low pulley and grasp the straight bar with an underhand shoulder-width grip.",
      "Curl the handle upward with elbows beside the torso and wrists straight.",
      "Extend the elbows slowly without leaning backward or allowing the stack to slam.",
    ],
  },
  {
    name: "Straight-Bar Triceps Pushdown",
    description:
      "A high-cable triceps extension using an overhand bar grip and stationary upper arms.",
    category: "strength",
    muscleGroups: ["triceps"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Face a high pulley and grasp the straight bar with palms down and elbows beside the ribs.",
      "Extend the elbows to press the bar toward the thighs without pushing the shoulders forward.",
      "Let the elbows bend slowly while keeping the upper arms in place and the wrists straight.",
    ],
  },
  {
    name: "Trap Bar Deadlift",
    description:
      "A floor pull from inside a trap bar with the load positioned around the body.",
    category: "strength",
    muscleGroups: [
      "glutes",
      "quadriceps",
      "hamstrings",
      "back",
      "forearms",
      "core",
    ],
    equipment: ["trap bar"],
    instructions: [
      "Stand centered inside the trap bar and grip its lower handles evenly.",
      "Bend your hips and knees, brace, and keep your shoulders and hips set.",
      "Push through the floor to stand while keeping the handles level.",
      "Lower by bending your hips and knees until the bar rests on the floor.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Trap Bar Farmer Carry",
    description:
      "A loaded walk inside a trap bar with its handles held at the sides.",
    category: "strength",
    muscleGroups: ["forearms", "core", "back", "glutes", "calves"],
    equipment: ["trap bar"],
    instructions: [
      "Stand centered in the trap bar and lift it from a braced starting position.",
      "Keep the frame level and leave enough room for your legs to step freely.",
      "Walk with controlled strides while resisting sway of the frame.",
      "Come to a complete stop and lower the bar to the floor under control.",
    ],
    measurementType: "distance_time",
    baseXP: 20,
  },
  {
    name: "Trap Bar Romanian Deadlift",
    description: "A standing hip hinge with the trap bar held at the sides.",
    category: "strength",
    muscleGroups: ["hamstrings", "glutes", "back", "forearms", "core"],
    equipment: ["trap bar"],
    instructions: [
      "Lift the trap bar to a standing position and keep your knees slightly bent.",
      "Brace and send your hips backward while the handles travel downward beside you.",
      "Stop the descent before your trunk position changes or the frame touches the floor.",
      "Extend your hips to stand with the frame held level.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Trap Bar Shrug",
    description:
      "A shoulder shrug using a trap bar to place the load beside the body.",
    category: "strength",
    muscleGroups: ["back", "shoulders", "forearms"],
    equipment: ["trap bar"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Stand inside the trap bar and lift it to a tall position using a controlled setup.",
      "Keep the arms straight as you elevate the shoulders vertically toward the ears.",
      "Lower the shoulders without rolling them, then return the bar to the floor safely after the set.",
    ],
  },
  {
    name: "Two-Hand Dumbbell Overhead Triceps Extension",
    description:
      "An overhead elbow extension using one dumbbell held in both hands to train the triceps.",
    category: "strength",
    muscleGroups: ["triceps"],
    equipment: ["dumbbell", "bench"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Sit upright and hold one dumbbell securely above the head with both hands supporting its upper end.",
      "Bend the elbows to lower the dumbbell behind the head while keeping the ribs down.",
      "Straighten the elbows to lift the weight overhead without moving the upper arms excessively.",
    ],
  },
  {
    name: "Two-Hand Kettlebell Swing",
    description:
      "A ballistic hip hinge that swings one kettlebell to approximately chest height using hip drive.",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings", "core", "back"],
    equipment: ["kettlebell"],
    instructions: [
      "Set the kettlebell slightly ahead of your feet and hinge to grasp the handle with both hands.",
      "Hike the bell back between your thighs with your trunk braced.",
      "Extend your hips sharply to let the bell float forward while your arms guide rather than lift it.",
      "Allow the bell to return into a hip hinge and repeat, then park it on the floor under control.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Two-Hand Landmine Press",
    description:
      "A standing diagonal press with both hands on a landmine bar that trains the shoulders, upper chest, and triceps.",
    category: "strength",
    muscleGroups: ["shoulders", "chest", "triceps", "core"],
    equipment: ["landmine", "barbell"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Stand facing the anchored bar and hold its loaded end in both hands at upper-chest height.",
      "Press upward and forward while keeping the ribs stacked over the pelvis.",
      "Return the bar toward the chest without leaning backward or losing the secure two-hand grip.",
    ],
  },
  {
    name: "Underhand Barbell Bent-Over Row",
    description:
      "A bent-over barbell row using an underhand grip to emphasize a close elbow path and biceps assistance.",
    category: "strength",
    muscleGroups: ["back", "biceps", "core"],
    equipment: ["barbell"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Hinge into a stable rowing position with an underhand grip around shoulder width.",
      "Draw the bar toward the lower abdomen with the elbows traveling close to the sides.",
      "Extend the arms slowly while maintaining the hip hinge and avoiding wrist bending.",
    ],
  },
  {
    name: "Underhand Lat Pulldown",
    description:
      "A shoulder-width underhand pulldown that trains the back with substantial assistance from the biceps.",
    category: "strength",
    muscleGroups: ["back", "biceps"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Sit beneath the thigh pad and take an underhand grip on the bar around shoulder width.",
      "Pull toward the upper chest while keeping the elbows near the front of the torso.",
      "Raise the bar slowly to extended arms without swinging backward or bending the wrists sharply.",
    ],
  },
  {
    name: "Underhand Seated Cable Row",
    description:
      "A cable row with an underhand grip and close elbows that increases biceps involvement in the pull.",
    category: "strength",
    muscleGroups: ["back", "biceps"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Sit tall and hold a straight cable bar with palms upward around shoulder width.",
      "Draw the bar toward the lower abdomen with elbows close to the ribs.",
      "Release to extended arms under control without leaning backward to finish the repetition.",
    ],
  },
  {
    name: "Uneven Dumbbell Farmer Carry",
    description:
      "A loaded walk carrying different dumbbell loads in each hand to resist side-to-side imbalance.",
    category: "strength",
    muscleGroups: ["forearms", "core", "back", "glutes", "calves"],
    equipment: ["dumbbell"],
    instructions: [
      "Pick up the dumbbells from a braced position and note which hand holds the heavier load.",
      "Stand with your shoulders level and brace against the uneven resistance.",
      "Walk with short, controlled steps without leaning toward either side.",
      "Set both weights down safely and exchange sides for the intended work.",
    ],
    measurementType: "distance_time",
    baseXP: 20,
  },
  {
    name: "V-Squat Machine",
    description:
      "A supported squat with a lever machine carrying the load on shoulder pads.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes"],
    equipment: ["machine"],
    instructions: [
      "Set the safety position and place your shoulders under the pads with your back on the support.",
      "Plant your feet on the platform and disengage the handles.",
      "Bend your hips and knees to lower the machine's lever under control.",
      "Press through your feet to stand, then secure the lever with the handles.",
    ],
    measurementType: "weight_reps",
    baseXP: 20,
  },
  {
    name: "Weight Plate Front Raise",
    description:
      "A two-hand front raise that loads the anterior shoulders with a single weight plate.",
    category: "strength",
    muscleGroups: ["shoulders"],
    equipment: ["weight plate"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Grip the sides of a plate securely and hold it in front of the thighs.",
      "Lift the plate forward to about shoulder height while maintaining a small bend in the elbows.",
      "Lower slowly without arching the back or using a hip swing to restart the movement.",
    ],
  },
  {
    name: "Weight Plate Pinch Carry",
    description:
      "A loaded walk gripping weight plates by their flat faces or smooth edges.",
    category: "strength",
    muscleGroups: ["forearms", "core", "glutes", "calves"],
    equipment: ["weight plate"],
    instructions: [
      "Grip suitable plates firmly between your fingers and thumbs with your arms at your sides.",
      "Lift them clear of the floor and stand tall.",
      "Walk slowly along a clear path while keeping the plates from slipping or swinging.",
      "Stop and lower them carefully before releasing your pinch grip.",
    ],
    measurementType: "distance_time",
    baseXP: 15,
  },
  {
    name: "Weight Plate Pinch Hold",
    description:
      "A stationary grip exercise holding a plate or paired plates between the fingers and thumb.",
    category: "strength",
    muscleGroups: ["forearms"],
    equipment: ["weight plate"],
    instructions: [
      "Select plates you can securely pinch by their smooth faces or edges.",
      "Lift them with your fingers and thumb while keeping your wrist controlled.",
      "Hold them clear of the floor without curling them against your body.",
      "Lower the plates safely before opening your hand.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Weighted 45-Degree Back Extension",
    description:
      "A hip extension on an angled bench with a plate held against the chest.",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings", "back"],
    equipment: ["machine", "weight plate"],
    instructions: [
      "Adjust the hip pad so your hips can hinge freely and secure your feet.",
      "Hold a plate against your chest and maintain a firm trunk position.",
      "Hinge at your hips to lower your torso without rounding sharply.",
      "Extend your hips until your body forms a straight line, avoiding an exaggerated backward arch.",
    ],
    measurementType: "weight_reps",
    baseXP: 15,
  },
  {
    name: "Weighted Chest Dip",
    description:
      "A weighted parallel-bar dip with a modest forward torso angle to increase chest involvement.",
    category: "strength",
    muscleGroups: ["chest", "triceps", "shoulders"],
    equipment: ["dip bars", "weight vest"],
    measurementType: "weight_reps",
    baseXP: 25,
    instructions: [
      "Secure a weight vest, record its added load, and support yourself above the parallel bars.",
      "Lean slightly forward and lower under control until the shoulders reach a comfortable depth.",
      "Press back to support without bouncing or letting the elbows flare abruptly.",
    ],
  },
  {
    name: "Weighted Chin-Up",
    description:
      "An underhand pull-up with added vest load that trains the back and biceps together.",
    category: "strength",
    muscleGroups: ["back", "biceps", "forearms", "core"],
    equipment: ["pull-up bar", "weight vest"],
    measurementType: "weight_reps",
    baseXP: 25,
    instructions: [
      "Secure a fitted weight vest and record its added load before taking a shoulder-width underhand grip.",
      "Pull the chest upward until the chin clears the bar while keeping the legs quiet.",
      "Lower smoothly to comfortable elbow extension without dropping into the bottom position.",
    ],
  },
  {
    name: "Weighted Crunch",
    description:
      "A short-range abdominal curl with a weight plate held at the chest for added resistance.",
    category: "strength",
    muscleGroups: ["core"],
    equipment: ["weight plate"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Lie with knees bent and hold a plate securely across the chest, recording only the plate load.",
      "Curl the shoulder blades off the floor by bringing the ribs toward the pelvis without pulling on the neck.",
      "Lower the upper back slowly while keeping the plate against the chest and the lower torso steady.",
    ],
  },
  {
    name: "Weighted Neutral-Grip Pull-Up",
    description:
      "A weighted vertical pull using parallel handles so the palms face each other throughout the movement.",
    category: "strength",
    muscleGroups: ["back", "biceps", "forearms", "core"],
    equipment: ["pull-up bar", "weight vest"],
    measurementType: "weight_reps",
    baseXP: 25,
    instructions: [
      "Secure a weight vest, record its added load, and grip parallel pull-up handles with palms inward.",
      "Pull upward with elbows moving toward the ribs and no swinging of the legs.",
      "Lower under control until the arms are comfortably extended and repeat from a steady hang.",
    ],
  },
  {
    name: "Weighted Pistol Squat",
    description:
      "A single-leg squat with the free leg extended forward and a dumbbell held as a counterbalance.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["dumbbell"],
    instructions: [
      "Hold a light dumbbell close to your chest or slightly in front and balance on one foot.",
      "Extend the free leg forward and brace your trunk.",
      "Lower on the standing leg while keeping its heel down and using only a controllable range.",
      "Press through the standing foot to rise, keeping the free foot off the floor.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Weighted Plank",
    description:
      "A forearm plank with added vest resistance that increases the demand on trunk bracing.",
    category: "strength",
    muscleGroups: ["core", "shoulders"],
    equipment: ["weight vest"],
    measurementType: "duration",
    baseXP: 20,
    instructions: [
      "Secure a fitted weight vest and take a forearm plank with elbows beneath the shoulders.",
      "Brace the abdomen and keep the body aligned from head to heels without letting the hips sag.",
      "Time the stable hold and finish by lowering the knees before the body position breaks down.",
    ],
  },
  {
    name: "Weighted Pull-Up",
    description:
      "A pronated pull-up performed with added vest resistance to increase the back and arm strength demand.",
    category: "strength",
    muscleGroups: ["back", "biceps", "forearms", "core"],
    equipment: ["pull-up bar", "weight vest"],
    measurementType: "weight_reps",
    baseXP: 25,
    instructions: [
      "Secure a weight vest, record only its added load, and take an overhand grip slightly wider than shoulder width.",
      "Pull upward from a controlled hang until the chin clears the bar without kicking the legs.",
      "Lower to comfortable arm extension with the vest stable and the shoulders under control.",
    ],
  },
  {
    name: "Weighted Push-Up",
    description:
      "A push-up with added vest resistance that increases chest and triceps loading while the body stays aligned.",
    category: "strength",
    muscleGroups: ["chest", "triceps", "shoulders", "core"],
    equipment: ["weight vest"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Secure a fitted weight vest and record only its added load before taking a high plank position.",
      "Lower the chest between the hands while maintaining a straight line from head to heels.",
      "Press back to straight arms without sagging the hips or allowing the vest to shift.",
    ],
  },
  {
    name: "Weighted Russian Twist",
    description:
      "A seated trunk-rotation exercise using a medicine ball to add resistance across alternating sides.",
    category: "strength",
    muscleGroups: ["core"],
    equipment: ["medicine ball"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Sit with knees bent, heels grounded, and a medicine ball held near the chest; record only the ball load.",
      "Lean back slightly and rotate the rib cage to move the ball toward one hip while keeping the spine controlled.",
      "Return through center and turn toward the other hip without bouncing the ball or rushing the rotation.",
    ],
  },
  {
    name: "Weighted Side Plank",
    description:
      "A side plank with a fitted weight vest that increases lateral trunk-stability demand.",
    category: "strength",
    muscleGroups: ["core", "shoulders"],
    equipment: ["weight vest"],
    measurementType: "duration",
    baseXP: 20,
    instructions: [
      "Secure the vest and lie on one side with the supporting elbow beneath the shoulder and legs extended.",
      "Lift the hips until the body forms a straight line while keeping the vest stable and pelvis facing forward.",
      "Time the hold, lower under control, and complete the same stable position on the other side.",
    ],
  },
  {
    name: "Weighted Sit-Up",
    description:
      "A full sit-up with a plate held at the chest that loads abdominal and hip-flexor work.",
    category: "strength",
    muscleGroups: ["core", "hip flexors"],
    equipment: ["weight plate"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Lie with knees bent and a plate held securely against the chest, recording the added plate load.",
      "Curl upward and continue to a controlled seated position without throwing the plate forward.",
      "Lower gradually to the floor while keeping the plate stable and avoiding an abrupt backward drop.",
    ],
  },
  {
    name: "Weighted Skater Squat",
    description:
      "A loaded single-leg squat with the free leg bent behind the body.",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["dumbbell"],
    instructions: [
      "Hold a light dumbbell at your chest and stand on one foot.",
      "Bend the free knee behind you while keeping your hips facing forward.",
      "Lower on the standing leg as the free knee approaches the floor.",
      "Drive through the working foot to stand without pushing off the rear leg.",
    ],
    measurementType: "weight_reps",
    baseXP: 25,
  },
  {
    name: "Weighted Triceps Dip",
    description:
      "A weighted parallel-bar dip performed with a more upright torso to emphasize elbow extension.",
    category: "strength",
    muscleGroups: ["triceps", "chest", "shoulders"],
    equipment: ["dip bars", "weight vest"],
    measurementType: "weight_reps",
    baseXP: 25,
    instructions: [
      "Secure a weight vest, record only the added load, and support yourself above the bars.",
      "Keep the torso relatively upright as the elbows bend to a comfortable depth.",
      "Press back to straight arms without bouncing at the bottom or letting the shoulders roll forward.",
    ],
  },
  {
    name: "Weighted V-Up",
    description:
      "A V-up with a plate held in the hands that adds resistance to coordinated trunk and hip flexion.",
    category: "strength",
    muscleGroups: ["core", "hip flexors"],
    equipment: ["weight plate"],
    measurementType: "weight_reps",
    baseXP: 25,
    instructions: [
      "Lie on the back with legs extended and a light plate held above the chest; record only the added plate load.",
      "Raise the torso and legs together while reaching the plate toward the shins without jerking the neck.",
      "Lower both the torso and legs slowly and stop the set if a controlled return cannot be maintained.",
    ],
  },
  {
    name: "Wide-Grip Lat Pulldown",
    description:
      "A vertical cable pull with a wide overhand grip that loads the back through shoulder adduction.",
    category: "strength",
    muscleGroups: ["back", "biceps"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Adjust the thigh pad and grip the pulldown bar wider than shoulder width with palms forward.",
      "Pull the bar toward the upper chest while drawing the elbows down and keeping a small torso lean.",
      "Let the bar rise under control without swinging or pulling it behind the neck.",
    ],
  },
  {
    name: "Wide-Grip Seated Cable Row",
    description:
      "A seated cable row with a wide overhand grip that directs the elbows outward across the upper back.",
    category: "strength",
    muscleGroups: ["back", "shoulders", "biceps"],
    equipment: ["cable machine"],
    measurementType: "weight_reps",
    baseXP: 20,
    instructions: [
      "Sit upright with a wide overhand handle and feet secured on the cable-row platform.",
      "Pull the handle toward the upper abdomen with the elbows traveling outward.",
      "Return slowly to extended arms while preserving the upright torso and avoiding shoulder shrugging.",
    ],
  },
  {
    name: "Zottman Curl",
    description:
      "A dumbbell curl that combines a palm-up lifting phase with a palm-down lowering phase for biceps and forearm work.",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["dumbbell"],
    measurementType: "weight_reps",
    baseXP: 15,
    instructions: [
      "Stand with the dumbbells at the sides and curl them upward with palms facing up.",
      "At the top, rotate the forearms so the palms face downward while keeping the elbows still.",
      "Lower slowly in the overhand grip, then rotate back to palms up at the bottom.",
    ],
  },
  {
    name: "Ab Wheel Rollout",
    description:
      "A kneeling rollout that challenges the trunk against increasing leverage.",
    category: "bodyweight",
    muscleGroups: ["core", "shoulders", "back"],
    equipment: ["ab wheel", "exercise mat"],
    instructions: [
      "Kneel on padding and grip the wheel beneath your shoulders.",
      "Roll forward slowly while keeping your ribs down and hips from sagging.",
      "Pull the wheel back toward your knees before your lower back begins to arch.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Archer Pull-Up",
    description: "An advanced pull-up that shifts bodyweight toward one arm.",
    category: "bodyweight",
    muscleGroups: ["back", "biceps", "forearms", "core"],
    equipment: ["pull-up bar"],
    instructions: [
      "Hang with a wide overhand grip and brace your trunk.",
      "Pull toward one hand while allowing the opposite arm to stay comparatively straight.",
      "Lower to the center and alternate sides without jerking your body.",
    ],
    measurementType: "reps",
    baseXP: 25,
  },
  {
    name: "Archer Push-Up",
    description:
      "A side-to-side pushing exercise that shifts more weight onto one arm.",
    category: "bodyweight",
    muscleGroups: ["chest", "triceps", "shoulders", "core"],
    equipment: [],
    instructions: [
      "Take a wide hand position with your fingers turned slightly outward.",
      "Bend one elbow and move your chest toward that hand while the other arm stays long.",
      "Press back to the center and repeat on the other side.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Assisted Pistol Squat",
    description:
      "A single-leg squat using a fixed support to help balance and control.",
    category: "bodyweight",
    muscleGroups: ["quadriceps", "glutes", "hamstrings"],
    equipment: ["suspension trainer"],
    instructions: [
      "Hold suspension handles and balance on one leg with the other extended forward.",
      "Lower into a single-leg squat while using only enough arm assistance to stay controlled.",
      "Press through your standing foot and pull lightly on the handles to return.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Band-Assisted Pull-Up",
    description:
      "A pull-up with elastic assistance that reduces the lifting load.",
    category: "bodyweight",
    muscleGroups: ["back", "biceps", "forearms", "core"],
    equipment: ["pull-up bar", "resistance band"],
    instructions: [
      "Secure a resistance band around the bar and place one foot or knee in its lower loop.",
      "Hang with an overhand grip and pull your elbows down to raise your chin above the bar.",
      "Lower slowly and keep the band controlled when stepping out.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Bench Dip",
    description:
      "A triceps-focused dip performed with the hands behind the torso.",
    category: "bodyweight",
    muscleGroups: ["triceps", "shoulders", "chest"],
    equipment: ["bench"],
    instructions: [
      "Sit at the bench edge and place your palms beside your hips.",
      "Move your hips just off the edge and bend your elbows through a comfortable range.",
      "Push through your hands to rise, keeping your back close to the bench.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Bent-Knee Calf Raise",
    description:
      "A heel raise performed with the knees flexed to emphasize the soleus.",
    category: "bodyweight",
    muscleGroups: ["calves", "quadriceps"],
    equipment: ["wall"],
    instructions: [
      "Stand facing a wall and bend your knees slightly while keeping your torso upright.",
      "Raise your heels without straightening your knees.",
      "Lower the heels slowly and maintain the same knee angle throughout.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Bicycle Crunch",
    description:
      "An alternating trunk curl combining rotation with opposite leg extension.",
    category: "bodyweight",
    muscleGroups: ["core", "hip flexors"],
    equipment: [],
    instructions: [
      "Lie on your back with your hands lightly supporting your head.",
      "Extend one leg as you rotate your torso toward the opposite bent knee.",
      "Switch sides smoothly while keeping the movement controlled rather than pulling your neck.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Bird Dog",
    description:
      "A quadruped stability exercise that extends opposite limbs together.",
    category: "bodyweight",
    muscleGroups: ["core", "back", "glutes", "shoulders"],
    equipment: [],
    instructions: [
      "Begin on your hands and knees with your spine neutral.",
      "Reach one arm forward and the opposite leg backward without rotating your pelvis.",
      "Pause briefly, return under control, and switch sides.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Body Saw",
    description:
      "A sliding forearm plank that shifts the body forward and backward.",
    category: "bodyweight",
    muscleGroups: ["core", "shoulders", "back"],
    equipment: ["sliders"],
    instructions: [
      "Hold a forearm plank with your toes on sliders.",
      "Push your body backward a short distance while keeping your hips aligned.",
      "Pull forward to the starting position without losing abdominal tension.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Bodyweight Hip Thrust",
    description:
      "A bench-supported hip extension exercise performed without added weight.",
    category: "bodyweight",
    muscleGroups: ["glutes", "hamstrings", "core"],
    equipment: ["bench"],
    instructions: [
      "Rest your upper back against a stable bench with your knees bent and feet planted.",
      "Drive through your heels to lift your hips until your torso is roughly level.",
      "Lower your hips while keeping your chin gently tucked and your ribs controlled.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Bodyweight Russian Twist",
    description:
      "A seated trunk rotation exercise performed without external weight.",
    category: "bodyweight",
    muscleGroups: ["core", "hip flexors"],
    equipment: [],
    instructions: [
      "Sit with bent knees and lean your torso backward while keeping your chest lifted.",
      "Rotate your ribs to one side with your hands together in front.",
      "Turn to the opposite side without rounding your back or moving only your arms.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Bodyweight Single-Leg Romanian Deadlift",
    description:
      "An unloaded hip hinge that trains balance and posterior-chain control.",
    category: "bodyweight",
    muscleGroups: ["hamstrings", "glutes", "core"],
    equipment: [],
    instructions: [
      "Balance on one leg with a soft bend in the knee.",
      "Hinge at your hip and extend the free leg backward while keeping your hips square.",
      "Press through your standing foot to return upright without twisting.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Bodyweight Squat",
    description:
      "A foundational squat that develops lower-body strength without external weight.",
    category: "bodyweight",
    muscleGroups: ["quadriceps", "glutes", "hamstrings", "core"],
    equipment: [],
    instructions: [
      "Stand with your feet near shoulder width and turn your toes slightly outward.",
      "Sit down between your hips while keeping your heels grounded and knees aligned with your toes.",
      "Press through your feet to stand tall without locking your knees forcefully.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Bulgarian Split Squat",
    description:
      "A rear-foot-elevated split squat that emphasizes the front leg.",
    category: "bodyweight",
    muscleGroups: ["quadriceps", "glutes", "hamstrings"],
    equipment: ["bench"],
    instructions: [
      "Stand ahead of a stable bench and rest the top of one foot behind you.",
      "Bend your front knee and lower your rear knee while keeping your front heel grounded.",
      "Drive through the front foot to stand and complete both sides.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Chin-Up",
    description:
      "An underhand vertical pull that emphasizes the back and elbow flexors.",
    category: "bodyweight",
    muscleGroups: ["back", "biceps", "forearms", "core"],
    equipment: ["pull-up bar"],
    instructions: [
      "Grip a secure bar with your palms facing you and your hands near shoulder width.",
      "Pull your elbows toward your ribs until your chin rises above the bar.",
      "Lower smoothly to straight arms while keeping your legs quiet.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Clamshell",
    description:
      "A side-lying hip rotation exercise performed with bent knees.",
    category: "bodyweight",
    muscleGroups: ["glutes", "abductors"],
    equipment: [],
    instructions: [
      "Lie on your side with bent knees and your heels together.",
      "Keep your pelvis still as you open the top knee away from the lower knee.",
      "Close the knee slowly without rolling your torso backward.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Clapping Push-Up",
    description:
      "An explosive floor press with a brief hand clap between contacts.",
    category: "bodyweight",
    muscleGroups: ["chest", "triceps", "shoulders", "core"],
    equipment: [],
    instructions: [
      "Begin in a solid push-up position and lower your chest with control.",
      "Drive strongly through your hands so they leave the floor and clap briefly.",
      "Land on softened elbows, absorb the contact, and reset before repeating.",
    ],
    measurementType: "reps",
    baseXP: 25,
  },
  {
    name: "Commando Pull-Up",
    description:
      "A close-grip pull-up that alternates the head to either side of the bar.",
    category: "bodyweight",
    muscleGroups: ["back", "biceps", "forearms", "core"],
    equipment: ["pull-up bar"],
    instructions: [
      "Stand beneath the bar and grip it with one hand directly ahead of the other.",
      "Pull upward until your head passes beside the bar without twisting your hips.",
      "Lower fully and alternate the side of the bar on successive repetitions.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Copenhagen Plank",
    description:
      "A side-supported hold that emphasizes the upper leg's inner thigh.",
    category: "bodyweight",
    muscleGroups: ["adductors", "core", "shoulders"],
    equipment: ["bench"],
    instructions: [
      "Lie beside a stable bench and place your upper leg on it.",
      "Support yourself on your lower forearm and lift your hips and lower leg from the floor.",
      "Hold a straight torso, using a bent upper knee if the long-leg version is too demanding.",
    ],
    measurementType: "duration",
    baseXP: 20,
  },
  {
    name: "Cossack Squat",
    description:
      "A deep side-to-side squat emphasizing unilateral strength and hip range.",
    category: "bodyweight",
    muscleGroups: ["quadriceps", "glutes", "adductors", "hamstrings"],
    equipment: [],
    instructions: [
      "Take a wide stance and shift your hips toward one heel.",
      "Bend that knee deeply while keeping the other leg extended and allowing its toes to lift.",
      "Push through the bent leg to rise and move toward the opposite side.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Crunch",
    description: "A short-range trunk flexion exercise performed on the floor.",
    category: "bodyweight",
    muscleGroups: ["core"],
    equipment: [],
    instructions: [
      "Lie on your back with bent knees and your feet flat.",
      "Lift your shoulder blades by curling your ribs toward your pelvis.",
      "Lower slowly while keeping your hands light and avoiding a pull on your neck.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Curtsy Lunge",
    description: "A diagonal backward lunge that challenges hip control.",
    category: "bodyweight",
    muscleGroups: ["quadriceps", "glutes", "abductors"],
    equipment: [],
    instructions: [
      "Stand tall and step one foot diagonally behind the other.",
      "Bend both knees while keeping your front knee pointing in line with its foot.",
      "Push through the front leg to stand and alternate the crossing step.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Dead Bug",
    description:
      "A supine coordination drill that keeps the trunk stable as opposite limbs extend.",
    category: "bodyweight",
    muscleGroups: ["core", "hip flexors"],
    equipment: [],
    instructions: [
      "Lie on your back with your arms raised and your hips and knees bent to right angles.",
      "Extend one leg and the opposite arm slowly while keeping your ribs and pelvis steady.",
      "Return to the start and alternate sides without arching your lower back.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Dead Hang",
    description: "A hanging grip hold performed with the arms extended.",
    category: "bodyweight",
    muscleGroups: ["forearms", "back", "shoulders"],
    equipment: ["pull-up bar"],
    instructions: [
      "Grip a secure bar with both hands and lift your feet clear of the floor.",
      "Keep your arms extended and allow only a comfortable amount of shoulder elevation.",
      "Maintain a quiet body and place your feet down before your grip gives way.",
    ],
    measurementType: "duration",
    baseXP: 10,
  },
  {
    name: "Decline Push-Up",
    description:
      "A feet-elevated push-up that increases the load on the upper body.",
    category: "bodyweight",
    muscleGroups: ["chest", "triceps", "shoulders", "core"],
    equipment: ["bench"],
    instructions: [
      "Place your toes on a stable bench and your hands on the floor.",
      "Hold a straight body line as you lower your chest between your hands.",
      "Press upward with control and keep your neck aligned with your torso.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Diamond Push-Up",
    description:
      "A narrow-hand push-up that places greater emphasis on the triceps.",
    category: "bodyweight",
    muscleGroups: ["triceps", "chest", "shoulders", "core"],
    equipment: [],
    instructions: [
      "Form a small diamond with your thumbs and index fingers beneath your chest.",
      "Extend your legs and lower yourself with your elbows close to your torso.",
      "Press through both hands while keeping your hips from sagging.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Dive-Bomber Push-Up",
    description:
      "A sweeping push-up that reverses its curved path on the return.",
    category: "bodyweight",
    muscleGroups: ["chest", "shoulders", "triceps", "core"],
    equipment: [],
    instructions: [
      "Begin in a pike with your hands and feet spread for support.",
      "Lower your head and chest forward, then straighten your arms with your chest lifted.",
      "Reverse the sweep by bending your elbows and shifting your hips back into the pike.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Donkey Kick",
    description: "A quadruped hip extension that works one glute at a time.",
    category: "bodyweight",
    muscleGroups: ["glutes", "hamstrings", "core"],
    equipment: [],
    instructions: [
      "Start on your hands and knees with your spine neutral.",
      "Keep one knee bent and lift that thigh backward without arching your back.",
      "Lower to the starting position and repeat equally on both sides.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Dragon Flag",
    description:
      "An advanced lever exercise that lowers the body from shoulder support.",
    category: "bodyweight",
    muscleGroups: ["core", "glutes", "hip flexors"],
    equipment: ["bench"],
    instructions: [
      "Lie on a stable bench and grip securely behind your head.",
      "Lift your hips and legs together, keeping support on your upper back rather than your neck.",
      "Lower your straight body slowly and stop before your hips fold or your back arches.",
    ],
    measurementType: "reps",
    baseXP: 25,
  },
  {
    name: "Elevated Pike Push-Up",
    description: "A feet-elevated pike press that increases shoulder loading.",
    category: "bodyweight",
    muscleGroups: ["shoulders", "triceps", "core"],
    equipment: ["plyometric box"],
    instructions: [
      "Place your feet on a stable box and walk your hands toward it.",
      "Keep your hips high as you lower your head between and slightly ahead of your hands.",
      "Press to straight arms while maintaining your shoulders above your hands.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Fire Hydrant",
    description:
      "A quadruped hip abduction exercise with the working knee bent.",
    category: "bodyweight",
    muscleGroups: ["glutes", "abductors", "core"],
    equipment: [],
    instructions: [
      "Set your hands beneath your shoulders and knees beneath your hips.",
      "Lift one bent knee outward while keeping your pelvis facing the floor.",
      "Lower slowly and change sides after completing your repetitions.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Flexed-Arm Hang",
    description: "A static pulling hold maintained near the top of a chin-up.",
    category: "bodyweight",
    muscleGroups: ["back", "biceps", "forearms"],
    equipment: ["pull-up bar", "step"],
    instructions: [
      "Use a stable step to position your chin above a secure bar.",
      "Take an underhand grip and lift your feet while holding your elbows bent.",
      "Keep your shoulders down, then lower smoothly or return to the step.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Flutter Kick",
    description:
      "An alternating small leg movement performed with the trunk braced.",
    category: "bodyweight",
    muscleGroups: ["core", "hip flexors"],
    equipment: [],
    instructions: [
      "Lie on your back and raise both straight legs a short distance from the floor.",
      "Press your lower back gently downward and alternate small upward and downward leg kicks.",
      "Keep the movement controlled and raise your legs higher if your back arches.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Forearm Plank",
    description:
      "A forearm-supported trunk hold that resists spinal extension.",
    category: "bodyweight",
    muscleGroups: ["core", "shoulders", "glutes"],
    equipment: [],
    instructions: [
      "Place your elbows beneath your shoulders and extend your legs behind you.",
      "Brace your abdomen and squeeze your glutes to form a straight body line.",
      "Hold while breathing steadily and prevent your hips from sagging.",
    ],
    measurementType: "duration",
    baseXP: 10,
  },
  {
    name: "Forward Lunge",
    description:
      "A stepping lunge that loads the front leg while controlling forward motion.",
    category: "bodyweight",
    muscleGroups: ["quadriceps", "glutes", "hamstrings"],
    equipment: [],
    instructions: [
      "Stand tall and step one foot forward into a long stance.",
      "Lower your rear knee while keeping your front knee aligned over the foot.",
      "Push through the front foot to return to standing and alternate legs.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Frog Pump",
    description:
      "A hip extension exercise performed with the soles together and knees open.",
    category: "bodyweight",
    muscleGroups: ["glutes", "core"],
    equipment: [],
    instructions: [
      "Lie on your back and bring the soles of your feet together near your hips.",
      "Let your knees open outward and press through the outer edges of your feet.",
      "Lift and lower your hips while keeping your ribs relaxed.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Frog Stand",
    description:
      "A bent-arm balance with the knees supported on the upper arms.",
    category: "bodyweight",
    muscleGroups: ["shoulders", "triceps", "forearms", "core"],
    equipment: [],
    instructions: [
      "Squat and place your palms on the floor with your fingers spread.",
      "Rest your knees on your upper arms and shift your weight forward gradually.",
      "Lift your feet a small distance and hold while looking slightly ahead.",
    ],
    measurementType: "duration",
    baseXP: 20,
  },
  {
    name: "Glute Bridge",
    description:
      "A floor-based hip extension exercise driven through both feet.",
    category: "bodyweight",
    muscleGroups: ["glutes", "hamstrings", "core"],
    equipment: [],
    instructions: [
      "Lie on your back with bent knees and your feet flat near your hips.",
      "Press through your heels to lift your hips until your torso and thighs align.",
      "Lower slowly without arching your lower back at the top.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Hamstring Walkout",
    description:
      "A bridge-based exercise that lengthens the hamstrings by walking the heels away.",
    category: "bodyweight",
    muscleGroups: ["hamstrings", "glutes", "core"],
    equipment: [],
    instructions: [
      "Lift your hips into a glute bridge with your heels on the floor.",
      "Take small alternating heel steps away while keeping your hips raised.",
      "Walk your heels back toward your body and lower to reset.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Hand-Release Push-Up",
    description: "A floor press that briefly releases the hands at the bottom.",
    category: "bodyweight",
    muscleGroups: ["chest", "triceps", "shoulders", "core"],
    equipment: [],
    instructions: [
      "Start in a plank and lower your chest and thighs together to the floor.",
      "Lift both hands briefly while keeping your neck long.",
      "Replace your palms and press your entire body upward as one unit.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Hanging Knee Raise",
    description:
      "A hanging abdominal exercise that draws bent knees toward the torso.",
    category: "bodyweight",
    muscleGroups: ["core", "hip flexors", "forearms"],
    equipment: ["pull-up bar"],
    instructions: [
      "Hang from a secure bar and settle any swinging.",
      "Bend your knees and lift them toward your chest with a slight pelvic curl.",
      "Lower your legs slowly to the starting hang before repeating.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Hanging Leg Raise",
    description:
      "A straight-leg hanging lift that challenges abdominal and hip-flexor strength.",
    category: "bodyweight",
    muscleGroups: ["core", "hip flexors", "forearms"],
    equipment: ["pull-up bar"],
    instructions: [
      "Hang from a secure bar with your legs together and shoulders controlled.",
      "Raise your straight legs in front without swinging your torso.",
      "Lower smoothly and stop each repetition before momentum builds.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Hanging Windshield Wiper",
    description: "An advanced hanging rotation exercise with the legs raised.",
    category: "bodyweight",
    muscleGroups: ["core", "hip flexors", "forearms", "back"],
    equipment: ["pull-up bar"],
    instructions: [
      "Hang from a secure bar and raise your legs until your feet approach the bar.",
      "Rotate your raised legs to one side while maintaining a secure grip and controlled torso.",
      "Return through the center to the other side without dropping your legs.",
    ],
    measurementType: "reps",
    baseXP: 25,
  },
  {
    name: "Heel Touch",
    description: "A side-to-side abdominal curl that reaches toward each heel.",
    category: "bodyweight",
    muscleGroups: ["core"],
    equipment: [],
    instructions: [
      "Lie on your back with bent knees, feet flat, and arms beside you.",
      "Lift your shoulder blades slightly and reach one hand toward the same-side heel.",
      "Shift to the other heel without letting your shoulders drop between reaches.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "High Plank",
    description:
      "A straight-arm support hold that trains trunk and shoulder stability.",
    category: "bodyweight",
    muscleGroups: ["core", "shoulders", "triceps", "glutes"],
    equipment: [],
    instructions: [
      "Set your hands beneath your shoulders and step both feet backward.",
      "Press the floor away and align your head, shoulders, hips, and heels.",
      "Maintain the position without lifting your hips or holding your breath.",
    ],
    measurementType: "duration",
    baseXP: 10,
  },
  {
    name: "Hindu Push-Up",
    description:
      "A flowing push-up that moves from a pike into an arched press.",
    category: "bodyweight",
    muscleGroups: ["chest", "shoulders", "triceps", "core"],
    equipment: [],
    instructions: [
      "Start with wide feet, straight arms, and your hips raised.",
      "Bend your elbows and sweep your chest low between your hands into an upward-facing position.",
      "Lift your hips and return to the starting pike without reversing the low sweep.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Hindu Squat",
    description:
      "A rhythmic squat that uses coordinated arm movement and a heel rise.",
    category: "bodyweight",
    muscleGroups: ["quadriceps", "glutes", "calves"],
    equipment: [],
    instructions: [
      "Stand upright with your feet close to hip width and reach your arms forward.",
      "Bend your knees into a squat as your arms sweep down and your heels rise naturally.",
      "Stand smoothly and return your arms forward without bouncing at the bottom.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Hollow Body Hold",
    description:
      "A supine trunk hold with the limbs elevated and the lower back grounded.",
    category: "bodyweight",
    muscleGroups: ["core", "hip flexors"],
    equipment: [],
    instructions: [
      "Lie on your back and gently press your lower back toward the floor.",
      "Lift your shoulders and legs while reaching your arms overhead or beside your body.",
      "Hold without losing lower-back contact and bend your knees if needed.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Incline Push-Up",
    description:
      "An elevated-hand push-up that provides an accessible pressing angle.",
    category: "bodyweight",
    muscleGroups: ["chest", "triceps", "shoulders", "core"],
    equipment: ["bench"],
    instructions: [
      "Place your hands on a stable bench and walk your feet backward.",
      "Brace your abdomen and lower your chest toward the bench edge.",
      "Extend your elbows without letting your hips drop or your shoulders shrug.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Inverted Row",
    description:
      "A horizontal bodyweight pull performed beneath a secure low bar.",
    category: "bodyweight",
    muscleGroups: ["back", "biceps", "forearms", "core"],
    equipment: ["pull-up bar"],
    instructions: [
      "Position yourself beneath a secure low bar and grip it overhand.",
      "Keep your body straight as you pull your chest toward the bar.",
      "Extend your arms to lower without dropping your hips.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Knee Push-Up",
    description:
      "A push-up variation that reduces leverage by supporting the knees.",
    category: "bodyweight",
    muscleGroups: ["chest", "triceps", "shoulders", "core"],
    equipment: [],
    instructions: [
      "Set your hands beneath your shoulders and rest your knees on the floor.",
      "Maintain a straight line from your head through your hips to your knees.",
      "Bend your elbows to lower your chest, then press back up.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Knee Side Plank",
    description: "A shorter-lever side plank supported by the lower knee.",
    category: "bodyweight",
    muscleGroups: ["core", "shoulders", "abductors"],
    equipment: [],
    instructions: [
      "Lie on your side with your knees bent and your elbow beneath your shoulder.",
      "Lift your hips using your forearm and lower knee as supports.",
      "Keep your torso and thighs aligned while holding on each side.",
    ],
    measurementType: "duration",
    baseXP: 10,
  },
  {
    name: "L-Sit",
    description: "A straight-arm support hold with the legs extended in front.",
    category: "bodyweight",
    muscleGroups: ["triceps", "shoulders", "core", "hip flexors"],
    equipment: ["parallettes"],
    instructions: [
      "Grip stable parallettes and press down to lift your hips clear of the floor.",
      "Straighten your legs together in front while keeping your shoulders away from your ears.",
      "Hold the lifted position and lower your heels with control.",
    ],
    measurementType: "duration",
    baseXP: 25,
  },
  {
    name: "Lateral Lunge",
    description:
      "A sideways lunge that loads one leg and stretches the opposite inner thigh.",
    category: "bodyweight",
    muscleGroups: ["quadriceps", "glutes", "adductors"],
    equipment: [],
    instructions: [
      "Step one foot widely to the side while keeping both feet facing forward.",
      "Bend the stepping knee and sit your hips back as the other leg stays long.",
      "Push off the bent leg to return and repeat on the other side.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Lateral Step-Up",
    description: "A sideways ascent that trains the leg nearest a platform.",
    category: "bodyweight",
    muscleGroups: ["quadriceps", "glutes", "abductors"],
    equipment: ["step"],
    instructions: [
      "Stand beside a stable step and place your nearer foot fully on top.",
      "Drive through that leg to stand on the platform while keeping your pelvis level.",
      "Lower the outside foot to the floor and repeat before changing sides.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Long-Lever Plank",
    description:
      "A forearm plank with the elbows farther forward to increase trunk demand.",
    category: "bodyweight",
    muscleGroups: ["core", "shoulders", "glutes"],
    equipment: [],
    instructions: [
      "Begin in a forearm plank and move your elbows slightly ahead of your shoulders.",
      "Brace your abdomen and squeeze your glutes while maintaining a level pelvis.",
      "Hold only as long as you can prevent your lower back from arching.",
    ],
    measurementType: "duration",
    baseXP: 20,
  },
  {
    name: "Lying Leg Raise",
    description:
      "A supine abdominal exercise that lifts and lowers the legs together.",
    category: "bodyweight",
    muscleGroups: ["core", "hip flexors"],
    equipment: [],
    instructions: [
      "Lie on your back with your legs together and your arms beside you.",
      "Raise your legs toward vertical while keeping your lower back controlled.",
      "Lower slowly only as far as you can without arching your back.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Negative Pull-Up",
    description:
      "A controlled lowering drill that develops strength through the pull-up descent.",
    category: "bodyweight",
    muscleGroups: ["back", "biceps", "forearms"],
    equipment: ["pull-up bar", "step"],
    instructions: [
      "Use a stable step to begin with your chin above a secure bar.",
      "Remove your feet from the step and lower gradually by extending your elbows.",
      "Return to the step to reset rather than swinging into the next repetition.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Neutral-Grip Pull-Up",
    description:
      "A vertical pull using parallel handles with the palms facing inward.",
    category: "bodyweight",
    muscleGroups: ["back", "biceps", "forearms", "core"],
    equipment: ["pull-up bar"],
    instructions: [
      "Hang from secure parallel handles with your palms facing each other.",
      "Pull your shoulders down and bend your elbows to lift your chest toward the handles.",
      "Return slowly to full arm extension without losing your grip.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Nordic Curl",
    description:
      "An advanced kneeling hamstring exercise using a securely anchored lower leg.",
    category: "bodyweight",
    muscleGroups: ["hamstrings", "glutes", "core"],
    equipment: ["exercise mat"],
    instructions: [
      "Kneel on padding with your ankles securely held by an appropriate fixed support or partner.",
      "Keep your hips extended as you lower your straight torso forward slowly.",
      "Catch yourself with your hands when needed and use a light push to assist the return.",
    ],
    measurementType: "reps",
    baseXP: 25,
  },
  {
    name: "One-Arm Push-Up",
    description:
      "An advanced unilateral floor press demanding upper-body strength and anti-rotation control.",
    category: "bodyweight",
    muscleGroups: ["chest", "triceps", "shoulders", "core"],
    equipment: [],
    instructions: [
      "Place one hand beneath your chest and spread your feet for balance.",
      "Keep your free hand behind your back as you lower without twisting your hips.",
      "Press through the working hand and complete equal repetitions on each side.",
    ],
    measurementType: "reps",
    baseXP: 25,
  },
  {
    name: "Parallel Bar Dip",
    description:
      "A bodyweight press between parallel bars that trains the chest and triceps.",
    category: "bodyweight",
    muscleGroups: ["triceps", "chest", "shoulders"],
    equipment: ["dip bars"],
    instructions: [
      "Support yourself above the bars with straight arms and your shoulders lowered.",
      "Bend your elbows and descend only as far as you can control comfortably.",
      "Press the bars down to return to the top without swinging your legs.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Pike Push-Up",
    description:
      "A hips-high push-up that emphasizes vertical pressing through the shoulders.",
    category: "bodyweight",
    muscleGroups: ["shoulders", "triceps", "chest", "core"],
    equipment: [],
    instructions: [
      "Start with your hands on the floor and raise your hips into a pike.",
      "Bend your elbows and lower the top of your head toward the floor ahead of your hands.",
      "Push through your palms to return without collapsing your shoulders.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Pistol Squat",
    description:
      "An advanced single-leg squat with the free leg extended forward.",
    category: "bodyweight",
    muscleGroups: ["quadriceps", "glutes", "hamstrings", "core"],
    equipment: [],
    instructions: [
      "Balance on one leg and reach the other leg forward with your arms extended.",
      "Sit toward your supporting heel while keeping the free foot off the floor.",
      "Press through the supporting foot to stand and repeat on both legs.",
    ],
    measurementType: "reps",
    baseXP: 25,
  },
  {
    name: "Plank Shoulder Tap",
    description:
      "A high-plank exercise that alternates hand lifts while resisting rotation.",
    category: "bodyweight",
    muscleGroups: ["core", "shoulders", "triceps"],
    equipment: [],
    instructions: [
      "Take a high plank with your feet wider than hip width.",
      "Lift one hand to touch the opposite shoulder without turning your hips.",
      "Replace the hand and alternate taps at a controlled pace.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Plank Up-Down",
    description:
      "A trunk stability exercise alternating forearm and straight-arm support.",
    category: "bodyweight",
    muscleGroups: ["core", "shoulders", "triceps"],
    equipment: [],
    instructions: [
      "Start in a forearm plank with your feet set apart for balance.",
      "Place one palm and then the other on the floor to rise into a high plank.",
      "Lower one forearm at a time and alternate the leading arm between repetitions.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Prone Back Extension",
    description:
      "A floor-based torso lift that trains the spinal extensor muscles.",
    category: "bodyweight",
    muscleGroups: ["back", "glutes"],
    equipment: [],
    instructions: [
      "Lie face down with your arms alongside your body and your gaze toward the floor.",
      "Lift your chest a small distance while keeping your legs grounded.",
      "Lower slowly without throwing your head backward.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Prone Cobra Hold",
    description:
      "A prone upper-back hold with the chest lifted and arms reaching backward.",
    category: "bodyweight",
    muscleGroups: ["back", "shoulders", "glutes"],
    equipment: [],
    instructions: [
      "Lie face down with your arms beside your body and your palms facing inward.",
      "Lift your chest slightly and rotate your thumbs outward while reaching your hands toward your heels.",
      "Hold with a long neck, then relax gradually to the floor.",
    ],
    measurementType: "duration",
    baseXP: 10,
  },
  {
    name: "Prone T Raise",
    description:
      "A prone arm lift with the arms extended sideways at shoulder height.",
    category: "bodyweight",
    muscleGroups: ["back", "shoulders"],
    equipment: [],
    instructions: [
      "Lie face down with your arms spread into a T and your thumbs turned upward.",
      "Lift both arms while gently drawing your shoulder blades together.",
      "Lower under control and keep your chest from pushing upward.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Prone W Raise",
    description:
      "A prone shoulder exercise performed with bent elbows forming a W.",
    category: "bodyweight",
    muscleGroups: ["back", "shoulders"],
    equipment: [],
    instructions: [
      "Lie face down and bend your elbows into a W beside your shoulders.",
      "Lift your forearms and elbows slightly while pulling your shoulder blades down and together.",
      "Lower smoothly without shrugging or extending your neck.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Prone Y Raise",
    description: "A prone arm lift with the arms angled diagonally overhead.",
    category: "bodyweight",
    muscleGroups: ["back", "shoulders"],
    equipment: [],
    instructions: [
      "Lie face down and arrange your arms in a wide Y with your thumbs pointing up.",
      "Draw your shoulder blades down and lift your arms a small distance.",
      "Lower slowly without lifting your head or arching your back.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Pseudo Planche Push-Up",
    description:
      "A forward-leaning push-up that increases shoulder and triceps demands.",
    category: "bodyweight",
    muscleGroups: ["shoulders", "chest", "triceps", "core"],
    equipment: [],
    instructions: [
      "Place your hands near your waist with your fingers turned slightly outward.",
      "Lean your shoulders ahead of your wrists while maintaining a rigid plank.",
      "Bend your elbows to lower, then press up while preserving the forward lean.",
    ],
    measurementType: "reps",
    baseXP: 25,
  },
  {
    name: "Pull-Up",
    description: "An overhand vertical pull that lifts the body toward a bar.",
    category: "bodyweight",
    muscleGroups: ["back", "biceps", "forearms", "core"],
    equipment: ["pull-up bar"],
    instructions: [
      "Hang from a secure bar with an overhand grip slightly wider than your shoulders.",
      "Draw your elbows down and lift your chest until your chin clears the bar.",
      "Lower to an extended-arm hang without swinging or dropping suddenly.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Push-Up",
    description:
      "A floor press that trains the chest, triceps, and trunk together.",
    category: "bodyweight",
    muscleGroups: ["chest", "triceps", "shoulders", "core"],
    equipment: [],
    instructions: [
      "Place your hands slightly wider than your shoulders and extend your legs.",
      "Lower your chest toward the floor with your elbows angled back.",
      "Press the floor away while keeping your hips aligned with your shoulders.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Reverse Crunch",
    description:
      "A floor-based abdominal curl that lifts the pelvis toward the rib cage.",
    category: "bodyweight",
    muscleGroups: ["core", "hip flexors"],
    equipment: [],
    instructions: [
      "Lie on your back with your knees bent above your hips.",
      "Curl your pelvis upward to bring your knees slightly toward your chest.",
      "Lower your hips gently without swinging your legs for momentum.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Reverse Lunge",
    description:
      "A backward-stepping lunge that emphasizes controlled single-leg loading.",
    category: "bodyweight",
    muscleGroups: ["quadriceps", "glutes", "hamstrings"],
    equipment: [],
    instructions: [
      "Stand upright and step one foot backward onto the ball of that foot.",
      "Bend both knees while keeping most of your weight over the front leg.",
      "Drive through your front foot to return and alternate sides.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Reverse Nordic Curl",
    description:
      "A kneeling quadriceps exercise that lowers a straight torso backward.",
    category: "bodyweight",
    muscleGroups: ["quadriceps", "core"],
    equipment: ["exercise mat"],
    instructions: [
      "Kneel on padding with your thighs upright and your hips fully extended.",
      "Lean your torso backward from your knees while keeping your hips from folding.",
      "Use your quadriceps to return upright within a controlled range.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Reverse Plank",
    description:
      "A face-up straight-arm hold that trains the posterior chain and shoulders.",
    category: "bodyweight",
    muscleGroups: ["glutes", "hamstrings", "core", "shoulders"],
    equipment: [],
    instructions: [
      "Sit with your legs extended and place your hands behind your hips.",
      "Press through your palms and heels to lift your hips until your body forms a line.",
      "Keep your chest open and lower your hips smoothly after the hold.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Reverse Snow Angel",
    description:
      "A prone sweeping arm exercise that trains the upper back and shoulders.",
    category: "bodyweight",
    muscleGroups: ["back", "shoulders"],
    equipment: [],
    instructions: [
      "Lie face down with your arms beside your hips and palms facing down.",
      "Lift your hands slightly and sweep your straight arms outward toward an overhead position.",
      "Return along the same path while keeping your ribs and forehead near the floor.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Ring Archer Row",
    description:
      "A horizontal row that shifts more pulling work toward one arm.",
    category: "bodyweight",
    muscleGroups: ["back", "biceps", "forearms", "core"],
    equipment: ["gymnastic rings"],
    instructions: [
      "Lean back beneath rings with your body braced and your arms extended.",
      "Pull toward one ring while extending the opposite arm out to the side.",
      "Lower to the middle and alternate sides without rotating your hips.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Ring Dip",
    description:
      "A dip on free-moving rings that challenges upper-body strength and stability.",
    category: "bodyweight",
    muscleGroups: ["triceps", "chest", "shoulders", "core"],
    equipment: ["gymnastic rings"],
    instructions: [
      "Hold yourself above the rings with straight arms and the rings near your hips.",
      "Lower under control while keeping your elbows close and the rings steady.",
      "Press back to support without flaring the rings or swinging your body.",
    ],
    measurementType: "reps",
    baseXP: 25,
  },
  {
    name: "Ring Push-Up",
    description:
      "A suspended push-up that requires control of independently moving handles.",
    category: "bodyweight",
    muscleGroups: ["chest", "triceps", "shoulders", "core"],
    equipment: ["gymnastic rings"],
    instructions: [
      "Set rings near the floor and take a plank position with a neutral grip.",
      "Lower your chest between the rings while keeping them close to your sides.",
      "Press to straight arms without allowing the rings to swing outward.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Ring Row",
    description:
      "A bodyweight horizontal pull using independently moving gymnastic rings.",
    category: "bodyweight",
    muscleGroups: ["back", "biceps", "forearms", "core"],
    equipment: ["gymnastic rings"],
    instructions: [
      "Set the rings at a suitable height and lean back with your heels grounded.",
      "Pull your ribs toward the rings while maintaining a straight body line.",
      "Extend your arms slowly and prevent the rings from drifting apart.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "RKC Plank",
    description:
      "A high-tension forearm plank using deliberate whole-body bracing.",
    category: "bodyweight",
    muscleGroups: ["core", "glutes", "shoulders"],
    equipment: [],
    instructions: [
      "Set up in a forearm plank with your elbows beneath your shoulders.",
      "Squeeze your glutes and thighs while drawing your elbows and toes toward each other without moving them.",
      "Maintain strong tension and steady breaths for a short controlled hold.",
    ],
    measurementType: "duration",
    baseXP: 20,
  },
  {
    name: "Scapular Dip",
    description:
      "A straight-arm support exercise that moves the shoulders without elbow bending.",
    category: "bodyweight",
    muscleGroups: ["shoulders", "triceps"],
    equipment: ["dip bars"],
    instructions: [
      "Support your weight on parallel bars with locked elbows and quiet legs.",
      "Let your shoulders rise slightly toward your ears while your arms remain straight.",
      "Push the bars downward to lower your shoulders and lift your torso.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Scapular Pull-Up",
    description:
      "A straight-arm hanging pull that trains shoulder-blade control.",
    category: "bodyweight",
    muscleGroups: ["back", "shoulders", "forearms"],
    equipment: ["pull-up bar"],
    instructions: [
      "Hang from a secure bar with your elbows fully extended.",
      "Pull your shoulders away from your ears to lift your torso slightly.",
      "Return to the relaxed shoulder position while keeping your arms straight.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Scapular Push-Up",
    description:
      "A straight-arm exercise that trains movement of the shoulder blades.",
    category: "bodyweight",
    muscleGroups: ["shoulders", "chest", "core"],
    equipment: [],
    instructions: [
      "Hold a high plank with straight elbows and a braced abdomen.",
      "Let your chest sink slightly as your shoulder blades move toward each other.",
      "Push the floor away to spread your shoulder blades without bending your arms.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Scissor Kick",
    description:
      "A supine alternating leg-crossing exercise that challenges the lower trunk.",
    category: "bodyweight",
    muscleGroups: ["core", "hip flexors", "adductors"],
    equipment: [],
    instructions: [
      "Lie on your back with your legs extended and lifted.",
      "Open your legs slightly, then cross one over the other.",
      "Alternate the crossing leg while maintaining a steady pelvis and controlled breathing.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Seated Knee Tuck",
    description:
      "A seated abdominal exercise that brings the knees and chest together.",
    category: "bodyweight",
    muscleGroups: ["core", "hip flexors"],
    equipment: [],
    instructions: [
      "Sit on the floor with your hands beside or slightly behind your hips.",
      "Lean back and lift your feet while maintaining a long spine.",
      "Draw your knees toward your chest, then extend your legs with control.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Shrimp Squat",
    description:
      "A single-leg squat performed with the free leg bent behind the body.",
    category: "bodyweight",
    muscleGroups: ["quadriceps", "glutes", "hamstrings", "core"],
    equipment: [],
    instructions: [
      "Balance on one leg and bend your other knee behind you, holding that foot if comfortable.",
      "Lean forward slightly and lower the rear knee toward the floor.",
      "Drive through your planted foot to stand without letting the rear foot assist.",
    ],
    measurementType: "reps",
    baseXP: 25,
  },
  {
    name: "Side Plank",
    description:
      "A side-supported trunk hold that challenges lateral stability.",
    category: "bodyweight",
    muscleGroups: ["core", "shoulders", "abductors"],
    equipment: [],
    instructions: [
      "Lie on your side and place your elbow directly beneath your shoulder.",
      "Stack or stagger your feet and lift your hips to create a straight body line.",
      "Hold with your pelvis facing forward and repeat on both sides.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Side Plank Hip Lift",
    description: "A dynamic side plank that raises and lowers the pelvis.",
    category: "bodyweight",
    muscleGroups: ["core", "shoulders", "abductors"],
    equipment: [],
    instructions: [
      "Set up on one forearm with your feet stacked or staggered.",
      "Lower your hips a small distance toward the floor without rolling your chest.",
      "Lift your hips back into alignment and complete both sides.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Side Plank Reach-Through",
    description:
      "A side plank with controlled torso rotation under the supporting arm.",
    category: "bodyweight",
    muscleGroups: ["core", "shoulders"],
    equipment: [],
    instructions: [
      "Hold a side plank and reach your top arm upward.",
      "Rotate your chest toward the floor and reach your top hand beneath your torso.",
      "Open back to the starting position while keeping your hips lifted.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Side-Lying Hip Abduction",
    description: "A straight-leg side lift that trains the outer hip muscles.",
    category: "bodyweight",
    muscleGroups: ["abductors", "glutes"],
    equipment: [],
    instructions: [
      "Lie on your side with your lower knee bent and your upper leg straight.",
      "Lift the upper leg while keeping its toes facing forward and your pelvis stacked.",
      "Lower with control without letting your waist collapse.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Single-Leg Calf Raise",
    description: "A unilateral heel raise that increases the load on one calf.",
    category: "bodyweight",
    muscleGroups: ["calves"],
    equipment: ["wall"],
    instructions: [
      "Stand on one foot and touch a wall lightly for balance.",
      "Lift your heel as high as you can while keeping pressure through the ball of your foot.",
      "Lower smoothly and complete both sides without pushing through your hand.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Single-Leg Glute Bridge",
    description:
      "A one-legged bridge that increases the demand on the supporting hip.",
    category: "bodyweight",
    muscleGroups: ["glutes", "hamstrings", "core"],
    equipment: [],
    instructions: [
      "Lie on your back with one foot planted and the other leg lifted.",
      "Press through the planted heel to raise your hips while keeping your pelvis level.",
      "Lower under control and complete the same number of repetitions on each side.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Single-Leg Hip Thrust",
    description: "A unilateral bench-supported hip extension exercise.",
    category: "bodyweight",
    muscleGroups: ["glutes", "hamstrings", "core"],
    equipment: ["bench"],
    instructions: [
      "Place your upper back against a stable bench and lift one foot.",
      "Drive through the grounded heel to extend your hip with your pelvis level.",
      "Lower smoothly and complete equal repetitions on both sides.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Single-Leg Sit-to-Stand",
    description:
      "A one-legged chair rise that develops squat strength through a fixed range.",
    category: "bodyweight",
    muscleGroups: ["quadriceps", "glutes", "hamstrings"],
    equipment: ["chair"],
    instructions: [
      "Sit near the front of a stable chair with one foot planted.",
      "Extend the other leg slightly and lean your torso forward over the planted foot.",
      "Stand on that leg, then sit back down slowly and change sides.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Single-Leg Wall Sit",
    description: "A unilateral wall-supported squat hold with one foot lifted.",
    category: "bodyweight",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: ["wall"],
    instructions: [
      "Set up in a wall sit with your feet firmly planted.",
      "Shift weight to one leg and extend the other foot a small distance off the floor.",
      "Keep your hips level while holding, then replace the foot and change sides.",
    ],
    measurementType: "duration",
    baseXP: 20,
  },
  {
    name: "Sissy Squat",
    description:
      "A knee-dominant bodyweight squat performed with a backward torso lean.",
    category: "bodyweight",
    muscleGroups: ["quadriceps", "core"],
    equipment: ["wall"],
    instructions: [
      "Stand beside a wall for light balance support and rise onto your forefeet.",
      "Bend your knees forward while leaning your straight torso backward through a controlled range.",
      "Straighten your knees to return without folding at your hips.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Sit-Up",
    description:
      "A floor-based exercise that raises the torso from lying to seated.",
    category: "bodyweight",
    muscleGroups: ["core", "hip flexors"],
    equipment: [],
    instructions: [
      "Lie on your back with bent knees and your feet grounded.",
      "Brace your abdomen and raise your torso toward your thighs without jerking your arms.",
      "Lower slowly until your back returns to the floor.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Skater Squat",
    description:
      "A single-leg squat with the free knee reaching backward toward the floor.",
    category: "bodyweight",
    muscleGroups: ["quadriceps", "glutes", "hamstrings", "abductors"],
    equipment: [],
    instructions: [
      "Stand on one leg and bend the other knee behind your body.",
      "Reach your arms forward as you lower your rear knee toward the floor.",
      "Press through the standing foot to rise while keeping your pelvis level.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Sliding Leg Curl",
    description: "A floor-based hamstring curl using sliding heels.",
    category: "bodyweight",
    muscleGroups: ["hamstrings", "glutes", "core"],
    equipment: ["sliders"],
    instructions: [
      "Lie on your back with your heels on sliders and lift your hips.",
      "Slide your heels away while maintaining a controlled hip position.",
      "Bend your knees to draw the sliders back underneath you.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Spiderman Push-Up",
    description:
      "A push-up with an outward knee drive that adds a trunk challenge.",
    category: "bodyweight",
    muscleGroups: ["chest", "triceps", "shoulders", "core", "hip flexors"],
    equipment: [],
    instructions: [
      "Begin in a firm high plank with your hands beneath your shoulders.",
      "Lower into a push-up while bringing one knee toward the same-side elbow.",
      "Press up, return that foot, and alternate the knee drive on the next repetition.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Split Squat",
    description:
      "A stationary staggered-stance squat that trains each leg separately.",
    category: "bodyweight",
    muscleGroups: ["quadriceps", "glutes", "hamstrings"],
    equipment: [],
    instructions: [
      "Take a long staggered stance with your rear heel lifted.",
      "Bend both knees to lower your rear knee toward the floor.",
      "Push through your front foot to rise and complete both sides.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Stability Ball Rollout",
    description:
      "A kneeling trunk exercise that rolls the forearms forward on a ball.",
    category: "bodyweight",
    muscleGroups: ["core", "shoulders", "back"],
    equipment: ["stability ball"],
    instructions: [
      "Kneel in front of a stability ball and rest your forearms on it.",
      "Roll the ball forward while extending your hips and maintaining a braced trunk.",
      "Draw the ball back toward you without collapsing your lower back.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Staggered Push-Up",
    description:
      "An uneven-hand push-up that challenges pressing control and trunk stability.",
    category: "bodyweight",
    muscleGroups: ["chest", "triceps", "shoulders", "core"],
    equipment: [],
    instructions: [
      "Start in a plank with one hand slightly ahead of the other.",
      "Lower your chest while keeping your shoulders and hips facing the floor.",
      "Press up and exchange hand positions after completing the prescribed repetitions.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Standing Calf Raise",
    description: "A two-legged heel raise that trains ankle plantar flexion.",
    category: "bodyweight",
    muscleGroups: ["calves"],
    equipment: [],
    instructions: [
      "Stand upright with your feet near hip width and weight evenly distributed.",
      "Rise onto the balls of your feet without rolling your ankles outward.",
      "Lower your heels slowly through a controlled range.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Step-Down",
    description:
      "A controlled single-leg lowering exercise performed from a platform.",
    category: "bodyweight",
    muscleGroups: ["quadriceps", "glutes", "abductors"],
    equipment: ["step"],
    instructions: [
      "Stand on a low stable step with one foot near its edge.",
      "Bend the supporting knee to lower the opposite heel toward the floor.",
      "Touch the heel lightly and straighten the supporting leg without pushing off the floor.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Step-Up",
    description: "A single-leg ascent onto a stable elevated platform.",
    category: "bodyweight",
    muscleGroups: ["quadriceps", "glutes", "hamstrings"],
    equipment: ["step"],
    instructions: [
      "Place one entire foot on a stable step and keep your torso upright.",
      "Press through that foot to lift your body without springing off the rear leg.",
      "Step down under control and complete equal repetitions with each leading leg.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Straight Bar Dip",
    description: "A pressing exercise performed above a single horizontal bar.",
    category: "bodyweight",
    muscleGroups: ["triceps", "chest", "shoulders", "core"],
    equipment: ["pull-up bar"],
    instructions: [
      "Use a securely mounted low bar and support yourself above it with straight arms.",
      "Lean slightly over the bar and bend your elbows to lower your torso.",
      "Press upward until your arms straighten while keeping the bar near your waist.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Sumo Squat",
    description: "A wide-stance squat that adds emphasis to the inner thighs.",
    category: "bodyweight",
    muscleGroups: ["quadriceps", "glutes", "adductors"],
    equipment: [],
    instructions: [
      "Stand wider than shoulder width with your toes turned outward.",
      "Bend your knees and lower your hips while maintaining an upright chest.",
      "Drive through both feet to stand with your knees following your toes.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Superman Hold",
    description:
      "A prone posterior-chain hold with the arms and legs slightly lifted.",
    category: "bodyweight",
    muscleGroups: ["back", "glutes", "hamstrings", "shoulders"],
    equipment: [],
    instructions: [
      "Lie face down with your arms extended ahead and your legs straight.",
      "Lift your chest, arms, and legs a small distance using a controlled effort.",
      "Hold with your gaze down and avoid forcing a large lower-back arch.",
    ],
    measurementType: "duration",
    baseXP: 10,
  },
  {
    name: "Suspension Push-Up",
    description:
      "A pressing exercise performed with the hands in suspension handles.",
    category: "bodyweight",
    muscleGroups: ["chest", "triceps", "shoulders", "core"],
    equipment: ["suspension trainer"],
    instructions: [
      "Hold the handles below chest height and lean forward with straight legs.",
      "Lower your chest between your hands while keeping your straps taut.",
      "Press back to the starting lean without bending at your hips.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Suspension Row",
    description:
      "A standing-lean row that uses suspension handles for adjustable resistance.",
    category: "bodyweight",
    muscleGroups: ["back", "biceps", "forearms", "core"],
    equipment: ["suspension trainer"],
    instructions: [
      "Hold the suspension handles and lean backward with straight arms.",
      "Pull your chest toward your hands while keeping your shoulders down.",
      "Return to the lean under control and adjust foot placement to choose the difficulty.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Swimmer",
    description:
      "An alternating prone arm-and-leg lift that trains posterior-chain coordination.",
    category: "bodyweight",
    muscleGroups: ["back", "glutes", "shoulders", "hamstrings"],
    equipment: [],
    instructions: [
      "Lie face down with your arms extended ahead of you.",
      "Lift one arm and the opposite leg a small distance while keeping your neck neutral.",
      "Lower them and alternate sides without rocking your pelvis.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Tibialis Raise",
    description:
      "A wall-supported toe lift that trains the front of the lower legs.",
    category: "bodyweight",
    muscleGroups: ["tibialis anterior"],
    equipment: ["wall"],
    instructions: [
      "Lean your back against a wall and walk your heels forward.",
      "Keep your heels planted as you lift your toes and forefeet toward your shins.",
      "Lower your toes slowly without sliding your feet.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Towel Pull-Up",
    description:
      "A grip-demanding pull-up performed while holding towels draped over a bar.",
    category: "bodyweight",
    muscleGroups: ["back", "biceps", "forearms", "core"],
    equipment: ["pull-up bar", "towel"],
    instructions: [
      "Drape two sturdy towels over a secure bar and grip both ends of each.",
      "Hang steadily and pull your elbows downward to raise your body.",
      "Lower slowly and stop before your grip slips from the towels.",
    ],
    measurementType: "reps",
    baseXP: 25,
  },
  {
    name: "Tuck Planche",
    description:
      "An advanced straight-arm balance with the knees drawn toward the chest.",
    category: "bodyweight",
    muscleGroups: ["shoulders", "triceps", "core"],
    equipment: ["parallettes"],
    instructions: [
      "Grip stable parallettes and lean your shoulders forward over your hands.",
      "Draw your knees tightly toward your chest and lift your feet without resting your knees on your arms.",
      "Push continuously through straight arms and return your feet gently to the floor.",
    ],
    measurementType: "duration",
    baseXP: 25,
  },
  {
    name: "Tuck-Up",
    description:
      "A compact abdominal lift that draws the torso and knees together.",
    category: "bodyweight",
    muscleGroups: ["core", "hip flexors"],
    equipment: [],
    instructions: [
      "Lie on your back with your legs extended and arms beside your body.",
      "Lift your shoulders and draw both knees toward your chest.",
      "Extend back toward the starting position with control and keep tension in your abdomen.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Underhand Inverted Row",
    description:
      "A horizontal row using a palms-up grip to change elbow positioning.",
    category: "bodyweight",
    muscleGroups: ["back", "biceps", "forearms", "core"],
    equipment: ["pull-up bar"],
    instructions: [
      "Lie beneath a secure low bar and hold it with your palms facing you.",
      "Brace your trunk and pull your chest upward with your elbows close to your sides.",
      "Lower smoothly until your arms straighten while keeping your heels planted.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "V-Up",
    description:
      "A simultaneous trunk and leg lift that brings the hands toward the feet.",
    category: "bodyweight",
    muscleGroups: ["core", "hip flexors"],
    equipment: [],
    instructions: [
      "Lie on your back with your arms overhead and your legs extended.",
      "Lift your torso and legs together while reaching your hands toward your feet.",
      "Lower both smoothly without dropping your heels or arching your back.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Walking Lunge",
    description:
      "A traveling series of forward lunges performed without external weight.",
    category: "bodyweight",
    muscleGroups: ["quadriceps", "glutes", "hamstrings", "core"],
    equipment: [],
    instructions: [
      "Step forward into a lunge and lower your rear knee toward the floor.",
      "Push through your front leg and bring the rear foot forward.",
      "Continue into the next lunge while maintaining an upright torso and steady stride.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Wall Handstand Hold",
    description: "An inverted shoulder-strength hold supported by a wall.",
    category: "bodyweight",
    muscleGroups: ["shoulders", "triceps", "core"],
    equipment: ["wall"],
    instructions: [
      "Walk your feet up a wall into a supported handstand with your hands firmly planted.",
      "Push tall through your shoulders and keep your ribs from flaring.",
      "Hold a steady body line, then walk down with control.",
    ],
    measurementType: "duration",
    baseXP: 20,
  },
  {
    name: "Wall Handstand Push-Up",
    description: "An advanced inverted press using a wall to assist balance.",
    category: "bodyweight",
    muscleGroups: ["shoulders", "triceps", "core"],
    equipment: ["wall"],
    instructions: [
      "Enter a wall-supported handstand with your palms just wider than shoulder width.",
      "Bend your elbows and lower your head toward the floor under control.",
      "Press back to straight arms and leave the position before your alignment breaks.",
    ],
    measurementType: "reps",
    baseXP: 25,
  },
  {
    name: "Wall Push-Up",
    description:
      "An upright pushing exercise with a wall supporting part of your weight.",
    category: "bodyweight",
    muscleGroups: ["chest", "triceps", "shoulders"],
    equipment: ["wall"],
    instructions: [
      "Stand facing a wall and place your palms at shoulder height.",
      "Step back enough to create a gentle lean and keep your body straight.",
      "Bend your elbows toward the wall, then push yourself upright.",
    ],
    measurementType: "reps",
    baseXP: 10,
  },
  {
    name: "Wall Sit",
    description: "A static squat supported by a wall behind the torso.",
    category: "bodyweight",
    muscleGroups: ["quadriceps", "glutes"],
    equipment: ["wall"],
    instructions: [
      "Place your back against a wall and walk your feet forward.",
      "Slide down until your thighs approach parallel or a comfortable shallower angle.",
      "Keep your feet planted and hold without resting your hands on your thighs.",
    ],
    measurementType: "duration",
    baseXP: 10,
  },
  {
    name: "Wide-Grip Pull-Up",
    description: "An overhand pull-up performed with a wider hand placement.",
    category: "bodyweight",
    muscleGroups: ["back", "biceps", "forearms"],
    equipment: ["pull-up bar"],
    instructions: [
      "Take an overhand grip wider than shoulder width on a secure bar.",
      "Pull upward by bringing your elbows down while keeping your chest lifted.",
      "Lower with control and avoid forcing an excessively wide or uncomfortable grip.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Wide-Grip Push-Up",
    description:
      "A wider-hand floor press that changes the chest pressing angle.",
    category: "bodyweight",
    muscleGroups: ["chest", "triceps", "shoulders", "core"],
    equipment: [],
    instructions: [
      "Set your palms wider than shoulder width and extend your legs.",
      "Lower your chest under control without allowing your elbows to flare straight sideways.",
      "Push back up while maintaining tension through your abdomen and glutes.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "A-Skips",
    description:
      "A rhythmic skipping drill with an alternating high knee drive.",
    category: "cardio",
    muscleGroups: ["hip flexors", "calves", "quadriceps"],
    equipment: [],
    instructions: [
      "Stand tall and begin with gentle skips along a clear path.",
      "Drive one knee up while the opposite arm moves forward, landing softly under your body.",
      "Alternate the knee drive on each skip and maintain a consistent rhythm.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Agility Ladder Ickey Shuffle",
    description:
      "A ladder coordination pattern using two steps inside and one step outside.",
    category: "cardio",
    muscleGroups: ["calves", "quadriceps", "glutes"],
    equipment: ["agility ladder"],
    instructions: [
      "Lay the ladder flat on a level surface and begin slowly to learn the pattern.",
      "Step both feet into a square, then step the trailing foot outside the opposite edge.",
      "Advance to the next square and alternate the outside step while keeping the rhythm controlled.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Agility Ladder In-Out Steps",
    description:
      "Forward ladder footwork alternating two feet inside and outside each square.",
    category: "cardio",
    muscleGroups: ["calves", "quadriceps", "glutes"],
    equipment: ["agility ladder"],
    instructions: [
      "Lay the ladder flat on a level surface and begin slowly to learn the pattern.",
      "Step both feet into a square, then place them outside its edges.",
      "Advance to the next square with short steps and keep your knees soft.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Agility Ladder Lateral In-Out Steps",
    description:
      "Sideways ladder footwork alternating inside and outside contacts.",
    category: "cardio",
    muscleGroups: ["calves", "quadriceps", "glutes"],
    equipment: ["agility ladder"],
    instructions: [
      "Lay the ladder flat on a level surface and begin slowly to learn the pattern.",
      "Moving sideways, place each foot inside a square, then step each foot outside the near edge.",
      "Move along the ladder with controlled contacts and practice both directions.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Agility Ladder Lateral Two-Foot Steps",
    description: "Sideways ladder steps placing both feet in each square.",
    category: "cardio",
    muscleGroups: ["calves", "quadriceps", "glutes"],
    equipment: ["agility ladder"],
    instructions: [
      "Lay the ladder flat on a level surface and begin slowly to learn the pattern.",
      "Travel sideways with two quick foot contacts in each square without crossing your feet.",
      "Repeat in the other direction and keep your hips level.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Agility Ladder One-Foot Run",
    description:
      "Quick forward ladder steps with one foot placed in each square.",
    category: "cardio",
    muscleGroups: ["calves", "quadriceps", "glutes"],
    equipment: ["agility ladder"],
    instructions: [
      "Lay the ladder flat on a level surface and begin slowly to learn the pattern.",
      "Run forward placing one foot in each ladder square, alternating feet.",
      "Keep the steps light and look slightly ahead; walk back outside the ladder.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Agility Ladder Two-Foot Run",
    description:
      "Quick forward ladder steps with both feet placed in each square.",
    category: "cardio",
    muscleGroups: ["calves", "quadriceps", "glutes"],
    equipment: ["agility ladder"],
    instructions: [
      "Lay the ladder flat on a level surface and begin slowly to learn the pattern.",
      "Place both feet in each square in a quick left-right rhythm before advancing.",
      "Avoid stepping on the rungs and walk back outside the ladder to reset.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Air Bike",
    description:
      "Continuous cycling on a fan bike using coordinated arm and leg action.",
    category: "cardio",
    muscleGroups: ["quadriceps", "glutes", "shoulders", "back"],
    equipment: ["air bike"],
    instructions: [
      "Adjust the seat and place your hands on the moving handles.",
      "Push and pull the handles as your legs pedal at a sustainable rhythm.",
      "Record the distance shown by the machine and your elapsed time; convert kilometers to miles if needed.",
    ],
    measurementType: "distance_time",
    baseXP: 20,
  },
  {
    name: "Air Bike Intervals",
    description: "Repeated fan-bike efforts separated by easy cycling or rest.",
    category: "cardio",
    muscleGroups: ["quadriceps", "glutes", "shoulders", "back"],
    equipment: ["air bike"],
    instructions: [
      "Adjust the bike and warm up at a comfortable pace.",
      "Use coordinated arm and leg action during each work period, then follow the prescribed recovery period.",
      "Use the workout's work, recovery, and round targets; record the number of rounds you complete.",
    ],
    measurementType: "intervals",
    baseXP: 25,
  },
  {
    name: "Alternating Battle Rope Waves",
    description: "Alternating rope waves with a stable lower-body stance.",
    category: "cardio",
    muscleGroups: ["shoulders", "back", "core", "quadriceps"],
    equipment: ["battle ropes"],
    instructions: [
      "Secure the rope anchor and hold one end in each hand with feet apart and knees soft.",
      "Raise one hand as you lower the other to send alternating waves toward the anchor.",
      "Keep your torso steady and make consistent waves through the timed effort.",
    ],
    measurementType: "duration",
    baseXP: 20,
  },
  {
    name: "Alternating-Foot Jump Rope",
    description: "Rope jumping with alternating foot contacts.",
    category: "cardio",
    muscleGroups: ["calves", "quadriceps", "shoulders"],
    equipment: ["jump rope"],
    instructions: [
      "Hold the handles near hip height with elbows close to your sides and clear space around the rope.",
      "Alternate your landing foot on each rope turn, as though jogging in place.",
      "Keep the hops small and the wrist circles even.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "B-Skips",
    description:
      "A skipping drill that adds a controlled lower-leg extension before landing.",
    category: "cardio",
    muscleGroups: ["hamstrings", "hip flexors", "calves"],
    equipment: [],
    instructions: [
      "Begin with a gentle skip and lift one knee in front of you.",
      "Extend the lower leg slightly, then sweep the foot back down beneath your body.",
      "Alternate legs with controlled steps and avoid reaching the landing far ahead of you.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Backstroke Swimming",
    description:
      "Continuous swimming on the back with alternating arm strokes.",
    category: "cardio",
    muscleGroups: ["back", "shoulders", "core", "full body"],
    equipment: ["swimming pool"],
    instructions: [
      "Use a supervised swimming area and a stroke you can perform comfortably.",
      "Keep your body near the surface and alternate overhead arm strokes.",
      "Use a steady flutter kick and check your position relative to the wall.",
      "Record the total distance swum and elapsed time, converting pool lengths to miles.",
    ],
    measurementType: "distance_time",
    baseXP: 15,
  },
  {
    name: "Battle Rope Intervals",
    description: "Timed battle-rope work bouts separated by recovery periods.",
    category: "cardio",
    muscleGroups: ["shoulders", "back", "core", "quadriceps"],
    equipment: ["battle ropes"],
    instructions: [
      "Secure the rope anchor and stand in a stable, soft-knee stance.",
      "Make alternating waves during the work period, then lower the ropes and recover.",
      "Use the workout's work, recovery, and round targets; record the number of rounds you complete.",
    ],
    measurementType: "intervals",
    baseXP: 20,
  },
  {
    name: "Battle Rope Lateral Waves",
    description: "Side-to-side rope waves with controlled torso movement.",
    category: "cardio",
    muscleGroups: ["shoulders", "back", "core", "quadriceps"],
    equipment: ["battle ropes"],
    instructions: [
      "Secure the rope anchor and hold one end in each hand with feet apart and knees soft.",
      "Move both rope ends together from side to side in front of your body.",
      "Keep your knees soft and use a manageable range without pulling against the anchor.",
    ],
    measurementType: "duration",
    baseXP: 20,
  },
  {
    name: "Battle Rope Outside Circles",
    description: "Outward circular rope movements performed with both hands.",
    category: "cardio",
    muscleGroups: ["shoulders", "back", "core", "quadriceps"],
    equipment: ["battle ropes"],
    instructions: [
      "Secure the rope anchor and hold one end in each hand with feet apart and knees soft.",
      "Circle each hand outward to create wide looping waves along the ropes.",
      "Keep the circles controlled and your feet firmly planted through the timed effort.",
    ],
    measurementType: "duration",
    baseXP: 20,
  },
  {
    name: "Battle Rope Slams",
    description: "Forceful two-arm rope slams combined with a shallow squat.",
    category: "cardio",
    muscleGroups: ["shoulders", "back", "core", "quadriceps"],
    equipment: ["battle ropes"],
    instructions: [
      "Secure the rope anchor and hold one end in each hand with feet apart and knees soft.",
      "Raise both rope ends, then bend your knees and drive your hands down together.",
      "Reset smoothly and repeat without rounding your lower back.",
    ],
    measurementType: "duration",
    baseXP: 20,
  },
  {
    name: "Bear Crawl",
    description:
      "Forward crawling on the hands and feet with the knees hovering off the floor.",
    category: "cardio",
    muscleGroups: ["core", "shoulders", "quadriceps"],
    equipment: [],
    instructions: [
      "Start on hands and knees, then lift your knees just above the floor.",
      "Move one hand and the opposite foot forward together using small steps.",
      "Continue along a clear path with your back level; turn under control as needed.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Box Jump",
    description: "A two-foot jump onto a stable raised platform.",
    category: "cardio",
    muscleGroups: ["quadriceps", "glutes", "calves"],
    equipment: ["plyometric box"],
    instructions: [
      "Stand facing a stable box of a height you can reach comfortably.",
      "Dip at the knees, swing your arms, and jump onto the box with both feet.",
      "Land softly, stand tall, and step down rather than jumping down.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Boxer Step Jump Rope",
    description: "Rope jumping with a gentle side-to-side weight shift.",
    category: "cardio",
    muscleGroups: ["calves", "quadriceps", "shoulders"],
    equipment: ["jump rope"],
    instructions: [
      "Hold the handles near hip height with elbows close to your sides and clear space around the rope.",
      "Shift your weight slightly from one foot to the other on successive turns.",
      "Keep both feet close to the floor and avoid large lateral jumps.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Boxing Footwork",
    description: "Continuous boxing stance movement using controlled steps.",
    category: "cardio",
    muscleGroups: ["calves", "quadriceps", "glutes", "core"],
    equipment: [],
    instructions: [
      "Set a comfortable boxing stance with soft knees and hands at guard.",
      "Step in the direction of travel with the nearest foot first, then follow with the other foot.",
      "Move forward, backward, and laterally without crossing your feet for the planned time.",
    ],
    measurementType: "duration",
    baseXP: 10,
  },
  {
    name: "Breaststroke Swimming",
    description:
      "Continuous swimming with coordinated breaststroke arms and kick.",
    category: "cardio",
    muscleGroups: ["chest", "back", "adductors", "glutes", "core"],
    equipment: ["swimming pool"],
    instructions: [
      "Use a supervised swimming area and a stroke you can perform comfortably.",
      "Pull your hands outward and inward, then extend them forward as you kick.",
      "Finish each kick with your legs together and a controlled glide before the next stroke.",
      "Record the total distance swum and elapsed time, converting pool lengths to miles.",
    ],
    measurementType: "distance_time",
    baseXP: 15,
  },
  {
    name: "Broad Jump",
    description: "A standing two-foot jump for horizontal distance.",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "glutes", "calves"],
    equipment: [],
    instructions: [
      "Stand with your feet about hip-width apart and a clear landing space.",
      "Hinge and bend your knees, then swing your arms and drive forward from both feet.",
      "Land softly with both feet and stabilize before the next repetition.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Burpee",
    description:
      "A full-body conditioning repetition combining a squat, plank, push-up, and jump.",
    category: "cardio",
    muscleGroups: ["full body"],
    equipment: [],
    instructions: [
      "Squat down and place your hands on the floor, then step or jump your feet into a plank.",
      "Perform a controlled push-up and return your feet toward your hands.",
      "Stand and jump with a soft landing; reset your stance before the next repetition.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Burpee Box Jump",
    description: "A burpee followed by a controlled jump onto a box.",
    category: "cardio",
    muscleGroups: ["full body"],
    equipment: ["plyometric box"],
    instructions: [
      "Perform a burpee a short distance from a stable box of manageable height.",
      "Stand, jump onto the box with both feet, and land in a balanced stance.",
      "Stand fully on the box, then step down carefully before your next repetition.",
    ],
    measurementType: "reps",
    baseXP: 25,
  },
  {
    name: "Burpee Broad Jump",
    description: "A burpee followed by a forward jump.",
    category: "cardio",
    muscleGroups: ["full body"],
    equipment: [],
    instructions: [
      "Perform a controlled burpee and return to standing with clear space ahead.",
      "Swing your arms and jump forward, landing softly with your knees tracking over your feet.",
      "Stabilize your landing before beginning the next burpee.",
    ],
    measurementType: "reps",
    baseXP: 25,
  },
  {
    name: "Burpee Pull-Up",
    description: "A burpee followed by a pull-up on a securely mounted bar.",
    category: "cardio",
    muscleGroups: ["full body", "back", "biceps"],
    equipment: ["pull-up bar"],
    instructions: [
      "Perform a controlled burpee beneath a bar you can reach safely.",
      "Stand, grasp the bar, and pull until your chin clears it without swinging.",
      "Lower under control and release to a stable landing before your next repetition.",
    ],
    measurementType: "reps",
    baseXP: 30,
  },
  {
    name: "Butt Kicks",
    description: "Running in place while bringing each heel toward the glutes.",
    category: "cardio",
    muscleGroups: ["hamstrings", "calves"],
    equipment: [],
    instructions: [
      "Stand tall with your arms in a relaxed running position.",
      "Alternate bending each knee to bring the heel toward your glutes.",
      "Keep your steps light and avoid arching your lower back as you continue.",
    ],
    measurementType: "duration",
    baseXP: 10,
  },
  {
    name: "Butterfly Swimming",
    description:
      "Continuous butterfly swimming using coordinated arm strokes and a dolphin kick.",
    category: "cardio",
    muscleGroups: ["back", "shoulders", "core", "full body"],
    equipment: ["swimming pool"],
    instructions: [
      "Use a supervised swimming area and a stroke you can perform comfortably.",
      "Use a controlled dolphin kick from your hips while both arms recover together.",
      "Coordinate your breath with the arm pull and keep the stroke smooth rather than forcing speed.",
      "Record the total distance swum and elapsed time, converting pool lengths to miles.",
    ],
    measurementType: "distance_time",
    baseXP: 25,
  },
  {
    name: "Carioca",
    description:
      "A sideways coordination drill using alternating front and back crossover steps.",
    category: "cardio",
    muscleGroups: ["glutes", "adductors", "abductors", "core"],
    equipment: [],
    instructions: [
      "Stand side-on to a clear path with arms relaxed.",
      "Travel sideways, alternating crossing the trailing foot in front of and behind the leading foot.",
      "Let your hips turn with the steps and practice both directions at a controlled pace.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Crab Walk",
    description: "A reverse tabletop crawl with the hips lifted.",
    category: "cardio",
    muscleGroups: ["triceps", "shoulders", "glutes", "core"],
    equipment: [],
    instructions: [
      "Sit with knees bent, feet planted, and hands on the floor beside your hips.",
      "Lift your hips and take small steps using opposite hands and feet.",
      "Keep your movements controlled and lower your hips to rest when needed.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Cross Jacks",
    description: "Rhythmic jumps that alternate crossing the arms and feet.",
    category: "cardio",
    muscleGroups: ["calves", "quadriceps", "shoulders"],
    equipment: [],
    instructions: [
      "Start with your feet apart and arms extended out to the sides.",
      "Jump inward and cross one foot in front while crossing your arms at chest height.",
      "Jump open again, then switch the crossing foot and arm on the next repetition.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Cross-Body Mountain Climbers",
    description: "Alternating diagonal knee drives from a high plank.",
    category: "cardio",
    muscleGroups: ["core", "hip flexors", "shoulders"],
    equipment: [],
    instructions: [
      "Set up in a high plank with your hands under your shoulders.",
      "Bring one knee toward the opposite elbow without twisting your shoulders.",
      "Return the foot and alternate sides while keeping your hips controlled.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Crossover Jump Rope",
    description: "Rope jumping with alternating crossed and open arm turns.",
    category: "cardio",
    muscleGroups: ["calves", "quadriceps", "shoulders"],
    equipment: ["jump rope"],
    instructions: [
      "Hold the handles near hip height with elbows close to your sides and clear space around the rope.",
      "Cross your forearms in front of your waist as the rope comes around and jump through the loop.",
      "Open your arms for the next turn and practice the crossover slowly before increasing pace.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Curved Treadmill Running",
    description: "Continuous running on a self-powered curved treadmill.",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "glutes", "calves"],
    equipment: ["curved treadmill"],
    instructions: [
      "Begin walking and learn how your position on the curve controls belt speed.",
      "Build to a run with controlled steps and slow down gradually before stepping off.",
      "Record the distance shown by the machine and your elapsed time; convert kilometers to miles if needed.",
    ],
    measurementType: "distance_time",
    baseXP: 20,
  },
  {
    name: "Cycling",
    description:
      "An outdoor bicycle ride tracked by distance and elapsed time.",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "glutes", "calves"],
    equipment: ["bicycle", "helmet"],
    instructions: [
      "Adjust the saddle so your knee remains slightly bent at the bottom of the pedal stroke.",
      "Ride with relaxed shoulders and a smooth, steady cadence.",
      "Finish the route and record the distance covered and total elapsed time.",
    ],
    measurementType: "distance_time",
    baseXP: 15,
  },
  {
    name: "Dance Cardio",
    description:
      "Continuous aerobic dance using repeatable steps and arm patterns.",
    category: "cardio",
    muscleGroups: ["full body"],
    equipment: [],
    instructions: [
      "Choose clear space and start with simple stepping patterns.",
      "Combine side steps, marches, and coordinated arm movement at a sustainable pace.",
      "Continue your sequence for the planned duration and record the time.",
    ],
    measurementType: "duration",
    baseXP: 10,
  },
  {
    name: "Deep-Water Running",
    description:
      "A suspended running pattern in deep water with a flotation belt.",
    category: "cardio",
    muscleGroups: ["hip flexors", "quadriceps", "hamstrings", "core"],
    equipment: ["swimming pool", "flotation belt"],
    instructions: [
      "Use a fitted flotation belt in a supervised pool and enter where you can remain supported.",
      "Keep your torso upright while cycling your legs and arms in a running pattern.",
      "Maintain controlled movement without touching the bottom and record the activity duration.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Double Battle Rope Waves",
    description: "Simultaneous rope waves created with both arms.",
    category: "cardio",
    muscleGroups: ["shoulders", "back", "core", "quadriceps"],
    equipment: ["battle ropes"],
    instructions: [
      "Secure the rope anchor and hold one end in each hand with feet apart and knees soft.",
      "Raise and lower both hands together to create matching waves toward the anchor.",
      "Keep your shoulders relaxed and use a steady rhythm through the timed effort.",
    ],
    measurementType: "duration",
    baseXP: 20,
  },
  {
    name: "Double-Under Jump Rope",
    description: "A rope jump in which the rope passes under the feet twice.",
    category: "cardio",
    muscleGroups: ["calves", "quadriceps", "shoulders"],
    equipment: ["jump rope"],
    instructions: [
      "Hold the handles near hip height with elbows close to your sides and clear space around the rope.",
      "Use a slightly higher controlled jump and turn the rope quickly from your wrists.",
      "Land softly and reset with single jumps if you lose the rhythm.",
    ],
    measurementType: "duration",
    baseXP: 20,
  },
  {
    name: "Elliptical Intervals",
    description: "Alternating higher-effort and easier elliptical stepping.",
    category: "cardio",
    muscleGroups: ["quadriceps", "glutes", "calves"],
    equipment: ["elliptical trainer"],
    instructions: [
      "Start at a comfortable resistance and warm up.",
      "Increase your effort for work periods while maintaining a smooth stride, then reduce effort for recovery.",
      "Use the workout's work, recovery, and round targets; record the number of rounds you complete.",
    ],
    measurementType: "intervals",
    baseXP: 20,
  },
  {
    name: "Elliptical Trainer",
    description: "Continuous low-impact stepping on an elliptical trainer.",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "glutes", "calves"],
    equipment: ["elliptical trainer"],
    instructions: [
      "Stand tall on the pedals and use a resistance that allows a smooth stride.",
      "Move through the pedal path without bouncing or hanging your weight on the handles.",
      "Record the distance shown by the machine and your elapsed time; convert kilometers to miles if needed.",
    ],
    measurementType: "distance_time",
    baseXP: 15,
  },
  {
    name: "Fast Feet",
    description:
      "Quick, small alternating steps performed in an athletic stance.",
    category: "cardio",
    muscleGroups: ["calves", "quadriceps", "glutes"],
    equipment: [],
    instructions: [
      "Set your feet about hip-width apart and bend your knees slightly.",
      "Take quick, small alternating steps while keeping your torso stable.",
      "Maintain the stance and rhythm for the planned time, then slow to a stop.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Forward-Backward Line Hop",
    description: "Small two-foot jumps forward and backward over a floor line.",
    category: "cardio",
    muscleGroups: ["calves", "quadriceps"],
    equipment: [],
    instructions: [
      "Stand with both feet behind a marked line on the floor.",
      "Hop forward over the line and land softly with knees relaxed.",
      "Hop back behind the line and continue using small controlled jumps.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Freestyle Swimming",
    description:
      "Continuous front-crawl swimming tracked by distance and elapsed time.",
    category: "cardio",
    muscleGroups: ["back", "shoulders", "core", "full body"],
    equipment: ["swimming pool"],
    instructions: [
      "Use a supervised swimming area and a stroke you can perform comfortably.",
      "Use alternating arm strokes and a steady flutter kick.",
      "Turn your head with your body rotation to breathe, then return your face to the water.",
      "Record the total distance swum and elapsed time, converting pool lengths to miles.",
    ],
    measurementType: "distance_time",
    baseXP: 15,
  },
  {
    name: "Heavy Bag Boxing",
    description: "Continuous controlled boxing combinations on a heavy bag.",
    category: "cardio",
    muscleGroups: ["shoulders", "triceps", "core", "full body"],
    equipment: ["heavy bag", "boxing gloves", "hand wraps"],
    instructions: [
      "Use hand wraps and boxing gloves, then set a balanced stance near the bag.",
      "Strike with controlled combinations and keep your wrists aligned with your forearms.",
      "Return your hands to guard and maintain your footwork for the planned duration.",
    ],
    measurementType: "duration",
    baseXP: 20,
  },
  {
    name: "Heavy Bag Boxing Intervals",
    description: "Timed boxing rounds on a heavy bag separated by rest.",
    category: "cardio",
    muscleGroups: ["shoulders", "triceps", "core", "full body"],
    equipment: ["heavy bag", "boxing gloves", "hand wraps"],
    instructions: [
      "Wrap your hands, put on gloves, and warm up your movement.",
      "Use controlled combinations during the work period, return your hands to guard, and recover between rounds.",
      "Use the workout's work, recovery, and round targets; record the number of rounds you complete.",
    ],
    measurementType: "intervals",
    baseXP: 20,
  },
  {
    name: "High Knees",
    description: "Running in place with alternating knee drives.",
    category: "cardio",
    muscleGroups: ["hip flexors", "quadriceps", "calves", "core"],
    equipment: [],
    instructions: [
      "Stand tall with your elbows bent and space to move in place.",
      "Alternate lifting each knee as the opposite arm drives forward.",
      "Stay light on your feet and keep a controlled rhythm for the planned time.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "High-Knee Jump Rope",
    description: "Rope jumping with alternating raised knee drives.",
    category: "cardio",
    muscleGroups: ["calves", "quadriceps", "shoulders"],
    equipment: ["jump rope"],
    instructions: [
      "Hold the handles near hip height with elbows close to your sides and clear space around the rope.",
      "Alternate lifting your knees as you jump through each rope turn.",
      "Maintain an upright torso and begin at a pace that keeps the rope clear of your feet.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Hiking",
    description:
      "A sustained walk over a trail with changing terrain and elevation.",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "glutes", "calves"],
    equipment: [],
    instructions: [
      "Choose a trail and footwear suited to its surface and elevation.",
      "Use shorter steps uphill and controlled steps on descents.",
      "Finish the route and record the distance covered and total elapsed time.",
    ],
    measurementType: "distance_time",
    baseXP: 15,
  },
  {
    name: "Hill Running",
    description:
      "A continuous uphill run with a shorter stride and steady arm drive.",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "glutes", "calves"],
    equipment: [],
    instructions: [
      "Choose an incline with a clear surface and sufficient space.",
      "Run uphill with short steps and a slight whole-body lean from your ankles.",
      "Finish the route and record the distance covered and total elapsed time.",
    ],
    measurementType: "distance_time",
    baseXP: 20,
  },
  {
    name: "Hill Sprint Intervals",
    description: "Short uphill running bouts separated by recovery periods.",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "glutes", "calves"],
    equipment: [],
    instructions: [
      "Warm up thoroughly and select a clear hill with secure footing.",
      "Run uphill during each work period and recover at an easy walk using the planned recovery time.",
      "Use the workout's work, recovery, and round targets; record the number of rounds you complete.",
    ],
    measurementType: "intervals",
    baseXP: 25,
  },
  {
    name: "Incline Treadmill Walking",
    description: "Steady treadmill walking with the deck raised to an incline.",
    category: "cardio",
    muscleGroups: ["glutes", "quadriceps", "calves"],
    equipment: ["treadmill"],
    instructions: [
      "Start the belt slowly before selecting an incline you can walk on without leaning on the rails.",
      "Use shorter steps and maintain an upright torso as you walk uphill.",
      "Record the distance shown by the machine and your elapsed time; convert kilometers to miles if needed.",
    ],
    measurementType: "distance_time",
    baseXP: 15,
  },
  {
    name: "Inline Skating",
    description: "Continuous skating using alternating lateral pushes.",
    category: "cardio",
    muscleGroups: ["quadriceps", "glutes", "abductors", "calves"],
    equipment: ["inline skates", "helmet"],
    instructions: [
      "Use a smooth, clear surface and protective equipment.",
      "Keep your knees soft and push diagonally outward from one skate to the other.",
      "Finish the route and record the distance covered and total elapsed time.",
    ],
    measurementType: "distance_time",
    baseXP: 15,
  },
  {
    name: "Jogging",
    description: "An easy continuous run with a relaxed, sustainable stride.",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "glutes", "calves"],
    equipment: [],
    instructions: [
      "Begin with a few minutes of easy walking.",
      "Jog with relaxed arms and short, comfortable strides.",
      "Finish the route and record the distance covered and total elapsed time.",
    ],
    measurementType: "distance_time",
    baseXP: 15,
  },
  {
    name: "Jump Rope",
    description: "Basic two-foot rope jumps.",
    category: "cardio",
    muscleGroups: ["calves", "quadriceps", "shoulders"],
    equipment: ["jump rope"],
    instructions: [
      "Hold the handles near hip height with elbows close to your sides and clear space around the rope.",
      "Jump just high enough to clear the rope with both feet together.",
      "Land softly with knees relaxed and keep the rope turning from your wrists.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Jump Rope Intervals",
    description: "Repeated rope-jumping work periods with scheduled rest.",
    category: "cardio",
    muscleGroups: ["calves", "quadriceps", "shoulders"],
    equipment: ["jump rope"],
    instructions: [
      "Adjust the rope length and begin with easy two-foot jumps.",
      "Jump through each work period with small wrist circles and use the planned recovery period to rest.",
      "Use the workout's work, recovery, and round targets; record the number of rounds you complete.",
    ],
    measurementType: "intervals",
    baseXP: 20,
  },
  {
    name: "Jumping Jacks",
    description:
      "Rhythmic jumps that open and close the legs while the arms travel overhead.",
    category: "cardio",
    muscleGroups: ["calves", "quadriceps", "shoulders"],
    equipment: [],
    instructions: [
      "Stand with feet together and arms at your sides.",
      "Jump your feet apart while raising your arms overhead.",
      "Jump back to the starting stance and repeat with soft landings for the planned time.",
    ],
    measurementType: "duration",
    baseXP: 10,
  },
  {
    name: "Kayaking",
    description:
      "Continuous paddling with alternating strokes and controlled torso rotation.",
    category: "cardio",
    muscleGroups: ["back", "shoulders", "core"],
    equipment: ["kayak", "paddle", "personal flotation device"],
    instructions: [
      "Use an appropriate fitted flotation device and suitable water conditions.",
      "Plant the blade near your feet and rotate your torso as you pull it toward your hip.",
      "Finish the route and record the distance covered and total elapsed time.",
    ],
    measurementType: "distance_time",
    baseXP: 15,
  },
  {
    name: "Kickboard Swimming",
    description: "Pool kicking while holding a kickboard for support.",
    category: "cardio",
    muscleGroups: ["quadriceps", "glutes", "hip flexors", "calves"],
    equipment: ["swimming pool", "kickboard"],
    instructions: [
      "Use a supervised swimming area and a stroke you can perform comfortably.",
      "Hold the front of the board with extended but relaxed arms.",
      "Kick steadily from your hips with small movements and a long body position.",
      "Record the total distance swum and elapsed time, converting pool lengths to miles.",
    ],
    measurementType: "distance_time",
    baseXP: 15,
  },
  {
    name: "Lateral Burpee Over Bar",
    description: "A burpee followed by a sideways jump over a stationary bar.",
    category: "cardio",
    muscleGroups: ["full body"],
    equipment: ["barbell"],
    instructions: [
      "Place a stable bar on the floor and perform a burpee alongside it with enough clearance.",
      "Return to standing and jump sideways over the bar, landing with soft knees.",
      "Regain your stance and perform the next repetition on the other side.",
    ],
    measurementType: "reps",
    baseXP: 25,
  },
  {
    name: "Lateral Line Hop",
    description: "Small two-foot jumps side to side over a floor line.",
    category: "cardio",
    muscleGroups: ["calves", "quadriceps"],
    equipment: [],
    instructions: [
      "Stand with both feet together beside a marked line on the floor.",
      "Hop sideways over the line using a small jump.",
      "Land softly and hop back, keeping your torso steady throughout the set.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Lateral Shuffle",
    description: "Sideways athletic steps that maintain a ready stance.",
    category: "cardio",
    muscleGroups: ["quadriceps", "glutes", "abductors", "calves"],
    equipment: [],
    instructions: [
      "Stand with your knees bent and feet about shoulder-width apart.",
      "Push off one foot and shuffle sideways without crossing your feet.",
      "Reverse direction under control and continue between your markers.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Medicine Ball Chest Pass to Wall",
    description: "A two-handed chest pass into a suitable rebound wall.",
    category: "cardio",
    muscleGroups: ["chest", "triceps", "shoulders"],
    equipment: ["medicine ball", "wall"],
    instructions: [
      "Face a wall intended for ball throws with a rebound ball held at chest height.",
      "Brace your torso and extend your arms to drive the ball straight toward the wall.",
      "Receive the rebound with soft elbows, reset, and repeat at a controlled pace.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Medicine Ball Rotational Wall Throw",
    description:
      "A side-on medicine-ball throw driven by coordinated hip and torso rotation.",
    category: "cardio",
    muscleGroups: ["core", "glutes", "shoulders"],
    equipment: ["medicine ball", "wall"],
    instructions: [
      "Stand sideways to a suitable throw wall holding a rebound ball near the far hip.",
      "Turn through your feet and hips as you throw the ball toward the wall.",
      "Receive or retrieve the ball under control, reset, and complete work on both sides.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Medicine Ball Slam",
    description: "A full-body overhead slam using a ball rated for slamming.",
    category: "cardio",
    muscleGroups: ["core", "shoulders", "back", "quadriceps"],
    equipment: ["medicine ball"],
    instructions: [
      "Choose a slam-rated ball and stand with clear space around you.",
      "Raise the ball overhead, then brace and drive it toward the floor with a controlled hip and knee bend.",
      "Pick it up with a stable squat or hinge; avoid reaching into an unpredictable rebound.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Mountain Biking",
    description: "A bicycle ride on off-road terrain with changing gradients.",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "glutes", "core"],
    equipment: ["mountain bike", "helmet"],
    instructions: [
      "Choose a route matched to your handling skills and check your brakes.",
      "Keep your elbows soft and adjust your body position as the terrain changes.",
      "Finish the route and record the distance covered and total elapsed time.",
    ],
    measurementType: "distance_time",
    baseXP: 20,
  },
  {
    name: "Mountain Climbers",
    description: "Alternating knee drives from a high plank position.",
    category: "cardio",
    muscleGroups: ["core", "hip flexors", "shoulders", "quadriceps"],
    equipment: [],
    instructions: [
      "Place your hands under your shoulders and extend your legs into a high plank.",
      "Drive one knee toward your chest, then return that foot as the other knee moves forward.",
      "Keep your hips controlled and shoulders over your wrists throughout the timed effort.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Pool Jogging",
    description:
      "Continuous jogging in shallow water with a stable upright posture.",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "glutes", "hip flexors"],
    equipment: ["swimming pool"],
    instructions: [
      "Use a supervised pool section where you can stand securely.",
      "Jog with alternating knee drives and natural arm movement, keeping your torso upright.",
      "Move at a controlled pace for the planned duration and record your time.",
    ],
    measurementType: "duration",
    baseXP: 10,
  },
  {
    name: "Power Walking",
    description: "A brisk walk using purposeful arm movement and quick steps.",
    category: "cardio",
    muscleGroups: ["quadriceps", "glutes", "calves"],
    equipment: [],
    instructions: [
      "Bend your elbows and swing your arms forward and back.",
      "Increase your cadence while keeping one foot in contact with the ground.",
      "Finish the route and record the distance covered and total elapsed time.",
    ],
    measurementType: "distance_time",
    baseXP: 15,
  },
  {
    name: "Recumbent Bike",
    description:
      "Continuous cycling from the supported seat of a recumbent bicycle.",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "glutes"],
    equipment: ["recumbent bike"],
    instructions: [
      "Adjust the seat so you can reach the pedals without locking your knees.",
      "Keep your back supported and pedal smoothly through each revolution.",
      "Record the distance shown by the machine and your elapsed time; convert kilometers to miles if needed.",
    ],
    measurementType: "distance_time",
    baseXP: 10,
  },
  {
    name: "Rowing Machine",
    description:
      "Continuous rowing on an ergometer using the legs, torso, and arms in sequence.",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "glutes", "back", "core"],
    equipment: ["rowing machine"],
    instructions: [
      "Secure your feet and hold the handle with relaxed wrists.",
      "Drive with your legs, lean back slightly, then pull the handle to your lower ribs; recover arms, torso, then legs.",
      "Record the distance shown by the machine and your elapsed time; convert kilometers to miles if needed.",
    ],
    measurementType: "distance_time",
    baseXP: 20,
  },
  {
    name: "Rowing Machine Intervals",
    description:
      "Repeated rowing efforts with planned recovery between rounds.",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "back", "core"],
    equipment: ["rowing machine"],
    instructions: [
      "Secure your feet and warm up with easy strokes.",
      "Row through each work period with legs, torso, then arms; use the planned rest or easy rowing recovery.",
      "Use the workout's work, recovery, and round targets; record the number of rounds you complete.",
    ],
    measurementType: "intervals",
    baseXP: 25,
  },
  {
    name: "Rowing on Water",
    description:
      "Continuous rowing using coordinated leg drive and oar strokes.",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "back", "core"],
    equipment: ["rowing boat", "oars"],
    instructions: [
      "Use a rowing setup and water conditions appropriate to your experience.",
      "Drive through your legs, open your torso, then draw the handles toward your ribs.",
      "Finish the route and record the distance covered and total elapsed time.",
    ],
    measurementType: "distance_time",
    baseXP: 20,
  },
  {
    name: "Running",
    description:
      "A continuous outdoor run tracked by distance and elapsed time.",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "glutes", "calves"],
    equipment: [],
    instructions: [
      "Start at an easy pace before settling into your planned effort.",
      "Keep your torso tall and swing your arms close to your sides.",
      "Finish the route and record the distance covered and total elapsed time.",
    ],
    measurementType: "distance_time",
    baseXP: 20,
  },
  {
    name: "Running Intervals",
    description: "Alternating faster running bouts with easier recovery bouts.",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "glutes", "calves"],
    equipment: [],
    instructions: [
      "Warm up with easy walking or jogging.",
      "Alternate the work and recovery periods specified by your workout, reducing to a walk or easy jog during recovery.",
      "Use the workout's work, recovery, and round targets; record the number of rounds you complete.",
    ],
    measurementType: "intervals",
    baseXP: 20,
  },
  {
    name: "Seal Jacks",
    description:
      "Jumping jacks with the arms opening sideways at shoulder height.",
    category: "cardio",
    muscleGroups: ["calves", "quadriceps", "chest", "shoulders"],
    equipment: [],
    instructions: [
      "Stand with feet together and your hands in front of your chest.",
      "Jump your feet apart while opening your arms out to the sides.",
      "Return your feet together and bring your hands toward each other; repeat with soft landings.",
    ],
    measurementType: "duration",
    baseXP: 10,
  },
  {
    name: "Shadow Boxing",
    description:
      "Continuous controlled punches and movement without a bag or partner.",
    category: "cardio",
    muscleGroups: ["shoulders", "triceps", "core", "full body"],
    equipment: [],
    instructions: [
      "Stand in a balanced boxing stance with hands at guard.",
      "Throw controlled jabs, crosses, and combinations while turning through your feet and hips.",
      "Return each hand to guard and move around clear space without locking your elbows.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Shuttle Run Intervals",
    description:
      "Repeated short runs between two markers with planned recovery.",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "glutes", "calves"],
    equipment: ["cones"],
    instructions: [
      "Set two markers on a clear, level surface and warm up.",
      "Run between the markers during the work period, slow before changing direction, and rest during recovery.",
      "Use the workout's work, recovery, and round targets; record the number of rounds you complete.",
    ],
    measurementType: "intervals",
    baseXP: 25,
  },
  {
    name: "Side-to-Side Jump Rope",
    description: "Two-foot rope jumps that move slightly from side to side.",
    category: "cardio",
    muscleGroups: ["calves", "quadriceps", "shoulders"],
    equipment: ["jump rope"],
    instructions: [
      "Hold the handles near hip height with elbows close to your sides and clear space around the rope.",
      "Jump both feet a small distance to one side, then to the other on the next turn.",
      "Keep the lateral movement small and land softly.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Single-Leg Jump Rope",
    description: "Rope jumping on one leg before switching sides.",
    category: "cardio",
    muscleGroups: ["calves", "quadriceps", "shoulders"],
    equipment: ["jump rope"],
    instructions: [
      "Hold the handles near hip height with elbows close to your sides and clear space around the rope.",
      "Use small hops on one foot while the rope passes beneath you.",
      "Switch legs during the timed effort and keep the rope speed controlled.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Skater Hop",
    description: "A lateral bound from one leg to the other.",
    category: "cardio",
    muscleGroups: ["glutes", "abductors", "quadriceps", "calves"],
    equipment: [],
    instructions: [
      "Start balanced on one leg with a soft knee and your other foot lightly raised.",
      "Push sideways and land on the opposite leg, letting the trailing leg follow behind.",
      "Stabilize with your knee aligned over your foot, then bound back the other way.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Ski Erg",
    description: "Continuous double-pole pulling on a ski ergometer.",
    category: "cardio",
    muscleGroups: ["back", "triceps", "shoulders", "core"],
    equipment: ["ski erg"],
    instructions: [
      "Stand facing the machine with feet about hip-width apart and handles raised.",
      "Bend your knees slightly and hinge as you pull both handles down past your hips; return smoothly to standing.",
      "Record the distance shown by the machine and your elapsed time; convert kilometers to miles if needed.",
    ],
    measurementType: "distance_time",
    baseXP: 20,
  },
  {
    name: "Ski Erg Intervals",
    description:
      "Repeated double-pole efforts with scheduled recovery periods.",
    category: "cardio",
    muscleGroups: ["back", "triceps", "shoulders", "core"],
    equipment: ["ski erg"],
    instructions: [
      "Warm up with controlled pulls and a light hip hinge.",
      "Pull through the planned work period and use the recovery period to reset your pace.",
      "Use the workout's work, recovery, and round targets; record the number of rounds you complete.",
    ],
    measurementType: "intervals",
    baseXP: 25,
  },
  {
    name: "Speed Bag",
    description: "Rhythmic punches on a small speed bag.",
    category: "cardio",
    muscleGroups: ["shoulders", "triceps", "forearms"],
    equipment: ["speed bag"],
    instructions: [
      "Adjust the platform so the bag is near eye level and stand close with elbows raised.",
      "Tap the bag with small controlled circles and establish an even rebound rhythm.",
      "Alternate hands while keeping the strikes light for the planned time.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Squat Thrust",
    description:
      "A conditioning repetition that moves from standing to a plank and back without a push-up.",
    category: "cardio",
    muscleGroups: ["quadriceps", "glutes", "core", "shoulders"],
    equipment: [],
    instructions: [
      "Squat down and place your hands on the floor beneath your shoulders.",
      "Step or jump your feet back into a stable plank.",
      "Bring your feet back toward your hands and stand tall to complete the repetition.",
    ],
    measurementType: "reps",
    baseXP: 15,
  },
  {
    name: "Stair Climber",
    description: "Continuous stepping on a stair-climbing machine.",
    category: "cardio",
    muscleGroups: ["quadriceps", "glutes", "calves"],
    equipment: ["stair climber"],
    instructions: [
      "Select a comfortable stepping speed and stand upright.",
      "Place each foot securely on the step and avoid resting your body weight on the rails.",
      "Continue for the planned duration and record your time.",
    ],
    measurementType: "duration",
    baseXP: 20,
  },
  {
    name: "Stair Climber Intervals",
    description:
      "Alternating faster stair climbing and easier recovery stepping.",
    category: "cardio",
    muscleGroups: ["quadriceps", "glutes", "calves"],
    equipment: ["stair climber"],
    instructions: [
      "Begin at a comfortable speed and stand upright on the machine.",
      "Change stepping speed for the planned work and recovery periods without hanging on the rails.",
      "Use the workout's work, recovery, and round targets; record the number of rounds you complete.",
    ],
    measurementType: "intervals",
    baseXP: 20,
  },
  {
    name: "Stair Walking",
    description: "Repeated walking up stairs at a controlled pace.",
    category: "cardio",
    muscleGroups: ["quadriceps", "glutes", "calves"],
    equipment: [],
    instructions: [
      "Choose a clear staircase with secure footing and a handrail nearby.",
      "Walk up one step at a time while keeping your posture tall.",
      "Walk down under control between climbs and record the total activity duration.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Star Jump",
    description:
      "An explosive jump that opens the arms and legs before landing.",
    category: "cardio",
    muscleGroups: ["quadriceps", "glutes", "calves", "shoulders"],
    equipment: [],
    instructions: [
      "Begin in a shallow squat with your feet together and arms close to your body.",
      "Jump upward and open your arms and legs into a star shape.",
      "Bring your feet back beneath you and land softly before repeating.",
    ],
    measurementType: "reps",
    baseXP: 20,
  },
  {
    name: "Stationary Bike",
    description: "Continuous cycling on a stationary exercise bicycle.",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "glutes", "calves"],
    equipment: ["stationary bike"],
    instructions: [
      "Adjust the saddle so your knee stays slightly bent when the pedal is farthest away.",
      "Pedal evenly with relaxed shoulders and resistance that allows a smooth cadence.",
      "Record the distance shown by the machine and your elapsed time; convert kilometers to miles if needed.",
    ],
    measurementType: "distance_time",
    baseXP: 15,
  },
  {
    name: "Stationary Bike Intervals",
    description: "Repeated cycling work periods separated by easier pedaling.",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "glutes"],
    equipment: ["stationary bike"],
    instructions: [
      "Adjust your seat and warm up with easy pedaling.",
      "Increase effort for the planned work period, then pedal easily through recovery.",
      "Use the workout's work, recovery, and round targets; record the number of rounds you complete.",
    ],
    measurementType: "intervals",
    baseXP: 20,
  },
  {
    name: "Step Aerobics",
    description: "Continuous stepping patterns on a low exercise step.",
    category: "cardio",
    muscleGroups: ["quadriceps", "glutes", "calves"],
    equipment: ["step"],
    instructions: [
      "Place a stable step on a nonslip surface and start facing it.",
      "Step up with one foot, bring the other foot up, then step down under control.",
      "Alternate the lead leg and add simple patterns while placing the full foot on the platform.",
    ],
    measurementType: "duration",
    baseXP: 15,
  },
  {
    name: "Step Jacks",
    description:
      "A stepping variation of jumping jacks without leaving the floor.",
    category: "cardio",
    muscleGroups: ["quadriceps", "glutes", "shoulders"],
    equipment: [],
    instructions: [
      "Stand tall with your feet together and arms down.",
      "Step one foot out while raising your arms, then return it as you lower your arms.",
      "Alternate sides with a steady rhythm for the planned time.",
    ],
    measurementType: "duration",
    baseXP: 10,
  },
  {
    name: "Trail Running",
    description:
      "A run on natural trails that adapts to changes in footing and elevation.",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "glutes", "calves"],
    equipment: [],
    instructions: [
      "Check the trail conditions and begin on terrain you can manage.",
      "Shorten your stride over uneven sections and watch the path ahead.",
      "Finish the route and record the distance covered and total elapsed time.",
    ],
    measurementType: "distance_time",
    baseXP: 20,
  },
  {
    name: "Treadmill Intervals",
    description: "Alternating treadmill running and recovery periods.",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "glutes", "calves"],
    equipment: ["treadmill"],
    instructions: [
      "Warm up at an easy belt speed with the safety clip attached.",
      "Adjust belt speed for the planned work and recovery periods while staying on the moving belt.",
      "Use the workout's work, recovery, and round targets; record the number of rounds you complete.",
    ],
    measurementType: "intervals",
    baseXP: 20,
  },
  {
    name: "Treadmill Running",
    description:
      "A continuous run on a treadmill with distance and time tracking.",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "glutes", "calves"],
    equipment: ["treadmill"],
    instructions: [
      "Begin with an easy belt speed and increase it gradually to your running pace.",
      "Run near the center of the belt with relaxed arms and a consistent stride.",
      "Record the distance shown by the machine and your elapsed time; convert kilometers to miles if needed.",
    ],
    measurementType: "distance_time",
    baseXP: 20,
  },
  {
    name: "Treadmill Walking",
    description: "Walking on a treadmill at a steady pace.",
    category: "cardio",
    muscleGroups: ["quadriceps", "glutes", "calves"],
    equipment: ["treadmill"],
    instructions: [
      "Set a comfortable belt speed and begin walking with an upright posture.",
      "Keep your stride natural and avoid supporting your body weight on the rails.",
      "Record the distance shown by the machine and your elapsed time; convert kilometers to miles if needed.",
    ],
    measurementType: "distance_time",
    baseXP: 10,
  },
  {
    name: "Tuck Jump",
    description: "An upward jump with the knees lifting toward the torso.",
    category: "cardio",
    muscleGroups: ["quadriceps", "glutes", "calves", "core"],
    equipment: [],
    instructions: [
      "Stand with your feet about hip-width apart and bend into a shallow squat.",
      "Jump upward and bring your knees toward your torso without rounding forward excessively.",
      "Land softly with your feet beneath you and reset before each repetition.",
    ],
    measurementType: "reps",
    baseXP: 25,
  },
  {
    name: "Walking",
    description:
      "A continuous walk at a comfortable pace for steady aerobic activity.",
    category: "cardio",
    muscleGroups: ["quadriceps", "glutes", "calves"],
    equipment: [],
    instructions: [
      "Keep your gaze ahead and let your arms swing naturally.",
      "Walk with relaxed shoulders and an even stride.",
      "Finish the route and record the distance covered and total elapsed time.",
    ],
    measurementType: "distance_time",
    baseXP: 10,
  },
  {
    name: "Wheelchair Propulsion",
    description:
      "Continuous wheelchair propulsion tracked by distance and elapsed time.",
    category: "cardio",
    muscleGroups: ["shoulders", "triceps", "back"],
    equipment: ["wheelchair"],
    instructions: [
      "Choose a level, clear route and check that the chair is set up correctly.",
      "Use smooth pushes on the hand rims and allow a relaxed recovery between pushes.",
      "Finish the route and record the distance covered and total elapsed time.",
    ],
    measurementType: "distance_time",
    baseXP: 15,
  },
  {
    name: "90/90 Hip Stretch",
    description:
      "A seated position that stretches the hips in opposing rotation angles.",
    category: "mobility",
    muscleGroups: ["glutes", "adductors", "abductors"],
    equipment: [],
    instructions: [
      "Sit with one shin in front and the other beside you, both knees near right angles.",
      "Lengthen your spine and hinge gently over the front thigh.",
      "Hold without pressing the knees down and reverse the leg positions.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "90/90 Hip Switch",
    description:
      "A seated hip rotation drill that moves the knees between opposite 90/90 positions.",
    category: "mobility",
    muscleGroups: ["glutes", "adductors", "abductors"],
    equipment: [],
    instructions: [
      "Sit with both knees bent to roughly right angles and your feet spread apart.",
      "Rotate both knees across to the other side while keeping your torso tall.",
      "Move back through the center, using your hands for balance if needed.",
    ],
    measurementType: "reps",
    baseXP: 5,
  },
  {
    name: "Adductor Rockback",
    description:
      "A kneeling hip hinge that mobilizes the inner thigh of an extended leg.",
    category: "mobility",
    muscleGroups: ["adductors", "glutes"],
    equipment: [],
    instructions: [
      "Begin on hands and knees and extend one leg sideways with its foot grounded.",
      "Keep your back long as you shift your hips toward the supporting heel.",
      "Rock forward again and repeat on each side without forcing the extended knee.",
    ],
    measurementType: "reps",
    baseXP: 5,
  },
  {
    name: "Ankle Circle",
    description:
      "A controlled circular ankle movement performed without weight-bearing.",
    category: "mobility",
    muscleGroups: ["calves"],
    equipment: [],
    instructions: [
      "Sit comfortably and lift one foot clear of the floor.",
      "Move that ankle through a slow circle while keeping your lower leg still.",
      "Reverse direction and repeat with the other foot.",
    ],
    measurementType: "reps",
    baseXP: 5,
  },
  {
    name: "Arm Circle",
    description: "A circular arm motion used to explore shoulder movement.",
    category: "mobility",
    muscleGroups: ["shoulders"],
    equipment: [],
    instructions: [
      "Stand with your arms extended to the sides at shoulder height.",
      "Make small circles from your shoulders and gradually widen them within a comfortable range.",
      "Reverse direction while keeping your neck relaxed and your torso still.",
    ],
    measurementType: "reps",
    baseXP: 5,
  },
  {
    name: "Bent-Knee Calf Stretch",
    description:
      "A wall-supported calf stretch performed with the rear knee flexed.",
    category: "mobility",
    muscleGroups: ["calves"],
    equipment: ["wall"],
    instructions: [
      "Face a wall and place one foot slightly behind the other.",
      "Bend the rear knee while keeping its heel flat on the floor.",
      "Shift forward gently until you feel a lower-calf stretch, then repeat on the other side.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Bow Pose",
    description:
      "A prone backbend formed by holding the ankles and lifting the chest.",
    category: "mobility",
    muscleGroups: ["quadriceps", "hip flexors", "chest", "shoulders", "back"],
    equipment: [],
    instructions: [
      "Lie face down, bend your knees, and hold your ankles if they are comfortably reachable.",
      "Press your feet into your hands to lift your chest and thighs slightly.",
      "Hold without pulling forcefully on your knees and lower gently.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Butterfly Stretch",
    description:
      "A seated inner-thigh stretch with the soles of the feet together.",
    category: "mobility",
    muscleGroups: ["adductors", "glutes"],
    equipment: [],
    instructions: [
      "Sit tall and bring the soles of your feet together in front of you.",
      "Let your knees open naturally while holding your feet lightly.",
      "Hinge forward slightly if comfortable and avoid pressing your knees down.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Camel Pose",
    description: "A kneeling backbend emphasizing the front hips and chest.",
    category: "mobility",
    muscleGroups: ["hip flexors", "quadriceps", "chest", "back"],
    equipment: [],
    instructions: [
      "Kneel tall with your knees near hip width and place your hands on your rear pelvis.",
      "Lift your chest and lean back gently while keeping your hips over your knees.",
      "Hold a modest backbend with your neck comfortable, then return upright slowly.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Cat-Cow",
    description:
      "A quadruped spinal movement alternating rounded and extended positions.",
    category: "mobility",
    muscleGroups: ["back", "core"],
    equipment: [],
    instructions: [
      "Start on your hands and knees with your wrists beneath your shoulders.",
      "Round your back and draw your chin gently toward your chest.",
      "Reverse by lifting your chest and sitting bones while keeping the movement comfortable.",
    ],
    measurementType: "reps",
    baseXP: 5,
  },
  {
    name: "Chair Pose",
    description: "A standing squat hold with the arms reaching overhead.",
    category: "mobility",
    muscleGroups: ["quadriceps", "glutes", "core", "shoulders"],
    equipment: [],
    instructions: [
      "Stand with your feet close together or hip width apart.",
      "Bend your knees and sit your hips backward while reaching your arms overhead.",
      "Hold with your weight balanced through your feet and your ribs controlled.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Child's Pose",
    description:
      "A kneeling folded position that lengthens the back and shoulders.",
    category: "mobility",
    muscleGroups: ["back", "shoulders", "glutes"],
    equipment: [],
    instructions: [
      "Kneel and bring your hips toward your heels with your knees comfortably apart.",
      "Fold your torso forward and extend your arms along the floor.",
      "Relax into a mild stretch while breathing steadily and avoiding forced knee flexion.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Cobra Pose",
    description:
      "A prone backbend with the pelvis grounded and the chest lifted.",
    category: "mobility",
    muscleGroups: ["back", "chest", "core"],
    equipment: [],
    instructions: [
      "Lie face down and place your palms beside your lower ribs.",
      "Lift your chest with light hand assistance while keeping your pelvis on the floor.",
      "Hold a modest backbend with your elbows softened and your gaze forward and down.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Couch Stretch",
    description:
      "A rear-foot-elevated kneeling stretch for the quadriceps and hip flexors.",
    category: "mobility",
    muscleGroups: ["quadriceps", "hip flexors"],
    equipment: ["wall", "exercise mat"],
    instructions: [
      "Kneel on padding with one shin against a wall and the opposite foot forward.",
      "Raise your torso gradually while keeping your pelvis gently tucked.",
      "Hold a mild front-thigh stretch and switch legs without forcing your back to arch.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Cow Face Arms Stretch",
    description: "An opposing behind-back reach that stretches both shoulders.",
    category: "mobility",
    muscleGroups: ["shoulders", "triceps", "chest"],
    equipment: ["yoga strap"],
    instructions: [
      "Reach one hand down your upper back and the other upward from your waist.",
      "Hold a strap between your hands if they do not meet comfortably.",
      "Keep your chest lifted and hold before exchanging arm positions.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Cross-Body Shoulder Stretch",
    description:
      "An across-chest reach that stretches the back of the shoulder.",
    category: "mobility",
    muscleGroups: ["shoulders", "back"],
    equipment: [],
    instructions: [
      "Bring one arm across your chest at a comfortable height.",
      "Use your opposite forearm to guide it closer without pressing on the elbow joint.",
      "Keep the stretched shoulder down and hold before changing sides.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Doorway Chest Stretch",
    description:
      "A doorway-supported stretch for the chest and front shoulder.",
    category: "mobility",
    muscleGroups: ["chest", "shoulders"],
    equipment: ["wall"],
    instructions: [
      "Place one forearm against a doorway with your elbow below or level with your shoulder.",
      "Step your body gently forward until you feel a mild chest stretch.",
      "Keep your shoulder relaxed and repeat with the other arm.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Downward-Facing Dog Pose",
    description:
      "An inverted V-shaped position stretching the posterior chain and shoulders.",
    category: "mobility",
    muscleGroups: ["hamstrings", "calves", "back", "shoulders"],
    equipment: [],
    instructions: [
      "From hands and knees, tuck your toes and lift your hips up and back.",
      "Press through your palms and lengthen your spine while keeping a slight knee bend if needed.",
      "Let your heels move toward the floor without forcing them down.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Eagle Arms Stretch",
    description:
      "A crossed-arm position that stretches the upper back and rear shoulders.",
    category: "mobility",
    muscleGroups: ["shoulders", "back"],
    equipment: [],
    instructions: [
      "Reach both arms forward and cross one elbow over the other.",
      "Bend your elbows and bring the backs of your hands or palms toward each other.",
      "Lift your elbows slightly, relax your shoulders, and repeat with the opposite arm on top.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Extended Side Angle Pose",
    description: "A standing lateral reach performed over a bent front leg.",
    category: "mobility",
    muscleGroups: ["quadriceps", "glutes", "adductors", "core", "shoulders"],
    equipment: [],
    instructions: [
      "Take a wide stance and bend the front knee with the rear leg extended.",
      "Rest your front forearm on the front thigh and reach your other arm overhead.",
      "Lengthen through the upper side of your torso and repeat on the opposite side.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Fire Log Pose",
    description:
      "A seated stacked-shin position that stretches the outer hips.",
    category: "mobility",
    muscleGroups: ["glutes", "abductors"],
    equipment: ["yoga block"],
    instructions: [
      "Sit with one shin in front and place the opposite ankle over the lower knee.",
      "Support the upper knee with a block if it remains elevated.",
      "Lengthen your spine and hold gently before reversing the leg stack.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Fish Pose",
    description:
      "A supported supine chest-opening position with the upper torso extended.",
    category: "mobility",
    muscleGroups: ["chest", "shoulders", "back"],
    equipment: [],
    instructions: [
      "Lie on your back with your legs comfortable and your forearms beside your torso.",
      "Press into your forearms to lift your chest while keeping your head lightly supported.",
      "Hold without loading your neck and lower your upper back smoothly.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Forearm Pronation and Supination",
    description: "A forearm rotation drill that turns the palms down and up.",
    category: "mobility",
    muscleGroups: ["forearms"],
    equipment: [],
    instructions: [
      "Bend your elbows to right angles and hold them close to your sides.",
      "Rotate your forearms to turn your palms downward without moving your elbows.",
      "Turn the palms upward and continue slowly through a comfortable range.",
    ],
    measurementType: "reps",
    baseXP: 5,
  },
  {
    name: "Frog Stretch",
    description: "A wide-knee floor stretch that targets the inner thighs.",
    category: "mobility",
    muscleGroups: ["adductors", "glutes"],
    equipment: ["exercise mat"],
    instructions: [
      "Start on hands and knees on padding and gradually widen your knees.",
      "Align your feet roughly with your knees and shift your hips backward slightly.",
      "Hold a gentle inner-thigh stretch without forcing your knees farther apart.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Garland Pose",
    description: "A deep wide squat used as a hip and ankle mobility position.",
    category: "mobility",
    muscleGroups: ["adductors", "glutes", "calves"],
    equipment: [],
    instructions: [
      "Stand with your feet slightly wider than your hips and turn your toes outward.",
      "Lower into a comfortable squat, placing support beneath your heels if needed.",
      "Bring your hands together and hold while keeping your chest lifted and knees aligned.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Gate Pose",
    description: "A kneeling side bend with one leg extended outward.",
    category: "mobility",
    muscleGroups: ["adductors", "hamstrings", "core", "shoulders"],
    equipment: ["exercise mat"],
    instructions: [
      "Kneel on one knee and extend the opposite leg sideways with its foot grounded.",
      "Slide the nearer hand along the extended leg and reach your other arm overhead.",
      "Lean gently toward the long leg, hold, and repeat on the other side.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Half Forward Fold",
    description:
      "A partial standing fold that lengthens the spine and posterior legs.",
    category: "mobility",
    muscleGroups: ["hamstrings", "back"],
    equipment: [],
    instructions: [
      "Stand with your feet near hip width and hinge forward.",
      "Place your hands on your shins and lengthen your chest forward until your torso is roughly level.",
      "Hold with soft knees and keep your neck aligned with your spine.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Half Moon Pose",
    description:
      "A single-leg side-opening balance supported by the lower hand.",
    category: "mobility",
    muscleGroups: ["glutes", "abductors", "hamstrings", "core"],
    equipment: ["yoga block"],
    instructions: [
      "Shift onto one leg and place the same-side hand on a block ahead of your foot.",
      "Lift the rear leg behind you and open your chest and pelvis toward the side.",
      "Hold with a softly extended standing knee and repeat on the other side.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Half Split Stretch",
    description:
      "A half-kneeling hinge that stretches the front leg's hamstrings.",
    category: "mobility",
    muscleGroups: ["hamstrings", "calves"],
    equipment: ["exercise mat"],
    instructions: [
      "Begin in a half-kneeling stance and shift your hips backward.",
      "Straighten the front leg comfortably with its heel grounded and toes lifted.",
      "Hinge toward the front thigh with a long spine and repeat on both sides.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Happy Baby Pose",
    description:
      "A supine hip-opening position with the knees drawn toward the ribs.",
    category: "mobility",
    muscleGroups: ["adductors", "glutes", "hamstrings"],
    equipment: [],
    instructions: [
      "Lie on your back and bend both knees toward your chest.",
      "Hold the outer edges of your feet or the backs of your thighs.",
      "Guide your knees gently outward while keeping your pelvis and shoulders relaxed.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Head-to-Knee Pose",
    description:
      "A seated single-leg forward fold with the opposite knee opened outward.",
    category: "mobility",
    muscleGroups: ["hamstrings", "adductors", "back"],
    equipment: [],
    instructions: [
      "Sit with one leg extended and the opposite foot resting near its inner thigh.",
      "Turn your torso toward the extended leg and hinge forward from your hips.",
      "Hold a comfortable stretch without forcing your head to reach the knee, then change sides.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Hero Pose",
    description:
      "A kneeling seated position that stretches the front thighs and ankles.",
    category: "mobility",
    muscleGroups: ["quadriceps", "calves"],
    equipment: ["yoga block", "exercise mat"],
    instructions: [
      "Kneel on padding with your knees close and your feet just outside your hips.",
      "Sit on a block between your heels to choose a comfortable height.",
      "Hold with an upright torso and stop short of pressure in your knees.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "High Lunge Pose",
    description: "A rear-heel-raised lunge hold with an upward reach.",
    category: "mobility",
    muscleGroups: ["quadriceps", "glutes", "hip flexors", "core", "shoulders"],
    equipment: [],
    instructions: [
      "Take a long staggered stance with your rear heel lifted.",
      "Bend the front knee and keep the rear leg extended without overstriding.",
      "Raise your arms and hold a steady upright torso before changing legs.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Hip Controlled Articular Rotation",
    description:
      "A slow single-leg circle that explores controlled hip movement.",
    category: "mobility",
    muscleGroups: ["glutes", "hip flexors", "adductors", "abductors"],
    equipment: ["wall"],
    instructions: [
      "Stand beside a wall for light balance support and lift one knee forward.",
      "Move the bent knee outward and then behind you without turning your pelvis.",
      "Reverse the path and repeat with the other leg through a comfortable range.",
    ],
    measurementType: "reps",
    baseXP: 5,
  },
  {
    name: "Knee-to-Chest Stretch",
    description: "A lying stretch that brings one bent leg toward the torso.",
    category: "mobility",
    muscleGroups: ["glutes", "back"],
    equipment: [],
    instructions: [
      "Lie on your back with one leg comfortably extended or bent.",
      "Hold behind the opposite thigh and draw its knee toward your chest.",
      "Keep your head and shoulders relaxed and repeat with the other leg.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Kneeling Ankle Plantar Flexion Stretch",
    description:
      "A kneeling ankle stretch that lengthens the front of the lower legs and feet.",
    category: "mobility",
    muscleGroups: ["tibialis anterior", "feet"],
    equipment: ["exercise mat"],
    instructions: [
      "Kneel on padding with the tops of your feet resting on the floor.",
      "Shift your hips toward your heels only as far as your feet and ankles allow comfortably.",
      "Hold gently and use your hands to reduce pressure when needed.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Kneeling Ankle Rock",
    description:
      "A half-kneeling ankle drill that guides the knee forward over the foot.",
    category: "mobility",
    muscleGroups: ["calves"],
    equipment: ["exercise mat"],
    instructions: [
      "Kneel with one foot planted ahead and its heel firmly grounded.",
      "Move the front knee forward over the middle toes without lifting the heel.",
      "Return to the start and complete controlled repetitions on both ankles.",
    ],
    measurementType: "reps",
    baseXP: 5,
  },
  {
    name: "Kneeling Hip Flexor Stretch",
    description:
      "A half-kneeling stretch that lengthens the front of the rear hip.",
    category: "mobility",
    muscleGroups: ["hip flexors", "quadriceps", "glutes"],
    equipment: ["exercise mat"],
    instructions: [
      "Kneel on one knee with the opposite foot planted in front.",
      "Gently tuck your pelvis and squeeze the rear glute before shifting forward slightly.",
      "Hold with your torso upright and repeat with the other leg behind.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Kneeling Lat Stretch",
    description:
      "A bench-supported overhead reach that stretches the lats and shoulders.",
    category: "mobility",
    muscleGroups: ["back", "shoulders", "triceps"],
    equipment: ["bench"],
    instructions: [
      "Kneel in front of a stable bench and place your elbows on its surface.",
      "Move your hips backward and lower your chest between your upper arms.",
      "Keep your abdomen lightly engaged and hold without pushing into your lower back.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Lateral Neck Stretch",
    description:
      "A gentle side-bending stretch for the upper shoulder and neck region.",
    category: "mobility",
    muscleGroups: ["neck", "trapezius"],
    equipment: [],
    instructions: [
      "Sit or stand tall and relax your shoulders downward.",
      "Tilt one ear toward the same-side shoulder while keeping your face forward.",
      "Hold a gentle stretch without pulling your head, then change sides.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Levator Scapulae Stretch",
    description:
      "A diagonal neck stretch directed toward the upper inner shoulder blade.",
    category: "mobility",
    muscleGroups: ["neck", "back"],
    equipment: [],
    instructions: [
      "Sit upright and turn your head slightly toward one armpit.",
      "Lower your chin gently in that diagonal direction while keeping the opposite shoulder relaxed.",
      "Hold without pressing on your head and repeat toward the other side.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Mountain Pose",
    description:
      "An upright yoga posture that develops awareness of standing alignment.",
    category: "mobility",
    muscleGroups: ["full body"],
    equipment: [],
    instructions: [
      "Stand with your feet comfortably together or hip width apart.",
      "Distribute your weight across both feet and lengthen through the crown of your head.",
      "Relax your shoulders and breathe steadily while keeping your knees softly extended.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Open Book Rotation",
    description:
      "A side-lying thoracic rotation drill with the knees held together.",
    category: "mobility",
    muscleGroups: ["back", "chest", "shoulders"],
    equipment: [],
    instructions: [
      "Lie on your side with bent knees and your arms extended together in front.",
      "Open your top arm across your body while rotating your chest toward the ceiling.",
      "Return slowly while keeping your knees stacked and repeat on both sides.",
    ],
    measurementType: "reps",
    baseXP: 5,
  },
  {
    name: "Overhead Triceps Stretch",
    description:
      "An overhead elbow-bending stretch for the triceps and surrounding shoulder tissues.",
    category: "mobility",
    muscleGroups: ["triceps", "shoulders"],
    equipment: [],
    instructions: [
      "Raise one arm overhead and bend its elbow so your hand reaches behind your head.",
      "Use your other hand to guide the elbow gently backward.",
      "Keep your ribs down and hold without forcing your neck forward.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Pigeon Pose",
    description:
      "A floor-based hip stretch with one bent leg forward and the other extended back.",
    category: "mobility",
    muscleGroups: ["glutes", "hip flexors", "abductors"],
    equipment: ["yoga block"],
    instructions: [
      "Bring one bent leg in front and extend the opposite leg behind you.",
      "Place support beneath the front hip if needed and keep your pelvis facing forward.",
      "Hold upright or fold slightly forward without forcing the front knee.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Prone Quadriceps Stretch",
    description:
      "A face-down front-thigh stretch with the pelvis supported by the floor.",
    category: "mobility",
    muscleGroups: ["quadriceps", "hip flexors"],
    equipment: [],
    instructions: [
      "Lie face down and bend one knee to bring the heel toward your hip.",
      "Hold the ankle with the same-side hand without lifting your pelvis.",
      "Maintain a mild stretch and repeat with the other leg.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Puppy Pose",
    description:
      "A kneeling overhead shoulder stretch with the hips above the knees.",
    category: "mobility",
    muscleGroups: ["shoulders", "back", "chest"],
    equipment: [],
    instructions: [
      "Begin on hands and knees and walk your hands forward.",
      "Keep your hips above your knees as you lower your chest toward the floor.",
      "Rest your forehead when comfortable and hold without forcing a lower-back arch.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Pyramid Pose",
    description:
      "A staggered straight-leg forward fold emphasizing the front hamstrings.",
    category: "mobility",
    muscleGroups: ["hamstrings", "glutes", "back"],
    equipment: [],
    instructions: [
      "Stand in a moderate staggered stance with your hips facing forward.",
      "Hinge over the front leg while keeping both heels comfortably grounded.",
      "Support your hands on your shin or blocks and hold with softened knees.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Quadruped Rockback",
    description:
      "A hands-and-knees hip motion that explores flexion with a steady spine.",
    category: "mobility",
    muscleGroups: ["glutes", "back", "hamstrings"],
    equipment: [],
    instructions: [
      "Place your hands beneath your shoulders and knees beneath your hips.",
      "Move your hips backward toward your heels while maintaining a comfortable spine position.",
      "Return forward smoothly and adjust your knee spacing to suit your range.",
    ],
    measurementType: "reps",
    baseXP: 5,
  },
  {
    name: "Quadruped Thoracic Rotation",
    description: "A hands-and-knees rotation drill that moves the upper spine.",
    category: "mobility",
    muscleGroups: ["back", "shoulders"],
    equipment: [],
    instructions: [
      "Start on your hands and knees and place one hand lightly behind your head.",
      "Turn your chest to lift that elbow toward the ceiling without shifting your hips.",
      "Rotate the elbow back toward the floor and complete both sides.",
    ],
    measurementType: "reps",
    baseXP: 5,
  },
  {
    name: "Quadruped Wrist Rock",
    description:
      "A weight-bearing wrist mobility drill performed on hands and knees.",
    category: "mobility",
    muscleGroups: ["forearms", "shoulders"],
    equipment: [],
    instructions: [
      "Set your palms flat with your fingers spread and your knees on the floor.",
      "Shift your shoulders forward a small distance while keeping the heels of your hands grounded.",
      "Rock back slowly and adjust the range to keep the wrists comfortable.",
    ],
    measurementType: "reps",
    baseXP: 5,
  },
  {
    name: "Reverse Tabletop",
    description:
      "A bent-knee face-up support position that opens the front shoulders and hips.",
    category: "mobility",
    muscleGroups: ["shoulders", "chest", "glutes", "core"],
    equipment: [],
    instructions: [
      "Sit with bent knees and place your hands behind your hips.",
      "Press through your palms and feet to lift your pelvis into a tabletop position.",
      "Keep your neck comfortable and lower your hips under control after the hold.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Reverse Warrior Pose",
    description: "A standing lunge with an overhead side reach.",
    category: "mobility",
    muscleGroups: ["quadriceps", "glutes", "core", "shoulders"],
    equipment: [],
    instructions: [
      "Begin in Warrior II with the front knee bent and arms extended.",
      "Slide the rear hand lightly down the rear leg and reach the front arm overhead.",
      "Hold a gentle side-body stretch without straightening the front knee.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Revolved Triangle Pose",
    description:
      "A standing hip hinge combined with controlled torso rotation.",
    category: "mobility",
    muscleGroups: ["hamstrings", "glutes", "back", "core"],
    equipment: ["yoga block"],
    instructions: [
      "Take a staggered stance with both legs comfortably extended.",
      "Hinge over the front leg and place the opposite hand on a block beside that foot.",
      "Rotate your chest gently toward the front leg and repeat on the other side.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Scapular Wall Slide",
    description:
      "A wall-supported shoulder drill that guides the forearms upward.",
    category: "mobility",
    muscleGroups: ["shoulders", "back"],
    equipment: ["wall"],
    instructions: [
      "Face a wall with your forearms resting on it and your elbows near shoulder height.",
      "Slide your forearms upward while gently pushing into the wall.",
      "Return slowly without shrugging or allowing your lower back to arch.",
    ],
    measurementType: "reps",
    baseXP: 5,
  },
  {
    name: "Seated Forward Fold",
    description: "A seated hip hinge that stretches the back of both legs.",
    category: "mobility",
    muscleGroups: ["hamstrings", "back"],
    equipment: [],
    instructions: [
      "Sit with your legs extended and your spine tall.",
      "Hinge forward from your hips and reach toward your shins or feet.",
      "Hold a comfortable stretch with softened knees rather than forcing your back to round.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Seated Spinal Twist",
    description:
      "An upright seated rotation with one knee crossed over the opposite leg.",
    category: "mobility",
    muscleGroups: ["back", "glutes", "core"],
    equipment: [],
    instructions: [
      "Sit tall and cross one bent leg over the other with the foot grounded.",
      "Rotate your chest toward the bent knee using your hands only for light support.",
      "Hold without pulling forcefully and repeat in the opposite direction.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Shoulder Controlled Articular Rotation",
    description:
      "A slow shoulder circle that explores controlled overhead and behind-body range.",
    category: "mobility",
    muscleGroups: ["shoulders"],
    equipment: [],
    instructions: [
      "Stand tall with one arm straight and your ribs held steady.",
      "Move that arm forward, overhead, and behind you through a slow comfortable circle.",
      "Reverse the circle and repeat with the other arm without twisting your torso.",
    ],
    measurementType: "reps",
    baseXP: 5,
  },
  {
    name: "Shoulder Extension Stretch",
    description:
      "A clasped-hand reach behind the torso that stretches the front shoulders.",
    category: "mobility",
    muscleGroups: ["shoulders", "chest"],
    equipment: [],
    instructions: [
      "Stand tall and clasp your hands behind your hips.",
      "Straighten your elbows gently and move your hands slightly away from your body.",
      "Keep your ribs stacked over your pelvis and hold without shrugging.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Shoulder Flexion Wall Stretch",
    description:
      "A wall-assisted reach that stretches the shoulders into overhead flexion.",
    category: "mobility",
    muscleGroups: ["shoulders", "back"],
    equipment: ["wall"],
    instructions: [
      "Face a wall and place both palms above shoulder height.",
      "Step backward and hinge at your hips while keeping your hands on the wall.",
      "Let your chest lower gently between your arms without forcing your lower back to arch.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Sleeper Stretch",
    description:
      "A side-lying shoulder rotation stretch performed with the upper arm supported.",
    category: "mobility",
    muscleGroups: ["shoulders"],
    equipment: [],
    instructions: [
      "Lie on one side with the lower upper arm extended in front and its elbow bent.",
      "Use the opposite hand to guide the lower forearm gently toward the floor.",
      "Stop at a mild stretch and repeat on the other side without rolling onto your arm.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Sphinx Pose",
    description: "A low prone backbend supported by the forearms.",
    category: "mobility",
    muscleGroups: ["back", "chest", "core"],
    equipment: [],
    instructions: [
      "Lie face down and place your elbows beneath or slightly ahead of your shoulders.",
      "Press your forearms into the floor and lengthen your chest forward.",
      "Hold with your pelvis grounded and avoid collapsing your neck backward.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Staff Pose",
    description: "An upright seated posture with the legs extended in front.",
    category: "mobility",
    muscleGroups: ["hamstrings", "back", "core"],
    equipment: [],
    instructions: [
      "Sit with both legs extended and your hands beside your hips.",
      "Lengthen your spine and flex your feet gently without locking your knees.",
      "Hold tall, sitting on a folded support if needed to avoid slumping.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Standing Forward Fold",
    description:
      "A standing hip fold that lengthens the posterior thighs and back.",
    category: "mobility",
    muscleGroups: ["hamstrings", "back", "calves"],
    equipment: [],
    instructions: [
      "Stand with your feet near hip width and soften your knees.",
      "Hinge at your hips and let your torso fold toward your thighs.",
      "Relax your head and hold a gentle stretch without locking your knees.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Standing Quadriceps Stretch",
    description: "A standing knee-flexion stretch for the front thigh.",
    category: "mobility",
    muscleGroups: ["quadriceps", "hip flexors"],
    equipment: ["wall"],
    instructions: [
      "Stand beside a wall and hold it lightly for balance.",
      "Bend one knee and hold that ankle behind you with your knees close together.",
      "Keep your pelvis gently tucked, hold, and change legs.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Standing Side Bend Stretch",
    description:
      "An overhead standing reach that lengthens one side of the torso.",
    category: "mobility",
    muscleGroups: ["core", "back", "shoulders"],
    equipment: [],
    instructions: [
      "Stand evenly on both feet and reach one arm overhead.",
      "Lean gently away from the raised arm while keeping your hips level.",
      "Hold without twisting forward and repeat on the other side.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Straight-Knee Calf Stretch",
    description:
      "A wall-supported stretch emphasizing the calf with the rear knee extended.",
    category: "mobility",
    muscleGroups: ["calves"],
    equipment: ["wall"],
    instructions: [
      "Place your hands on a wall and step one leg behind you.",
      "Keep the rear knee straight and heel grounded as you lean forward.",
      "Hold a mild calf stretch with the rear toes facing ahead and change legs.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Sun Salutation",
    description:
      "A continuous yoga sequence linking standing folds, support positions, and backbends.",
    category: "mobility",
    muscleGroups: ["full body"],
    equipment: [],
    instructions: [
      "Stand tall, reach overhead, and hinge into a forward fold before lengthening into a half fold.",
      "Step back to a plank, lower with control, and lift into a comfortable cobra or upward-facing dog.",
      "Move into downward-facing dog, step forward, and rise to standing to continue the flow.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Supine Bound Angle Pose",
    description:
      "A lying hip-opening position with the soles together and knees apart.",
    category: "mobility",
    muscleGroups: ["adductors", "glutes"],
    equipment: ["yoga block"],
    instructions: [
      "Lie on your back and bring the soles of your feet together.",
      "Let your knees open outward and place blocks beneath them if support is needed.",
      "Rest your arms comfortably and hold without pressing your thighs downward.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Supine Figure-Four Stretch",
    description:
      "A lying outer-hip stretch performed with one ankle crossed over a thigh.",
    category: "mobility",
    muscleGroups: ["glutes", "abductors"],
    equipment: [],
    instructions: [
      "Lie on your back and cross one ankle over the opposite thigh.",
      "Lift the uncrossed leg and hold behind its thigh to draw it toward your chest.",
      "Keep the crossed foot gently flexed and repeat on the other side.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Supine Hamstring Stretch",
    description: "A lying straight-leg stretch supported by a strap.",
    category: "mobility",
    muscleGroups: ["hamstrings", "calves"],
    equipment: ["yoga strap"],
    instructions: [
      "Lie on your back and loop a strap around the ball of one foot.",
      "Raise that leg while keeping the opposite leg comfortably grounded.",
      "Hold a gentle posterior-thigh stretch with a softened knee and change sides.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Supine Hip Internal Rotation",
    description:
      "A lying mobility drill that rotates bent legs inward at the hips.",
    category: "mobility",
    muscleGroups: ["glutes", "abductors", "adductors"],
    equipment: [],
    instructions: [
      "Lie on your back with bent knees and your feet wider than hip width.",
      "Let one knee move inward toward the opposite leg while keeping both feet grounded.",
      "Return to the center and alternate sides without forcing the knee.",
    ],
    measurementType: "reps",
    baseXP: 5,
  },
  {
    name: "Supine Pelvic Tilt",
    description:
      "A small lying pelvic motion that explores controlled lumbar positioning.",
    category: "mobility",
    muscleGroups: ["core", "back"],
    equipment: [],
    instructions: [
      "Lie on your back with bent knees and your feet flat.",
      "Tilt your pelvis to flatten your lower back gently toward the floor.",
      "Release toward a small natural arch and alternate slowly without moving your shoulders.",
    ],
    measurementType: "reps",
    baseXP: 5,
  },
  {
    name: "Supine Spinal Twist",
    description:
      "A lying rotational stretch performed with the shoulders grounded.",
    category: "mobility",
    muscleGroups: ["back", "glutes", "core"],
    equipment: [],
    instructions: [
      "Lie on your back and draw one bent knee toward your chest.",
      "Guide that knee across your body while extending your arms comfortably.",
      "Hold with both shoulders near the floor and repeat on the other side.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Thoracic Extension on Foam Roller",
    description: "A supported upper-back extension drill using a foam roller.",
    category: "mobility",
    muscleGroups: ["back", "chest"],
    equipment: ["foam roller"],
    instructions: [
      "Sit with a foam roller across your upper back and support your head with your hands.",
      "Gently lean backward over the roller while keeping your hips near the floor.",
      "Return upright and reposition the roller slightly without rolling onto your lower back.",
    ],
    measurementType: "reps",
    baseXP: 5,
  },
  {
    name: "Thread the Needle",
    description:
      "A kneeling rotational stretch that reaches one arm beneath the body.",
    category: "mobility",
    muscleGroups: ["back", "shoulders"],
    equipment: [],
    instructions: [
      "Begin on hands and knees and slide one arm beneath your opposite arm.",
      "Lower the reaching shoulder toward the floor while keeping your hips above your knees.",
      "Hold gently, return to the start, and repeat on the other side.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Toe Flexor Stretch",
    description:
      "A toe-extension stretch that lengthens the underside of the foot.",
    category: "mobility",
    muscleGroups: ["feet"],
    equipment: ["exercise mat"],
    instructions: [
      "Kneel on padding and tuck your toes beneath your feet.",
      "Shift your hips gradually toward your heels until you feel a mild stretch beneath the toes.",
      "Keep your hands grounded to control pressure and release slowly.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Tree Pose",
    description:
      "A single-leg yoga balance with the other foot supported on the standing leg.",
    category: "mobility",
    muscleGroups: ["glutes", "abductors", "core"],
    equipment: [],
    instructions: [
      "Stand on one leg and place the other foot against the ankle, calf, or inner thigh.",
      "Avoid pressing the foot directly into the knee and keep your pelvis level.",
      "Hold with your gaze on a fixed point and repeat on the other leg.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Triangle Pose",
    description: "A wide-stance side hinge with both legs extended.",
    category: "mobility",
    muscleGroups: ["hamstrings", "adductors", "core", "shoulders"],
    equipment: [],
    instructions: [
      "Stand wide and turn one foot outward while keeping both knees softly extended.",
      "Reach toward that foot and rest your lower hand on your shin or a block.",
      "Open your chest and reach your upper arm upward without collapsing your lower side.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Upward-Facing Dog Pose",
    description:
      "A supported backbend with the thighs lifted and the chest open.",
    category: "mobility",
    muscleGroups: ["chest", "shoulders", "back", "core"],
    equipment: [],
    instructions: [
      "Lie face down with your palms near your waist and the tops of your feet grounded.",
      "Press to straight arms and lift your chest and thighs from the floor.",
      "Keep your shoulders away from your ears and lower smoothly after the hold.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Wall Angel",
    description:
      "A back-to-wall arm sweep that challenges shoulder and upper-back motion.",
    category: "mobility",
    muscleGroups: ["shoulders", "back"],
    equipment: ["wall"],
    instructions: [
      "Stand with your back near a wall and bend your elbows into a goalpost position.",
      "Move your arms overhead while keeping your ribs controlled and your shoulders relaxed.",
      "Lower your arms through the same path without forcing contact with the wall.",
    ],
    measurementType: "reps",
    baseXP: 5,
  },
  {
    name: "Warrior I Pose",
    description:
      "A staggered standing posture combining hip opening with an overhead reach.",
    category: "mobility",
    muscleGroups: ["quadriceps", "glutes", "hip flexors", "shoulders"],
    equipment: [],
    instructions: [
      "Take a long staggered stance and turn your rear foot outward slightly.",
      "Bend the front knee while keeping the rear heel grounded and your chest facing forward.",
      "Raise your arms overhead and hold without forcing your hips to square.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Warrior II Pose",
    description: "A wide standing lunge with the torso open to the side.",
    category: "mobility",
    muscleGroups: ["quadriceps", "glutes", "adductors", "shoulders"],
    equipment: [],
    instructions: [
      "Take a wide stance and turn one foot outward while angling the rear foot slightly inward.",
      "Bend the front knee over its ankle and extend your arms sideways.",
      "Hold with your torso upright and repeat facing the other direction.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Warrior III Pose",
    description:
      "A single-leg balancing hinge with the torso and free leg extended.",
    category: "mobility",
    muscleGroups: ["glutes", "hamstrings", "core", "back"],
    equipment: [],
    instructions: [
      "Stand on one leg and hinge forward as the other leg extends backward.",
      "Reach your arms forward or keep them beside your body while keeping your hips square.",
      "Hold a controlled horizontal or shallower position and repeat on both legs.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Wide-Angle Seated Forward Fold",
    description:
      "A seated wide-leg fold that stretches the adductors and hamstrings.",
    category: "mobility",
    muscleGroups: ["adductors", "hamstrings", "back"],
    equipment: [],
    instructions: [
      "Sit tall and open your legs into a comfortable wide angle.",
      "Hinge forward with your hands supported in front of you.",
      "Hold while keeping your knees facing upward and avoiding a forced rounded spine.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Wide-Legged Standing Forward Fold",
    description:
      "A wide-stance hip fold that stretches the hamstrings and inner thighs.",
    category: "mobility",
    muscleGroups: ["hamstrings", "adductors", "back"],
    equipment: [],
    instructions: [
      "Take a wide stance with your feet facing mostly forward.",
      "Hinge from your hips and lower your torso while keeping your weight distributed across both feet.",
      "Place your hands on the floor or a block and hold without forcing depth.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "World's Greatest Stretch",
    description:
      "A lunge-based mobility sequence combining hip opening and thoracic rotation.",
    category: "mobility",
    muscleGroups: ["hip flexors", "hamstrings", "glutes", "back", "shoulders"],
    equipment: [],
    instructions: [
      "Step into a long lunge and place both hands inside the front foot.",
      "Rotate your chest and reach the nearer arm upward while keeping your rear leg long.",
      "Return the hand, shift your hips back briefly, and repeat on the other side.",
    ],
    measurementType: "reps",
    baseXP: 5,
  },
  {
    name: "Wrist Circle",
    description:
      "A controlled circular wrist movement performed without loading the hands.",
    category: "mobility",
    muscleGroups: ["forearms"],
    equipment: [],
    instructions: [
      "Extend your arms comfortably and make loose fists.",
      "Rotate both wrists through slow circles while keeping your forearms still.",
      "Reverse direction and avoid forcing through a stiff or painful angle.",
    ],
    measurementType: "reps",
    baseXP: 5,
  },
  {
    name: "Wrist Extensor Stretch",
    description: "A straight-arm stretch for the back-of-forearm muscles.",
    category: "mobility",
    muscleGroups: ["forearms"],
    equipment: [],
    instructions: [
      "Extend one arm with your palm facing downward.",
      "Bend the wrist and use your other hand to guide the fingers gently toward you.",
      "Hold a mild stretch with your shoulder relaxed and change arms.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
  {
    name: "Wrist Flexor Stretch",
    description: "A straight-arm stretch for the palm-side forearm muscles.",
    category: "mobility",
    muscleGroups: ["forearms"],
    equipment: [],
    instructions: [
      "Extend one arm in front with your palm facing upward.",
      "Use the opposite hand to guide your fingers downward and back gently.",
      "Keep the elbow straight but relaxed and repeat with the other arm.",
    ],
    measurementType: "duration",
    baseXP: 5,
  },
];

// END EXERCISE CATALOG

// Match the normalization used by exercise.service.js.
const normalizeName = (name) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[\s-_]/g, "");

const makeSlug = (name) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const buildExerciseDocuments = () =>
  exerciseCatalog.map((exercise) => ({
    ...exercise,
    name: exercise.name.trim(),
    normalizedName: normalizeName(exercise.name),
    slug: makeSlug(exercise.name),
    videoUrl: null,
    isActive: true,
  }));

// Validate whole documents before any DB connection: bulk upsert operations
// do not run all the document validators used by Exercise.create().
export const validateExerciseDocuments = async (documents) => {
  const normalizedNames = new Set();
  const slugs = new Set();

  for (const document of documents) {
    if (normalizedNames.has(document.normalizedName)) {
      throw new Error(`Duplicate exercise name in catalog: ${document.name}`);
    }
    if (slugs.has(document.slug)) {
      throw new Error(`Duplicate exercise slug in catalog: ${document.slug}`);
    }
    normalizedNames.add(document.normalizedName);
    slugs.add(document.slug);

    const { normalizedName, ...requestFields } = document;
    const validation = createExerciseSchema.body.validate(requestFields, {
      abortEarly: false,
      convert: false,
    });
    if (validation.error) {
      throw new Error(
        `Invalid exercise ${document.name}: ${validation.error.message}`,
      );
    }
    if (normalizedName !== normalizeName(document.name)) {
      throw new Error(`Incorrect normalized name: ${document.name}`);
    }
    if (document.instructions.length < 3) {
      throw new Error(
        `Exercise needs at least three instructions: ${document.name}`,
      );
    }

    const exercise = new Exercise(document);
    await exercise.validate();
  }
};

const printCatalogSummary = (documents) => {
  const counts = documents.reduce((totals, document) => {
    totals[document.category] = (totals[document.category] ?? 0) + 1;
    return totals;
  }, {});
  console.log(`Validated ${documents.length} exercise documents.`);
  console.log(
    Object.entries(counts)
      .map(([category, count]) => `${category}: ${count}`)
      .join(", "),
  );
};

export const seedExercises = async ({ dryRun = false } = {}) => {
  const documents = buildExerciseDocuments();
  await validateExerciseDocuments(documents);
  printCatalogSummary(documents);

  if (dryRun) {
    console.log("Dry run complete. No database connection or changes.");
    return;
  }

  dotenv.config({
    path: fileURLToPath(new URL("../../.env", import.meta.url)),
    quiet: true,
  });
  if (!process.env.MONGO_URI?.trim()) {
    throw new Error(
      "Set MONGO_URI in outrise-api/.env or your environment before seeding.",
    );
  }

  let insertedCount = 0;
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    await Exercise.init();

    // Include archived and legacy records to avoid restoring or duplicating them.
    const existingExercises = await Exercise.find({})
      .select("name slug +normalizedName")
      .lean();
    const existingNames = new Set();
    const existingSlugs = new Set();
    for (const exercise of existingExercises) {
      existingNames.add(normalizeName(exercise.name));
      if (exercise.normalizedName) {
        existingNames.add(exercise.normalizedName);
      }
      if (exercise.slug) {
        existingSlugs.add(exercise.slug);
      }
    }

    const missingExercises = documents.filter(
      (exercise) =>
        !existingNames.has(exercise.normalizedName) &&
        !existingSlugs.has(exercise.slug),
    );
    const skippedCount = documents.length - missingExercises.length;
    console.log(
      `Existing matches skipped: ${skippedCount}. Missing: ${missingExercises.length}.`,
    );

    // $setOnInsert makes reruns insert-only. Disable automatic timestamp updates
    // so even a document created concurrently is left entirely unchanged.
    const batchSize = 100;
    for (
      let offset = 0;
      offset < missingExercises.length;
      offset += batchSize
    ) {
      const batch = missingExercises.slice(offset, offset + batchSize);
      const now = new Date();
      const operations = batch.map((exercise) => ({
        updateOne: {
          filter: {
            $or: [
              { name: exercise.name },
              { normalizedName: exercise.normalizedName },
              { slug: exercise.slug },
            ],
          },
          update: {
            $setOnInsert: { ...exercise, createdAt: now, updatedAt: now },
          },
          upsert: true,
          timestamps: false,
        },
      }));
      const result = await Exercise.bulkWrite(operations, {
        ordered: true,
        timestamps: false,
      });
      insertedCount += result.upsertedCount;
      console.log(
        `Processed ${offset + batch.length}/${missingExercises.length} missing exercises.`,
      );
    }

    console.log(
      `Complete. Inserted: ${insertedCount}. Skipped: ${documents.length - insertedCount}. Existing exercises preserved.`,
    );
  } catch (error) {
    // A failed batch can have inserted some documents. Rerunning is safe because
    // every write only inserts when its name/slug is missing; nothing is removed.
    console.error(
      `Seeding stopped; some inserts may have succeeded (${error.name}). Existing exercises were not overwritten.`,
    );
    throw error;
  } finally {
    await mongoose.disconnect();
  }
};

const main = async () => {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log("Usage: node src/seeds/seedExercises.js [--dry-run]");
    console.log(
      "Without --dry-run, inserts missing exercises using MONGO_URI.",
    );
    return;
  }
  if (args.some((argument) => argument !== "--dry-run")) {
    throw new Error("Unknown argument. Use --help or --dry-run.");
  }
  await seedExercises({ dryRun: args.includes("--dry-run") });
};

// Importing this module does not connect to MongoDB or execute the seeder.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    // Do not print connection strings, credentials, or driver error payloads.
    if (error.name === "Error") {
      console.error(error.message);
    } else {
      console.error(
        `Exercise seeding failed (${error.name}). Check the database connection and exercise indexes.`,
      );
    }
    process.exitCode = 1;
  });
}
