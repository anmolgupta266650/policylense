import { GoogleGenerativeAI } from "@google/generative-ai";
import { Scheme, UserProfile } from "../types";

// @ts-ignore
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function getSchemeRecommendations(profile: UserProfile, schemes: Scheme[]) {
  // @ts-ignore
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    return "Please configure your Gemini API key to see smart recommendations.";
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    You are an expert career and scholarship counselor. 
    Based on the following user profile and available schemes, provide a concise (2-3 sentences) recommendation on why these schemes are a good fit for the user.
    
    User Profile:
    - Qualifications: ${profile.qualifications.join(", ")}
    - Annual Income: ₹${profile.income}
    - State: ${profile.state}
    
    Available Schemes:
    ${schemes.map(s => `- ${s.title}: ${s.description} (Category: ${s.category}, Min Qual: ${s.eligibility.minQualification}, Max Income: ₹${s.eligibility.maxIncome})`).join("\n")}
    
    Provide a friendly and encouraging recommendation.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Unable to generate smart recommendations at this time.";
  }
}
