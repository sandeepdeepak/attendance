{
  /* Daily Details Section */
}
{
  selectedDay && (
    <div className="bg-[#123347] rounded-lg p-3 sm:p-4 md:p-6 mb-8">
      <h2 className="text-xl font-bold mb-4">Day {selectedDay} Details</h2>

      {selectedDayDetails ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Meals Section */}
          <div className="bg-[#0a1f2e] p-4 rounded-lg">
            <h3 className="text-lg font-bold mb-3 flex items-center">
              <FaUtensils className="mr-2" /> Meals
            </h3>

            {/* Breakfast */}
            <div className="mb-4">
              <h4 className="font-bold text-[#3498db] mb-2">Breakfast</h4>
              {selectedDayDetails.meals.breakfast &&
              selectedDayDetails.meals.breakfast.length > 0 ? (
                <ul className="list-disc pl-5">
                  {selectedDayDetails.meals.breakfast.map((item, index) => (
                    <li key={`breakfast-${index}`} className="mb-1">
                      {item.quantity}x {item.name} -{" "}
                      {item.calories || item.totalCalories || 0} kcal
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400">No breakfast recorded</p>
              )}
            </div>

            {/* Lunch */}
            <div className="mb-4">
              <h4 className="font-bold text-[#3498db] mb-2">Lunch</h4>
              {selectedDayDetails.meals.lunch &&
              selectedDayDetails.meals.lunch.length > 0 ? (
                <ul className="list-disc pl-5">
                  {selectedDayDetails.meals.lunch.map((item, index) => (
                    <li key={`lunch-${index}`} className="mb-1">
                      {item.quantity}x {item.name} -{" "}
                      {item.calories || item.totalCalories || 0} kcal
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400">No lunch recorded</p>
              )}
            </div>

            {/* Dinner */}
            <div className="mb-4">
              <h4 className="font-bold text-[#3498db] mb-2">Dinner</h4>
              {selectedDayDetails.meals.dinner &&
              selectedDayDetails.meals.dinner.length > 0 ? (
                <ul className="list-disc pl-5">
                  {selectedDayDetails.meals.dinner.map((item, index) => (
                    <li key={`dinner-${index}`} className="mb-1">
                      {item.quantity}x {item.name} -{" "}
                      {item.calories || item.totalCalories || 0} kcal
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400">No dinner recorded</p>
              )}
            </div>

            {/* Nutrition Totals */}
            <div className="mt-6 pt-4 border-t border-gray-700">
              <h4 className="font-bold mb-2">Nutrition Totals</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="bg-[#123347] p-2 rounded">
                  <p className="text-sm text-gray-400">Calories</p>
                  <p className="font-bold">
                    {selectedDayDetails.meals.nutritionTotals.calories} kcal
                  </p>
                </div>
                <div className="bg-[#123347] p-2 rounded">
                  <p className="text-sm text-gray-400">Carbs</p>
                  <p className="font-bold">
                    {selectedDayDetails.meals.nutritionTotals.carbs} g
                  </p>
                </div>
                <div className="bg-[#123347] p-2 rounded">
                  <p className="text-sm text-gray-400">Proteins</p>
                  <p className="font-bold">
                    {selectedDayDetails.meals.nutritionTotals.proteins} g
                  </p>
                </div>
                <div className="bg-[#123347] p-2 rounded">
                  <p className="text-sm text-gray-400">Fats</p>
                  <p className="font-bold">
                    {selectedDayDetails.meals.nutritionTotals.fats} g
                  </p>
                </div>
                <div className="bg-[#123347] p-2 rounded">
                  <p className="text-sm text-gray-400">Fibre</p>
                  <p className="font-bold">
                    {selectedDayDetails.meals.nutritionTotals.fibre} g
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Workout Section */}
          <div className="bg-[#0a1f2e] p-4 rounded-lg">
            <h3 className="text-lg font-bold mb-3 flex items-center">
              <FaDumbbell className="mr-2" /> Workout
            </h3>

            {selectedDayDetails.workout &&
            selectedDayDetails.workout.exercises &&
            selectedDayDetails.workout.exercises.length > 0 ? (
              <div>
                {selectedDayDetails.workout.exercises.map((exercise, index) => (
                  <div
                    key={`exercise-${index}`}
                    className="mb-4 pb-4 border-b border-gray-700 last:border-0"
                  >
                    <h4 className="font-bold text-[#e74c3c]">
                      {exercise.name}
                    </h4>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div>
                        <p className="text-xs text-gray-400">Sets</p>
                        <p>{exercise.setCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Reps</p>
                        <p>{exercise.repsCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Weight</p>
                        <p>
                          {exercise.weight > 0
                            ? `${exercise.weight} kg`
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                    {exercise.notes && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-400">Notes</p>
                        <p className="text-sm">{exercise.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No workout recorded for this day</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-400">
          No details available for this day
        </p>
      )}
    </div>
  );
}
