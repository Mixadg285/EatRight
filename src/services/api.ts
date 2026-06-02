const BASE_URL = "http://192.168.1.115:8000";

export const predictCalories = async (userData: any) => {
  try {
    const response = await fetch(
      `${BASE_URL}/predict-calories`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      }
    );

    return await response.json();

  } catch (error) {
    console.log(error);
  }
};

export const recommendMeals = async (mealData: any) => {
  try {
    const response = await fetch(
      `${BASE_URL}/recommend-meals`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mealData),
      }
    );

    return await response.json();

  } catch (error) {
    console.log(error);
  }
};