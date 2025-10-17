// lib/ai/commentary-generator.ts
// AI commentary generation using OpenAI (cost-optimized with GPT-4o-mini)

import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import type { RaceEvent, CommentaryContext } from "@/types/live-race";
import { assembleEventContext, assembleHourlySummaryContext } from "./context-assembler";
import { SYSTEM_PROMPT, buildEventPrompt, buildHourlySummaryPrompt } from "./prompts";

// Lazy initialization of OpenAI client (only when needed, not at module import)
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY environment variable is not set. Please configure it in your Vercel project settings."
      );
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// Cost-optimized model selection
const EVENT_MODEL = "gpt-4o-mini"; // $0.150 per 1M input tokens, $0.600 per 1M output tokens
const SUMMARY_MODEL = "gpt-4o-mini"; // Same model for consistency and cost

/**
 * Generate commentary for a specific event
 * Returns the generated commentary text
 */
export async function generateEventCommentary(event: RaceEvent): Promise<string> {
  console.log(`Generating commentary for event ${event.id} (${event.eventType})`);

  try {
    // Assemble context
    const context = await assembleEventContext(event);

    // Build prompt
    const userPrompt = buildEventPrompt(event, context);

    // Generate commentary
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: EVENT_MODEL,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.7, // Some creativity but consistent
      max_tokens: 250, // Limit output to keep costs down (2-4 sentences)
      presence_penalty: 0.1, // Slight penalty for repetition
      frequency_penalty: 0.1,
    });

    const commentary = completion.choices[0].message.content?.trim() || "";

    // Log token usage for cost tracking
    if (completion.usage) {
      console.log(
        `Event commentary tokens - Input: ${completion.usage.prompt_tokens}, Output: ${completion.usage.completion_tokens}`
      );
    }

    return commentary;
  } catch (error) {
    console.error("Error generating event commentary:", error);
    throw error;
  }
}

/**
 * Generate hourly summary commentary
 * Returns the generated summary text
 */
export async function generateHourlySummary(raceId: number): Promise<string> {
  console.log(`Generating hourly summary for race ${raceId}`);

  try {
    // Assemble comprehensive context
    const summaryData = await assembleHourlySummaryContext(raceId);

    // Build prompt
    const userPrompt = buildHourlySummaryPrompt(summaryData);

    // Generate summary with slightly more tokens
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: SUMMARY_MODEL,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 400, // More tokens for comprehensive summary (5-7 sentences)
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    const summary = completion.choices[0].message.content?.trim() || "";

    // Log token usage
    if (completion.usage) {
      console.log(
        `Summary tokens - Input: ${completion.usage.prompt_tokens}, Output: ${completion.usage.completion_tokens}`
      );
    }

    return summary;
  } catch (error) {
    console.error("Error generating hourly summary:", error);
    throw error;
  }
}

/**
 * Process pending events and generate commentary
 * Returns count of successfully processed events
 */
export async function processPendingEvents(): Promise<number> {
  const supabase = await createClient();

  // Get pending events (not yet processed)
  const { data: pendingEvents } = await supabase
    .from("race_events")
    .select("*")
    .eq("commentary_generated", false)
    .is("generation_attempted_at", null)
    .order("priority", { ascending: false }) // High priority first
    .order("timestamp", { ascending: true }) // Oldest first within same priority
    .limit(5); // Process in small batches to avoid timeout

  if (!pendingEvents || pendingEvents.length === 0) {
    console.log("No pending events to process");
    return 0;
  }

  console.log(`Processing ${pendingEvents.length} pending events`);

  let processedCount = 0;

  for (const eventData of pendingEvents) {
    // Convert snake_case to camelCase
    const event: RaceEvent = {
      id: eventData.id,
      raceId: eventData.race_id,
      eventType: eventData.event_type,
      priority: eventData.priority,
      relatedBibs: eventData.related_bibs || [],
      relatedCountries: eventData.related_countries || [],
      eventData: eventData.event_data,
      commentaryGenerated: eventData.commentary_generated,
      commentaryId: eventData.commentary_id,
      timestamp: eventData.timestamp,
      createdAt: eventData.created_at,
    };

    try {
      // Mark as being processed
      await supabase
        .from("race_events")
        .update({ generation_attempted_at: new Date().toISOString() })
        .eq("id", event.id);

      // Generate commentary
      const commentary = await generateEventCommentary(event);

      // Determine update type based on event type
      const updateType =
        event.eventType === "lead_change"
          ? "lead_change"
          : event.eventType === "milestone"
          ? "milestone"
          : "ai";

      // Store in race_updates table
      const { data: update, error: updateError } = await supabase
        .from("race_updates")
        .insert({
          race_id: event.raceId,
          content: commentary, // English not needed, Swedish is primary
          content_sv: commentary,
          update_type: updateType,
          priority: event.priority,
          related_bibs: event.relatedBibs,
          related_countries: event.relatedCountries,
          timestamp: event.timestamp,
        })
        .select()
        .single();

      if (updateError) {
        console.error("Error storing commentary:", updateError);
        await supabase
          .from("race_events")
          .update({ generation_error: updateError.message })
          .eq("id", event.id);
        continue;
      }

      // Mark event as processed
      await supabase
        .from("race_events")
        .update({
          commentary_generated: true,
          commentary_id: update.id,
          generation_error: null,
        })
        .eq("id", event.id);

      processedCount++;
      console.log(`Successfully processed event ${event.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to process event ${event.id}:`, errorMessage);

      // Store error but don't fail completely
      await supabase
        .from("race_events")
        .update({ generation_error: errorMessage })
        .eq("id", event.id);
    }
  }

  console.log(`Successfully processed ${processedCount}/${pendingEvents.length} events`);
  return processedCount;
}

/**
 * Generate and store hourly summary
 */
export async function generateAndStoreHourlySummary(raceId: number): Promise<void> {
  const supabase = await createClient();

  try {
    console.log(`Generating hourly summary for race ${raceId}`);

    // Generate summary
    const summary = await generateHourlySummary(raceId);

    // Store in race_updates table
    const { error } = await supabase.from("race_updates").insert({
      race_id: raceId,
      content: summary,
      content_sv: summary,
      update_type: "ai", // Could also be "ai_summary"
      priority: "high", // Summaries are always high priority
      related_bibs: [],
      related_countries: [],
      timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error("Error storing hourly summary:", error);
      throw error;
    }

    console.log("Successfully generated and stored hourly summary");
  } catch (error) {
    console.error("Failed to generate hourly summary:", error);
    throw error;
  }
}

/**
 * Estimate token costs for monitoring
 */
export function estimateTokenCost(inputTokens: number, outputTokens: number): number {
  // GPT-4o-mini pricing (as of Oct 2024)
  const INPUT_COST_PER_1M = 0.15;
  const OUTPUT_COST_PER_1M = 0.6;

  const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_1M;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M;

  return inputCost + outputCost;
}
