import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { city, preferences } = body;

    if (!city || !preferences) {
      return NextResponse.json(
        { error: "City data and preferences are required" },
        { status: 400 }
      );
    }

    // Sample scoring algorithm - in production this would be more sophisticated
    const scores = {
      costOfLiving: calculateCostScore(city, preferences),
      jobMarket: calculateJobMarketScore(city, preferences),
      climate: calculateClimateScore(city, preferences), 
      lifestyle: calculateLifestyleScore(city, preferences),
      overall: 0 // Will be calculated as weighted average
    };

    // Calculate overall score as weighted average
    scores.overall = calculateOverallScore(scores, preferences.weights || {});

    // Return detailed breakdown
    return NextResponse.json({
      cityId: city.id,
      cityName: city.name,
      scores,
      matchPercentage: Math.round(scores.overall * 100),
      recommendations: generateRecommendations(scores, city)
    });
    
  } catch (error) {
    console.error("Error calculating city score:", error);
    return NextResponse.json(
      { error: "Error calculating city score" },
      { status: 500 }
    );
  }
}

// Helper functions for scoring

function calculateCostScore(city: any, preferences: any): number {
  // Lower cost of living index is better
  const costDiff = preferences.maxCostOfLiving 
    ? Math.min(1, preferences.maxCostOfLiving / city.costOfLivingIndex) 
    : 0.5;
    
  // Salary to rent ratio (higher is better)
  const salaryToRentRatio = city.averageSalary / (city.averageRent * 12);
  const normalizedRatio = Math.min(1, salaryToRentRatio / 3); // 3+ is considered excellent
  
  return (costDiff * 0.6) + (normalizedRatio * 0.4);
}

function calculateJobMarketScore(city: any, preferences: any): number {
  const baseScore = city.jobMarketStrength / 10;
  
  // Boost score if tech industry presence matches preferences
  let techBoost = 0;
  if (preferences.jobSector === 'tech' && city.techIndustryPresence > 7) {
    techBoost = 0.2;
  }
  
  return Math.min(1, baseScore + techBoost);
}

function calculateClimateScore(city: any, preferences: any): number {
  if (!preferences.climate) return 0.5;
  
  // Simple text matching - in production would use more sophisticated comparison
  if (city.climate.toLowerCase().includes(preferences.climate.toLowerCase())) {
    return 0.9;
  }
  
  // Check for opposite climate preferences
  const opposites = {
    'warm': ['cold', 'snow', 'winter'],
    'cold': ['hot', 'warm', 'tropical'],
    'rainy': ['dry', 'arid'],
    'dry': ['rainy', 'humid', 'wet']
  };
  
  for (const [pref, oppositeList] of Object.entries(opposites)) {
    if (preferences.climate.toLowerCase().includes(pref)) {
      for (const opposite of oppositeList) {
        if (city.climate.toLowerCase().includes(opposite)) {
          return 0.2; // Very bad match
        }
      }
    }
  }
  
  return 0.5; // Neutral match
}

function calculateLifestyleScore(city: any, preferences: any): number {
  let score = 0.5; // Start neutral
  
  // Transit score if applicable
  if (preferences.publicTransport && city.publicTransportQuality) {
    score += (city.publicTransportQuality / 10) * 0.3;
  }
  
  // Can add more lifestyle factors here
  
  return Math.min(1, score);
}

function calculateOverallScore(scores: any, weights: any): number {
  const defaultWeights = {
    costOfLiving: 0.4,
    jobMarket: 0.3,
    climate: 0.2,
    lifestyle: 0.1
  };
  
  // Merge default weights with user preferences
  const finalWeights = { ...defaultWeights, ...weights };
  
  // Normalize weights to sum to 1
  const weightSum = Object.values(finalWeights).reduce((sum: number, weight) => sum + (weight as number), 0);
  for (const key in finalWeights) {
    finalWeights[key] = finalWeights[key] / weightSum;
  }
  
  // Calculate weighted average
  let overallScore = 0;
  for (const key in scores) {
    if (key !== 'overall' && finalWeights[key]) {
      overallScore += scores[key] * finalWeights[key];
    }
  }
  
  return overallScore;
}

function generateRecommendations(scores: any, city: any): string[] {
  const recommendations = [];
  
  if (scores.costOfLiving < 0.4) {
    recommendations.push(`Cost of living in ${city.name} may be higher than your preferences.`);
  }
  
  if (scores.jobMarket < 0.4) {
    recommendations.push(`Job market in ${city.name} might not align with your career needs.`);
  }
  
  if (scores.climate < 0.4) {
    recommendations.push(`Climate in ${city.name} doesn't match your preferences well.`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push(`${city.name} appears to be a good match for your preferences!`);
  }
  
  return recommendations;
} 