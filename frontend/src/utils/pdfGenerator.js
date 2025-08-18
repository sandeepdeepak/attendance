import jsPDF from "jspdf";

// Helper function to capitalize first letter of a string
const capitalizeFirstLetter = (string) => {
  if (!string) return "";
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// Function to format date for display
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

// Modern design helper functions
const addModernHeader = (doc, title, member, selectedDate) => {
  const pageWidth = doc.internal.pageSize.width;

  // Header background
  doc.setFillColor(10, 31, 46); // Dark blue-gray
  doc.rect(0, 0, pageWidth, 30, "F");

  // White title text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth / 2, 15, { align: "center" });

  // Subtitle with member info
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${member.fullName} • ${formatDate(selectedDate)}`,
    pageWidth / 2,
    24,
    { align: "center" }
  );

  // Reset text color for body content
  doc.setTextColor(0, 0, 0);

  return 40; // Return starting Y position for content
};

const addModernSection = (doc, title, yPosition, color = [59, 130, 246]) => {
  const pageWidth = doc.internal.pageSize.width;

  // Section header background
  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(15, yPosition - 5, pageWidth - 30, 15, "F");

  // White section title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(title, 20, yPosition + 4);

  // Reset text color
  doc.setTextColor(0, 0, 0);

  return yPosition + 15;
};

const addModernCard = (
  doc,
  x,
  y,
  width,
  height,
  content,
  bgColor = [248, 250, 252]
) => {
  // Card background
  doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
  doc.rect(x, y, width, height, "F");

  // Card border
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.rect(x, y, width, height, "S");

  return { x: x + 8, y: y + 4 }; // Return content position with padding
};

const addProgressBar = (
  doc,
  x,
  y,
  width,
  percentage,
  color = [34, 197, 94]
) => {
  // Background bar
  doc.setFillColor(229, 231, 235);
  doc.rect(x, y, width, 4, "F");

  // Progress bar
  const progressWidth = (width * percentage) / 100;
  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(x, y, progressWidth, 4, "F");

  // Percentage text
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(75, 85, 99);
  doc.text(`${percentage}%`, x + width + 5, y + 3);

  doc.setTextColor(0, 0, 0);
};

// Function to generate Diet Plan PDF
export const generateDietPlanPDF = (
  member,
  selectedDate,
  dietPlan,
  nutritionTotals,
  calculatedCalories,
  recommendedNutrition
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let yPosition = 20;

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Daily Diet Plan", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 15;

  // Member info
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Member: ${member.fullName}`, 20, yPosition);
  yPosition += 10;
  doc.text(`Date: ${formatDate(selectedDate)}`, 20, yPosition);
  yPosition += 15;

  // Calorie Information
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Daily Calorie Goal", 20, yPosition);
  yPosition += 8;
  doc.setFont("helvetica", "normal");
  if (calculatedCalories && calculatedCalories.dailyCalories) {
    doc.text(`Target: ${calculatedCalories.dailyCalories} kcal`, 20, yPosition);
    yPosition += 6;
    doc.text(`Current: ${nutritionTotals.calories} kcal`, 20, yPosition);
    yPosition += 6;
    const percentage = Math.round(
      (nutritionTotals.calories / calculatedCalories.dailyCalories) * 100
    );
    doc.text(`Progress: ${percentage}%`, 20, yPosition);
  } else {
    doc.text(`Current: ${nutritionTotals.calories} kcal`, 20, yPosition);
  }
  yPosition += 15;

  // Meals section
  const meals = ["breakfast", "lunch", "dinner"];
  const mealNames = ["BREAKFAST", "LUNCH", "DINNER"];

  meals.forEach((mealType, index) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(mealNames[index], 20, yPosition);
    yPosition += 10;

    if (dietPlan[mealType] && dietPlan[mealType].length > 0) {
      dietPlan[mealType].forEach((food) => {
        // Check if we need a new page for food items
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`• ${capitalizeFirstLetter(food.name)}`, 25, yPosition);
        yPosition += 6;
        doc.text(
          `  ${food.totalCalories || food.calories} kcal | ${food.quantity} ${
            food.serving_unit
          }`,
          30,
          yPosition
        );
        yPosition += 6;
        doc.text(
          `  ${food.totalCarbs || food.carbs}g Carbs | ${
            food.totalFats || food.fats
          }g Fats | ${food.totalProteins || food.proteins}g Proteins`,
          30,
          yPosition
        );
        yPosition += 8;
      });
    } else {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text("No items added", 25, yPosition);
      yPosition += 8;
    }
    yPosition += 5;
  });

  // Nutrition Summary
  if (yPosition > pageHeight - 80) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Nutrition Summary", 20, yPosition);
  yPosition += 15;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  // Calories
  doc.text(
    `Calories: ${nutritionTotals.calories} / ${
      calculatedCalories?.dailyCalories || 0
    } kcal`,
    20,
    yPosition
  );
  yPosition += 8;

  // Proteins
  doc.text(
    `Proteins: ${nutritionTotals.proteins} / ${recommendedNutrition.proteins} g`,
    20,
    yPosition
  );
  yPosition += 8;

  // Carbs
  doc.text(
    `Carbohydrates: ${nutritionTotals.carbs} / ${recommendedNutrition.carbs} g`,
    20,
    yPosition
  );
  yPosition += 8;

  // Fats
  doc.text(
    `Fats: ${nutritionTotals.fats} / ${recommendedNutrition.fats} g`,
    20,
    yPosition
  );
  yPosition += 8;

  // Fiber
  doc.text(
    `Fiber: ${nutritionTotals.fibre} / ${recommendedNutrition.fibre} g`,
    20,
    yPosition
  );

  // Generate filename
  const fileName = `${member.fullName.replace(
    /\s+/g,
    "_"
  )}_Diet_Plan_${selectedDate}.pdf`;

  // Save the PDF
  doc.save(fileName);
};

// Function to generate Combined Plan PDF (Both Diet and Workout)
export const generateCombinedPlanPDF = (
  member,
  selectedDate,
  dietPlan,
  nutritionTotals,
  calculatedCalories,
  recommendedNutrition,
  workoutPlan,
  completedWorkouts
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Modern header
  let yPosition = addModernHeader(doc, "Daily Diet Plan", member, selectedDate);

  // =================
  // DIET PLAN SECTION
  // =================
  yPosition = addModernSection(doc, "NUTRITION PLAN", yPosition, [2, 74, 114]);

  // Calorie Information Card
  const calorieCardPos = addModernCard(
    doc,
    15,
    yPosition,
    pageWidth - 30,
    45,
    null,
    [254, 249, 195]
  );

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(133, 77, 14);
  doc.text(
    "Daily Calorie Progress",
    calorieCardPos.x + 15,
    calorieCardPos.y + 5
  );

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 113, 108);

  if (calculatedCalories && calculatedCalories.dailyCalories) {
    const percentage = Math.round(
      (nutritionTotals.calories / calculatedCalories.dailyCalories) * 100
    );
    doc.text(
      `${nutritionTotals.calories} / ${calculatedCalories.dailyCalories} kcal`,
      calorieCardPos.x,
      calorieCardPos.y + 18
    );
    addProgressBar(
      doc,
      calorieCardPos.x,
      calorieCardPos.y + 25,
      120,
      percentage,
      [245, 158, 11]
    );
  } else {
    doc.text(
      `Current: ${nutritionTotals.calories} kcal`,
      calorieCardPos.x,
      calorieCardPos.y + 18
    );
  }

  doc.setTextColor(0, 0, 0);
  yPosition += 55;

  // Meals section with modern cards
  const meals = ["breakfast", "lunch", "dinner"];
  const mealNames = ["BREAKFAST", "LUNCH", "DINNER"];
  const mealColors = [
    [2, 74, 114],
    [2, 74, 114],
    [2, 74, 114],
  ];

  meals.forEach((mealType, index) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }

    // Meal section header
    yPosition = addModernSection(
      doc,
      mealNames[index],
      yPosition,
      mealColors[index]
    );

    if (dietPlan[mealType] && dietPlan[mealType].length > 0) {
      dietPlan[mealType].forEach((food, foodIndex) => {
        // Check if we need a new page for food items
        if (yPosition > pageHeight - 10) {
          doc.addPage();
          yPosition = 20;
        }

        // Food item card
        const cardHeight = 35;
        const cardPos = addModernCard(
          doc,
          15,
          yPosition,
          pageWidth - 30,
          cardHeight,
          null,
          [249, 250, 251]
        );

        // Food name
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(31, 41, 55);
        doc.text(
          `${foodIndex + 1}. ${capitalizeFirstLetter(food.name)}`,
          cardPos.x,
          cardPos.y + 5
        );

        // Nutrition info
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(107, 114, 128);
        doc.text(
          `${food.totalCalories || food.calories} kcal • ${food.quantity} ${
            food.serving_unit
          }`,
          cardPos.x,
          cardPos.y + 15
        );
        doc.text(
          `Carbs: ${food.totalCarbs || food.carbs}g • Fats: ${
            food.totalFats || food.fats
          }g • Proteins: ${food.totalProteins || food.proteins}g`,
          cardPos.x,
          cardPos.y + 25
        );

        doc.setTextColor(0, 0, 0);
        yPosition += cardHeight + 4;
      });
    } else {
      const cardPos = addModernCard(
        doc,
        15,
        yPosition,
        pageWidth - 30,
        25,
        null,
        [254, 243, 199]
      );
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(146, 64, 14);
      doc.text("No items added to this meal", cardPos.x, cardPos.y + 8);
      doc.setTextColor(0, 0, 0);
      yPosition += 35;
    }
    yPosition += 10;
  });

  // Nutrition Summary with modern layout
  if (yPosition > pageHeight - 80) {
    doc.addPage();
    yPosition = 20;
  }

  yPosition = addModernSection(
    doc,
    "NUTRITION SUMMARY",
    yPosition,
    [2, 74, 114]
  );

  // Nutrition cards in grid layout
  const nutritionData = [
    {
      name: "Calories",
      current: nutritionTotals.calories,
      target: calculatedCalories?.dailyCalories || 0,
      unit: "kcal",
      color: [239, 68, 68],
    },
    {
      name: "Proteins",
      current: nutritionTotals.proteins,
      target: recommendedNutrition.proteins,
      unit: "g",
      color: [34, 197, 94],
    },
    {
      name: "Carbs",
      current: nutritionTotals.carbs,
      target: recommendedNutrition.carbs,
      unit: "g",
      color: [251, 146, 60],
    },
    {
      name: "Fats",
      current: nutritionTotals.fats,
      target: recommendedNutrition.fats,
      unit: "g",
      color: [168, 85, 247],
    },
    {
      name: "Fiber",
      current: nutritionTotals.fibre,
      target: recommendedNutrition.fibre,
      unit: "g",
      color: [6, 182, 212],
    },
  ];

  nutritionData.forEach((nutrient, index) => {
    const row = Math.floor(index / 2);
    const col = index % 2;
    const x = 15 + col * 85;
    const y = yPosition + row * 35;

    // Check if we need a new page
    if (y > pageHeight) {
      doc.addPage();
      yPosition = 20;
      return;
    }

    const cardPos = addModernCard(doc, x, y, 80, 30, null, [249, 250, 251]);

    // Nutrient name
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(nutrient.color[0], nutrient.color[1], nutrient.color[2]);
    doc.text(nutrient.name, cardPos.x, cardPos.y + 5);

    // Values
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);
    doc.text(
      `${nutrient.current}/${nutrient.target} ${nutrient.unit}`,
      cardPos.x,
      cardPos.y + 15
    );

    // Progress bar
    const percentage =
      nutrient.target > 0
        ? Math.min(Math.round((nutrient.current / nutrient.target) * 100), 100)
        : 0;
    addProgressBar(
      doc,
      cardPos.x,
      cardPos.y + 20,
      55,
      percentage,
      nutrient.color
    );
  });

  yPosition += 75;
  doc.setTextColor(0, 0, 0);

  // ===================
  // WORKOUT PLAN SECTION
  // ===================

  // Start on new page for workout section
  doc.addPage();
  yPosition = addModernHeader(doc, "Daily Workout Plan", member, selectedDate);

  yPosition = addModernSection(doc, "WORKOUT PLAN", yPosition, [2, 74, 114]);

  // Exercises with modern cards
  if (workoutPlan.exercises && workoutPlan.exercises.length > 0) {
    workoutPlan.exercises.forEach((exercise, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
        // yPosition = addModernHeader(
        //   doc,
        //   "Daily Health & Fitness Plan",
        //   member,
        //   selectedDate
        // );
      }

      const isCompleted = completedWorkouts[exercise.id];
      const cardHeight = 50 + (exercise.sets ? exercise.sets.length * 8 : 8);

      // Exercise card with completion status color
      const cardColor = isCompleted ? [220, 252, 231] : [249, 250, 251];
      const cardPos = addModernCard(
        doc,
        15,
        yPosition,
        pageWidth - 30,
        cardHeight,
        null,
        cardColor
      );

      // Exercise name with completion status
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      if (isCompleted) {
        doc.setTextColor(22, 163, 74);
        doc.text(
          `${index + 1}. ${capitalizeFirstLetter(exercise.name)}`,
          cardPos.x,
          cardPos.y + 5
        );
      } else {
        doc.setTextColor(31, 41, 55);
        doc.text(
          `${index + 1}. ${capitalizeFirstLetter(exercise.name)}`,
          cardPos.x,
          cardPos.y + 5
        );
      }

      // Exercise details in modern layout
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);

      let detailY = cardPos.y + 15;
      if (exercise.bodyPart) {
        doc.text(
          `Target: ${capitalizeFirstLetter(exercise.bodyPart)}`,
          cardPos.x,
          detailY
        );
        detailY += 8;
      }
      if (exercise.equipment) {
        doc.text(
          `Equipment: ${capitalizeFirstLetter(exercise.equipment)}`,
          cardPos.x,
          detailY
        );
        detailY += 8;
      }

      // Sets information with modern styling
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(75, 85, 99);
      doc.text(`Sets: ${exercise.setCount || 1}`, cardPos.x, detailY);
      detailY += 10;

      // Set details in organized format
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      if (exercise.sets && exercise.sets.length > 0) {
        exercise.sets.forEach((set, setIndex) => {
          let setInfo = `Set ${setIndex + 1}: ${set.reps} reps`;

          // Only show weight for equipment that uses weights
          if (
            ["leverage machine", "barbell", "dumbbell", "weighted"].includes(
              exercise.equipment
            )
          ) {
            setInfo += ` @ ${set.weight}kg`;
          }

          doc.text(setInfo, cardPos.x + 10, detailY);
          detailY += 8;
        });
      } else {
        doc.text(
          `Default: ${exercise.repsCount || 10} reps`,
          cardPos.x + 10,
          detailY
        );
      }

      doc.setTextColor(0, 0, 0);
      yPosition += cardHeight + 10;
    });
  } else {
    // No exercises card
    const noExerciseCardPos = addModernCard(
      doc,
      15,
      yPosition,
      pageWidth - 50,
      35,
      null,
      [254, 243, 199]
    );
    doc.setFontSize(11);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(146, 64, 14);
    doc.text(
      "No exercises added to this workout plan.",
      noExerciseCardPos.x,
      noExerciseCardPos.y + 12
    );
    doc.setTextColor(0, 0, 0);
  }

  // Generate filename
  const fileName = `${member.fullName.replace(
    /\s+/g,
    "_"
  )}_Complete_Plan_${selectedDate}.pdf`;

  // Save the PDF
  doc.save(fileName);
};

// Function to generate Workout Plan PDF
export const generateWorkoutPlanPDF = (
  member,
  selectedDate,
  workoutPlan,
  completedWorkouts
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let yPosition = 20;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Daily Workout Plan", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 15;

  // Member info
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Member: ${member.fullName}`, 20, yPosition);
  yPosition += 10;
  doc.text(`Date: ${formatDate(selectedDate)}`, 20, yPosition);
  yPosition += 20;

  // Exercises
  if (workoutPlan.exercises && workoutPlan.exercises.length > 0) {
    workoutPlan.exercises.forEach((exercise, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      // Exercise name
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const isCompleted = completedWorkouts[exercise.id];
      const completionText = isCompleted ? " ✓ COMPLETED" : "";
      doc.text(
        `${index + 1}. ${capitalizeFirstLetter(
          exercise.name
        )}${completionText}`,
        20,
        yPosition
      );
      yPosition += 8;

      // Exercise details
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      if (exercise.bodyPart) {
        doc.text(
          `Target: ${capitalizeFirstLetter(exercise.bodyPart)}`,
          25,
          yPosition
        );
        yPosition += 6;
      }
      if (exercise.equipment) {
        doc.text(
          `Equipment: ${capitalizeFirstLetter(exercise.equipment)}`,
          25,
          yPosition
        );
        yPosition += 6;
      }

      // Sets information
      doc.text(`Sets: ${exercise.setCount || 1}`, 25, yPosition);
      yPosition += 6;

      // Set details
      if (exercise.sets && exercise.sets.length > 0) {
        exercise.sets.forEach((set, setIndex) => {
          let setInfo = `  Set ${setIndex + 1}: ${set.reps} reps`;

          // Only show weight for equipment that uses weights
          if (
            ["leverage machine", "barbell", "dumbbell", "weighted"].includes(
              exercise.equipment
            )
          ) {
            setInfo += ` @ ${set.weight}kg`;
          }

          doc.text(setInfo, 25, yPosition);
          yPosition += 6;
        });
      } else {
        doc.text(`  Default: ${exercise.repsCount || 10} reps`, 25, yPosition);
        yPosition += 6;
      }

      yPosition += 8; // Space between exercises
    });

    // Summary
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }

    yPosition += 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Workout Summary", 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const totalExercises = workoutPlan.exercises.length;
    const completedExercises =
      Object.values(completedWorkouts).filter(Boolean).length;

    doc.text(`Total Exercises: ${totalExercises}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Completed: ${completedExercises}`, 20, yPosition);
    yPosition += 6;
    doc.text(
      `Remaining: ${totalExercises - completedExercises}`,
      20,
      yPosition
    );
  } else {
    doc.setFontSize(12);
    doc.setFont("helvetica", "italic");
    doc.text("No exercises added to this workout plan.", 20, yPosition);
  }

  // Generate filename
  const fileName = `${member.fullName.replace(
    /\s+/g,
    "_"
  )}_Workout_Plan_${selectedDate}.pdf`;

  // Save the PDF
  doc.save(fileName);
};
