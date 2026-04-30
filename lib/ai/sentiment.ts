// Sentiment + theme scoring for customer feedback.
//
// Single-call Claude Haiku classifier. Closed theme taxonomy (caller stores
// the array verbatim into order_feedback.themes) so the dashboard can
// aggregate without a normalization step.
//
// Failure mode: returns null on any error. Callers MUST treat scoring as
// best-effort — never block the underlying feedback insert on it.

import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.AI_SENTIMENT_MODEL || 'claude-haiku-4-5';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const FEEDBACK_THEMES = [
  'food_quality',
  'delivery_speed',
  'delivery_accuracy',
  'temperature',
  'packaging',
  'price',
  'customer_service',
  'app_experience',
  'other',
] as const;

export type FeedbackTheme = (typeof FEEDBACK_THEMES)[number];
export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface SentimentResult {
  sentiment: Sentiment;
  sentiment_score: number; // -1 .. 1
  themes: FeedbackTheme[];
}

const SYSTEM = `You analyze short customer feedback about a Nigerian food-delivery restaurant. Output STRICT JSON only — no prose, no code fences. Schema:
{
  "sentiment": "positive" | "neutral" | "negative",
  "sentiment_score": number,   // -1.0 (worst) to 1.0 (best)
  "themes": string[]           // subset of: food_quality, delivery_speed, delivery_accuracy, temperature, packaging, price, customer_service, app_experience, other
}

Rules:
- Anchor sentiment to the rating when it's strong: rating 5 → positive, rating 1–2 → negative, rating 3 → neutral by default unless the comment is clearly positive/negative.
- sentiment_score: rating=5 maps near +0.8 to +1.0, rating=4 near +0.3 to +0.7, rating=3 near -0.2 to +0.2, rating=2 near -0.5 to -0.8, rating=1 near -0.8 to -1.0. Comment tone shifts within those bands.
- themes: only emit themes the customer actually touched on. Empty list if nothing specific. Use 'other' for unusual topics.
- If the comment is missing or empty, infer themes only from the rating context (typically empty array).`;

export async function scoreFeedback(input: {
  rating: number;
  comment?: string | null;
}): Promise<SentimentResult | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const user =
    `Rating: ${input.rating}/5\n` +
    `Comment: ${input.comment?.trim() || '(none)'}\n`;

  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      system: SYSTEM,
      messages: [{ role: 'user', content: user }],
    });

    const raw = res.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned) as Partial<SentimentResult>;
    if (
      parsed.sentiment !== 'positive' &&
      parsed.sentiment !== 'neutral' &&
      parsed.sentiment !== 'negative'
    ) {
      return null;
    }
    const score =
      typeof parsed.sentiment_score === 'number'
        ? Math.max(-1, Math.min(1, parsed.sentiment_score))
        : 0;
    const themes = Array.isArray(parsed.themes)
      ? (parsed.themes.filter((t): t is FeedbackTheme =>
          (FEEDBACK_THEMES as readonly string[]).includes(t)
        ) as FeedbackTheme[])
      : [];

    return {
      sentiment: parsed.sentiment,
      sentiment_score: score,
      themes,
    };
  } catch (err) {
    console.error('[sentiment] scoring failed:', err);
    return null;
  }
}
