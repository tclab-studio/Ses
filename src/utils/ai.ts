import OpenAI from "openai";

const nvidiaClient = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_NVIDIA_API_KEY ?? "",
  baseURL: "https://integrate.api.nvidia.com/v1",
  dangerouslyAllowBrowser: true,
});

export type SesProcessingResult = {
  normalizedText: string;
  safetyStatus: "safe" | "suspicious" | "blocked";
  category: string;
  topics: string[];
  qualityScore: number;
  qualityFeedback: string;
  recommendedAudience: string[];
  keywords: string[];
};

export type ProcessSesOptions = {
  availableTopics?: { name: string; slug: string }[];
};

const PROCESSING_PROMPT = (rawText: string) =>
  `
You are a content processing pipeline for a social polling app called "Ses".
A user submitted this raw poll question: "${rawText}"

Run all 7 steps and return ONE JSON object. No markdown. No explanation. JSON only.

Steps:
1. GRAMMAR & CLARITY: Fix spelling, punctuation, capitalization. Keep original meaning.
2. SAFETY CHECK: Detect scams, hate speech, dangerous or illegal content.
   - "safe" = normal content
   - "suspicious" = borderline, needs review  
   - "blocked" = clearly harmful
3. CATEGORY: Pick exactly ONE from: Technology, Gaming, Career, Education, Sports, Movies, Relationships, Business, Health, Politics, Other
4. TOPICS: 2-5 relevant topic tags (e.g. ["Programming", "Rust", "Career"])
5. QUALITY SCORE: 0-100. Evaluate clarity, readability, usefulness.
6. QUALITY FEEDBACK: One sentence explaining the score.
7. AUDIENCE: 1-4 target audience groups (e.g. ["Developers", "Students"])
8. KEYWORDS: 3-7 lowercase search keywords

Return ONLY this JSON shape:
{
  "normalizedText": "",
  "safetyStatus": "safe",
  "category": "",
  "topics": [],
  "qualityScore": 0,
  "qualityFeedback": "",
  "recommendedAudience": [],
  "keywords": []
}
`.trim();

export async function processSes(
  rawText: string,
  _options: ProcessSesOptions = {},
): Promise<SesProcessingResult> {
  const fallback: SesProcessingResult = {
    normalizedText: rawText,
    safetyStatus: "safe",
    category: "Other",
    topics: [],
    qualityScore: 50,
    qualityFeedback: "Could not analyze. Proceeding with original text.",
    recommendedAudience: [],
    keywords: [],
  };

  try {
    const response = await nvidiaClient.chat.completions.create({
      model: "nvidia/nemotron-3-super-120b-a12b",
      messages: [
        {
          role: "user",
          content: PROCESSING_PROMPT(rawText.trim()),
        },
      ],
      temperature: 0.2,
      max_tokens: 400,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<SesProcessingResult>;

    return {
      normalizedText: parsed.normalizedText || rawText,
      safetyStatus: parsed.safetyStatus ?? "safe",
      category: parsed.category || "Other",
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      qualityScore:
        typeof parsed.qualityScore === "number"
          ? Math.min(100, Math.max(0, parsed.qualityScore))
          : 50,
      qualityFeedback: parsed.qualityFeedback || "",
      recommendedAudience: Array.isArray(parsed.recommendedAudience)
        ? parsed.recommendedAudience
        : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    };
  } catch {
    return fallback;
  }
}

export async function moderateContent(
  text: string,
): Promise<{ safe: boolean; reason?: string }> {
  try {
    const response = await nvidiaClient.chat.completions.create({
      model: "nvidia/nemotron-3-super-120b-a12b",
      messages: [
        {
          role: "user",
          content: `You are a content moderator for a public polling app. Analyze this text and respond ONLY with valid JSON.

Text: "${text}"

Rules to check:
- No hate speech, slurs, or discrimination
- No violence, threats, or harmful content
- No explicit sexual content
- No harassment or personal attacks
- No misinformation designed to harm
- No promotion of illegal activities

Respond ONLY with this JSON format, no markdown:
{"safe": true}
or
{"safe": false, "reason": "brief explanation of the issue"}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 100,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { safe: true };
  }
}

export async function enhanceQuestion(
  rawQuestion: string,
  availableTopics: { name: string; slug: string }[],
): Promise<{ question: string; context: string; topics: string[] }> {
  try {
    const topicList =
      availableTopics.length > 0
        ? availableTopics.map((t) => t.slug).join(", ")
        : "No topics available";

    const response = await nvidiaClient.chat.completions.create({
      model: "nvidia/nemotron-3-super-120b-a12b",
      messages: [
        {
          role: "user",
          content: `You are an AI assistant for a polling app. The user wants to create a poll with the following rough question: "${rawQuestion}"

Your tasks:
1. Correct and improve the question for clarity, grammar, and engagement. Keep it concise.
2. Write a brief, engaging context/description (1-2 sentences) that explains the poll.
3. Suggest 1 to 3 relevant topics from this exact list: [${topicList}]. Only use topics from the list. If the list is empty or none match, return an empty array.

Respond ONLY with valid JSON, no markdown:
{
  "question": "improved question",
  "context": "brief context",
  "topics": ["topic_slug_1", "topic_slug_2"]
}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 250,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { question: rawQuestion, context: "", topics: [] };
  }
}

export async function aiMagicFill(
  question: string,
  context: string,
): Promise<string[]> {
  try {
    const response = await nvidiaClient.chat.completions.create({
      model: "nvidia/nemotron-3-super-120b-a12b",
      messages: [
        {
          role: "user",
          content: `Generate 3 to 5 smart, distinct poll options for this question: "${question}"
Context: "${context || "No context provided"}"

Rules:
- Options must be highly relevant to the question and context.
- Think about realistic choices a user would make (e.g., Yes, No, Maybe, Not yet, Depends).
- No duplicates.
- Keep each option under 50 characters.
- No hate speech or harmful content.

Respond ONLY with valid JSON array of strings, no markdown:
["Option 1", "Option 2", "Option 3"]`,
        },
      ],
      temperature: 0.8,
      max_tokens: 200,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "[]";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length >= 2) {
      return parsed.slice(0, 10).map((s: string) => String(s).trim());
    }
    return [];
  } catch {
    return [];
  }
}
