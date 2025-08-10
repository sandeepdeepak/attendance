// bedrockService.js
const {
  BedrockRuntimeClient,
  InvokeModelCommand,
} = require("@aws-sdk/client-bedrock-runtime");

// Initialize the Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  // AWS credentials will be automatically loaded from environment variables
  // or from the AWS credentials file
});

/**
 * Generate a meal plan using AWS Bedrock with Anthropic Claude
 * @param {number} calorieGoal - Target calories for the day
 * @param {Object} macroTargets - Target macronutrients (proteins, carbs, fats, fibre)
 * @param {Object} preferences - Dietary preferences (dietType, cuisine, avoidFoods)
 * @returns {Object} Structured meal plan with breakfast, lunch, and dinner
 */
async function generateMealPlan(calorieGoal, macroTargets, preferences) {
  const prompt = `
    Generate a full day meal plan (breakfast, lunch, dinner) that meets these nutritional targets:
    - Total calories: ${calorieGoal} kcal (IMPORTANT: Keep total calories 5-10% BELOW this target, never exceed it)
    - Protein: ${macroTargets.proteins}g
    - Carbs: ${macroTargets.carbs}g
    - Fats: ${macroTargets.fats}g
    - Fiber: ${macroTargets.fibre}g
    
    Dietary preferences:
    ${preferences.dietType ? `- Diet type: ${preferences.dietType}` : ""}
    ${
      preferences.cuisine
        ? `- South Indian regional cuisine: ${preferences.cuisine}`
        : ""
    }
    ${
      preferences.nonVegType
        ? `- Non-vegetarian preference: ${preferences.nonVegType}`
        : ""
    }
    ${preferences.mealStyle ? `- Meal style: ${preferences.mealStyle}` : ""}
    ${
      preferences.avoidFoods
        ? `- Foods to avoid: ${preferences.avoidFoods}`
        : ""
    }
    
    For each meal item, provide:
    1. Name
    2. Calories
    3. Protein (g)
    4. Carbs (g)
    5. Fats (g)
    6. Fiber (g)
    7. Serving size (IMPORTANT: Always include weight in grams)
    
    Format the response as a JSON object with this exact structure:
    {
      "breakfast": [
        {
          "name": "Food name",
          "calories": 300,
          "proteins": 20,
          "carbs": 30,
          "fats": 10,
          "fiber": 5,
          "servingSize": "1 cup"
        }
      ],
      "lunch": [
        // similar structure
      ],
      "dinner": [
        // similar structure
      ]
    }
    
    Make sure the total calories and macronutrients for all meals combined closely match the targets.
    Do not include any explanations or text outside the JSON structure.
  `;

  // Create the request payload for Claude model
  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  };

  // Create the command
  const command = new InvokeModelCommand({
    modelId: "anthropic.claude-3-haiku-20240307-v1:0", // Use the appropriate model ID for Bedrock
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });

  try {
    // Send the request to Bedrock
    const response = await bedrockClient.send(command);

    // Parse the response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Extract the content from the response
    return processBedrockResponse(responseBody);
  } catch (error) {
    console.error("Error calling Bedrock:", error);
    throw error;
  }
}

/**
 * Process the response from Bedrock to extract the meal plan
 * @param {Object} response - The response from Bedrock
 * @returns {Object} Structured meal plan
 */
function processBedrockResponse(response) {
  // Extract the content from the Claude response
  const content = response.content[0].text;

  // Try to parse JSON from the response
  try {
    // Look for JSON in the response
    const jsonMatch =
      content.match(/```json\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*}/);

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const mealPlan = JSON.parse(jsonStr);

      // Ensure the meal plan has the expected structure
      return {
        breakfast: formatMealItems(mealPlan.breakfast || []),
        lunch: formatMealItems(mealPlan.lunch || []),
        dinner: formatMealItems(mealPlan.dinner || []),
      };
    } else {
      throw new Error("No JSON found in response");
    }
  } catch (error) {
    console.error("Error parsing meal plan JSON:", error);
    throw new Error("Failed to parse meal plan from LLM response");
  }
}

/**
 * Format meal items to match the app's expected structure
 * @param {Array} items - Array of meal items from the LLM
 * @returns {Array} Formatted meal items
 */
function formatMealItems(items) {
  return items.map((item, index) => ({
    id: `generated-${Date.now()}-${index}`,
    name: item.name,
    calories: item.calories,
    carbs: item.carbs,
    fats: item.fats,
    proteins: item.proteins,
    fibre: item.fiber || 0,
    serving_qty: 1,
    serving_unit: item.servingSize || "serving",
    quantity: 1,
    totalCalories: item.calories,
    totalCarbs: item.carbs,
    totalFats: item.fats,
    totalProteins: item.proteins,
    totalFibre: item.fiber || 0,
  }));
}

module.exports = { generateMealPlan };
