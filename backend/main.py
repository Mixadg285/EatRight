from __future__ import annotations

from enum import Enum
from pathlib import Path
from typing import List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
import logging
import traceback
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, root_validator

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"
DATA_PATH = BASE_DIR / "dataset" / "combined_food_data.csv"

app = FastAPI(title="EatRight Machine Learning API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def load_models() -> tuple:
    calorie_model = joblib.load(MODEL_DIR / "calorie_rf_model.joblib")
    scaler = joblib.load(MODEL_DIR / "food_scaler.joblib")
    meal_knn_model = joblib.load(MODEL_DIR / "meal_knn_model.joblib")
    return calorie_model, scaler, meal_knn_model


def load_food_catalog() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH)
    df["Food_name"] = df["Food_name"].astype(str).str.strip()
    df["Meal_type"] = df["Meal_type"].astype(str).str.strip().str.title()
    df["is_vegan"] = df["is_vegan"].astype(str).str.strip().str.lower() == "true"
    df["is_vegetarian"] = df["is_vegetarian"].astype(str).str.strip().str.lower() == "true"

    def meal_one_hot(meal_type: str) -> dict:
        meal_type = meal_type.strip().lower()
        return {
            "Meal_Breakfast": int(meal_type == "breakfast"),
            "Meal_Lunch": int(meal_type == "lunch"),
            "Meal_Dinner": int(meal_type == "dinner"),
            "Meal_Snack": int(meal_type == "snack"),
            "Meal_General": int(meal_type not in {"breakfast", "lunch", "dinner", "snack"}),
        }

    one_hot = df["Meal_type"].apply(meal_one_hot).apply(pd.Series)
    return pd.concat([df, one_hot], axis=1)


calorie_model, food_scaler, meal_knn_model = load_models()
food_catalog = load_food_catalog()
food_catalog["Calories"] = pd.to_numeric(food_catalog["Calories"], errors="coerce")
food_catalog["Protein"] = pd.to_numeric(food_catalog["Protein"], errors="coerce")
food_catalog["Carbohydrates"] = pd.to_numeric(food_catalog["Carbohydrates"], errors="coerce")
food_catalog["Fats"] = pd.to_numeric(food_catalog["Fats"], errors="coerce")
# Drop rows with missing numeric macro values to avoid NaNs during recommendation
food_catalog = food_catalog.dropna(subset=["Calories", "Protein", "Carbohydrates", "Fats"]).reset_index(drop=True)


class Gender(str, Enum):
    male = "male"
    female = "female"


class ActivityLevel(str, Enum):
    sedentary = "sedentary"
    lightly_active = "lightly_active"
    moderate = "moderate"
    active = "active"
    very_active = "very_active"


class DietaryPreference(str, Enum):
    omnivore = "omnivore"
    vegetarian = "vegetarian"
    vegan = "vegan"
    pescatarian = "pescatarian"


class WeightGoal(str, Enum):
    weight_gain = "weight_gain"
    weight_loss = "weight_loss"
    maintain = "maintain"


class MealType(str, Enum):
    breakfast = "Breakfast"
    lunch = "Lunch"
    dinner = "Dinner"
    snack = "Snack"
    general = "General"


class CaloriesRequest(BaseModel):
    age: int = Field(..., ge=1)
    gender: Gender
    height_cm: float = Field(..., gt=0)
    weight_kg: float = Field(..., gt=0)
    activity_level: ActivityLevel
    dietary_preference: DietaryPreference


class MealRecommendationRequest(BaseModel):
    food_name: Optional[str] = None
    calories: Optional[float] = Field(None, ge=0)
    protein: Optional[float] = Field(None, ge=0)
    carbohydrates: Optional[float] = Field(None, ge=0)
    fats: Optional[float] = Field(None, ge=0)
    is_vegan: bool = False
    is_vegetarian: bool = False
    meal_type: MealType = MealType.general
    top_n: int = Field(5, ge=1, le=20)

    @root_validator(skip_on_failure=True)
    def validate_request(cls, values):
        food_name = values.get("food_name")
        macros = [values.get("calories"), values.get("protein"), values.get("carbohydrates"), values.get("fats")]
        if not food_name and any(value is None for value in macros):
            raise ValueError(
                "Provide either food_name or all of calories, protein, carbohydrates, and fats."
            )
        return values


class PredictionResponse(BaseModel):
    calories: float
    bmi: float
    bmi_category: str
    bmr: float
    activity_level: ActivityLevel
    dietary_preference: DietaryPreference


class MealRecommendation(BaseModel):
    Food_name: str
    Calories: float
    Protein: float
    Carbohydrates: float
    Fats: float
    Meal_type: str


class MealPlanResponse(BaseModel):
    predicted_calories: float
    meal_plan: dict


class UserProfile(BaseModel):
    age: int = Field(..., ge=1)
    gender: Gender
    height_cm: float = Field(..., gt=0)
    weight_kg: float = Field(..., gt=0)
    activity_level: ActivityLevel
    dietary_preference: DietaryPreference
    weight_goal: WeightGoal = WeightGoal.maintain


def map_gender(value: Gender) -> int:
    return 1 if value == Gender.male else 0


def map_activity_level(value: ActivityLevel) -> int:
    mapping = {
        ActivityLevel.sedentary: 0,
        ActivityLevel.lightly_active: 1,
        ActivityLevel.moderate: 2,
        ActivityLevel.active: 3,
        ActivityLevel.very_active: 4,
    }
    return mapping.get(value, 0)


def map_dietary_preference(value: DietaryPreference) -> int:
    mapping = {
        DietaryPreference.omnivore: 0,
        DietaryPreference.vegetarian: 1,
        DietaryPreference.vegan: 2,
        DietaryPreference.pescatarian: 3,
    }
    return mapping.get(value, 0)


def map_bmi_category(bmi: float) -> int:
    if bmi < 18.5:
        return 0
    if bmi < 25:
        return 1
    if bmi < 30:
        return 2
    return 3


def bmi_category_label(bmi: float) -> str:
    if bmi < 18.5:
        return "Underweight"
    if bmi < 25:
        return "Normal"
    if bmi < 30:
        return "Overweight"
    return "Obese"


def compute_bmi(weight_kg: float, height_cm: float) -> float:
    height_m = height_cm / 100.0
    return float(weight_kg / (height_m * height_m))


def compute_bmr(age: int, gender: Gender, height_cm: float, weight_kg: float) -> float:
    if gender == Gender.male:
        return float(88.362 + 13.397 * weight_kg + 4.799 * height_cm - 5.677 * age)
    return float(447.593 + 9.247 * weight_kg + 3.098 * height_cm - 4.330 * age)


def build_calorie_feature_vector(request: CaloriesRequest) -> np.ndarray:
    bmi_value = compute_bmi(request.weight_kg, request.height_cm)
    feature_vector = np.array([
        request.age,
        map_gender(request.gender),
        request.height_cm,
        request.weight_kg,
        map_activity_level(request.activity_level),
        map_dietary_preference(request.dietary_preference),
        bmi_value,
        map_bmi_category(bmi_value),
        compute_bmr(request.age, request.gender, request.height_cm, request.weight_kg),
    ], dtype=float)
    return feature_vector.reshape(1, -1)


def infer_meal_type_by_calories(calories: float) -> MealType:
    if calories <= 250:
        return MealType.snack
    if calories <= 400:
        return MealType.breakfast
    if calories <= 550:
        return MealType.lunch
    return MealType.dinner


def build_meal_feature_vector(request: MealRecommendationRequest) -> np.ndarray:
    effective_meal_type = request.meal_type
    if effective_meal_type == MealType.general and request.calories is not None:
        effective_meal_type = infer_meal_type_by_calories(request.calories)

    return np.array([
        float(request.calories),
        float(request.protein),
        float(request.carbohydrates),
        float(request.fats),
        int(request.is_vegan),
        int(request.is_vegetarian),
        int(effective_meal_type == MealType.breakfast),
        int(effective_meal_type == MealType.dinner),
        int(effective_meal_type == MealType.general),
        int(effective_meal_type == MealType.lunch),
        int(effective_meal_type == MealType.snack),
    ], dtype=float).reshape(1, -1)


def recommend_food_items_by_calories(
    target_calories: float,
    meal_type: str,
    dietary_preference: DietaryPreference,
    num_recommendations: int = 1,
) -> List[dict]:
    """
    Recommend foods within a calorie range using weighted random sampling.
    Uses 15% tolerance around target calories.
    Foods closer to target have higher probability of being selected.
    """
    tolerance = 0.15
    # defensive: ensure target is a finite number
    if not np.isfinite(target_calories):
        raise ValueError("target_calories is not finite")
    lower_bound = target_calories * (1 - tolerance)
    upper_bound = target_calories * (1 + tolerance)

    catalog = food_catalog.copy()

    catalog = catalog[
        (catalog["Calories"] >= lower_bound) & (catalog["Calories"] <= upper_bound) &
        (catalog["Meal_type"] == meal_type)
    ]

    if dietary_preference == DietaryPreference.vegan:
        catalog = catalog[catalog["is_vegan"] == True]
    elif dietary_preference == DietaryPreference.vegetarian:
        catalog = catalog[catalog["is_vegetarian"] == True]

    if catalog.empty:
        return []

    distances = (catalog["Calories"] - target_calories).abs()
    max_distance = distances.max()

    # If max_distance is not a finite number (e.g. all distances are NaN),
    # fall back to uniform weights. Also protect against zero-sum or NaNs.
    if not np.isfinite(max_distance) or max_distance == 0:
        weights = np.ones(len(distances), dtype=float) / len(distances)
    else:
        weights = (max_distance - distances) / max_distance
        # replace any NaN produced by arithmetic with 0
        weights = np.asarray(weights.fillna(0), dtype=float)
        total = np.sum(weights)
        if not np.isfinite(total) or total <= 0:
            weights = np.ones(len(distances), dtype=float) / len(distances)
        else:
            weights = weights / total

    selected_indices = np.random.choice(
        catalog.index,
        size=min(num_recommendations, len(catalog)),
        replace=False,
        p=weights,
    )

    results = []
    for idx in selected_indices:
        row = catalog.loc[idx]
        result = {
            "Food_name": str(row["Food_name"]),
            "Calories": float(row["Calories"]),
            "Protein": float(row["Protein"]),
            "Carbohydrates": float(row["Carbohydrates"]),
            "Fats": float(row["Fats"]),
            "Meal_type": str(row["Meal_type"]),
        }
        results.append(result)

    return results


def get_recommendation_rows(query_vector: np.ndarray, top_n: int, ignore_name: Optional[str] = None) -> List[dict]:
    neighbors = meal_knn_model.kneighbors(query_vector, n_neighbors=min(top_n + 1, len(food_catalog)), return_distance=True)
    distances, indices = neighbors
    recommendations: List[dict] = []
    for distance, index in zip(distances[0], indices[0]):
        row = food_catalog.iloc[int(index)]
        if ignore_name and row["Food_name"].strip().lower() == ignore_name.strip().lower():
            continue
        recommendations.append(
            {
                "food_name": str(row["Food_name"]),
                "calories": float(row["Calories"]),
                "protein": float(row["Protein"]),
                "carbohydrates": float(row["Carbohydrates"]),
                "fats": float(row["Fats"]),
                "meal_type": str(row["Meal_type"]),
                "is_vegan": bool(row["is_vegan"]),
                "is_vegetarian": bool(row["is_vegetarian"]),
                "distance": float(distance),
            }
        )
        if len(recommendations) >= top_n:
            break
    return recommendations


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


@app.post("/predict-calories", response_model=PredictionResponse)
def predict_calories(request: CaloriesRequest) -> PredictionResponse:
    feature_vector = build_calorie_feature_vector(request)
    prediction = calorie_model.predict(feature_vector)
    calories = float(prediction[0])
    bmi_value = compute_bmi(request.weight_kg, request.height_cm)
    return PredictionResponse(
        calories=calories,
        bmi=round(bmi_value, 2),
        bmi_category=bmi_category_label(bmi_value),
        bmr=round(compute_bmr(request.age, request.gender, request.height_cm, request.weight_kg), 2),
        activity_level=request.activity_level,
        dietary_preference=request.dietary_preference,
    )


@app.post("/predict_and_recommend", response_model=MealPlanResponse)
async def predict_and_recommend(user: UserProfile) -> MealPlanResponse:
    """
    Unified endpoint: predict daily calories and generate full meal plan.
    Returns 4-meal plan (Breakfast, Lunch, Dinner, Snack) based on user profile.
    """
    try:
        feature_vector = build_calorie_feature_vector(
            CaloriesRequest(
                age=user.age,
                gender=user.gender,
                height_cm=user.height_cm,
                weight_kg=user.weight_kg,
                activity_level=user.activity_level,
                dietary_preference=user.dietary_preference,
            )
        )
        pred_cal = float(calorie_model.predict(feature_vector)[0])
        # defensive: ensure model produced a finite number
        if not np.isfinite(pred_cal):
            logging.error("predicted_calories is not finite: %r", pred_cal)
            raise HTTPException(status_code=500, detail="predicted_calories is not finite")
        if user.weight_goal == WeightGoal.weight_gain:
            pred_cal += 500
        elif user.weight_goal == WeightGoal.weight_loss:
            pred_cal -= 500

        # Clamp predicted calories into a reasonable finite range to avoid downstream issues.
        if not np.isfinite(pred_cal):
            logging.warning("pred_cal is not finite after weight goal adjustment: %r", pred_cal)
            pred_cal = 2000.0
        pred_cal = float(max(800.0, min(pred_cal, 6000.0)))

        meal_percentages = {
            "Breakfast": 0.227,
            "Lunch": 0.409,
            "Dinner": 0.273,
            "Snack": 0.091,
        }

        meal_plan = {}
        for meal_name, percentage in meal_percentages.items():
            target = pred_cal * percentage
            meal_type_obj = MealType[meal_name.lower()]
            recommendations = recommend_food_items_by_calories(
                target_calories=target,
                meal_type=meal_type_obj.value,
                dietary_preference=user.dietary_preference,
                num_recommendations=1,
            )
            meal_plan[meal_name] = recommendations

        return MealPlanResponse(predicted_calories=pred_cal, meal_plan=meal_plan)

    except HTTPException:
        # re-raise explicit HTTPExceptions so FastAPI can handle them as intended
        raise
    except Exception as e:
        logging.exception("Unhandled error in predict_and_recommend")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/recommend-meals")
def recommend_meals(request: MealRecommendationRequest) -> dict:
    predicted_meal_type = None

    if request.food_name:
        matched = food_catalog[food_catalog["Food_name"].str.lower() == request.food_name.strip().lower()]
        if matched.empty:
            raise HTTPException(status_code=404, detail="Food name not found in catalog.")
        row = matched.iloc[0]
        query_vector = np.array([
            float(row["Calories"]),
            float(row["Protein"]),
            float(row["Carbohydrates"]),
            float(row["Fats"]),
            int(row["is_vegan"]),
            int(row["is_vegetarian"]),
            int(row["Meal_type"] == "Breakfast"),
            int(row["Meal_type"] == "Dinner"),
            int(row["Meal_type"] not in {"Breakfast", "Lunch", "Dinner", "Snack"}),
            int(row["Meal_type"] == "Lunch"),
            int(row["Meal_type"] == "Snack"),
        ], dtype=float).reshape(1, -1)
        predicted_meal_type = row["Meal_type"]
        recommendations = get_recommendation_rows(query_vector, request.top_n, ignore_name=request.food_name)
    else:
        if request.meal_type == MealType.general and request.calories is not None:
            predicted_meal_type = infer_meal_type_by_calories(request.calories).value
        else:
            predicted_meal_type = request.meal_type.value
        recommendations = get_recommendation_rows(build_meal_feature_vector(request), request.top_n)

    return {
        "predicted_meal_type": predicted_meal_type,
        "recommendations": recommendations,
    }
