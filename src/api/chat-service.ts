/*
IMPORTANT NOTICE: DO NOT REMOVE
./src/api/chat-service.ts
If the user wants to use AI to generate text, answer questions, or analyze images you can use the functions defined in this file to communicate with the OpenAI, Anthropic, and Grok APIs.
*/
import { AIMessage, AIRequestOptions, AIResponse } from "../types/ai";
import { getAnthropicClient } from "./anthropic";
import { getOpenAIClient } from "./openai";
import { getGrokClient } from "./grok";

/**
 * Get a text response from Anthropic
 * @param messages - The messages to send to the AI
 * @param options - The options for the request
 * @returns The response from the AI
 */
export const getAnthropicTextResponse = async (
  messages: AIMessage[],
  options?: AIRequestOptions,
): Promise<AIResponse> => {
  try {
    const client = getAnthropicClient();
    const defaultModel = "claude-3-5-sonnet-20240620";

    const response = await client.messages.create({
      model: options?.model || defaultModel,
      messages: messages.map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      })),
      max_tokens: options?.maxTokens || 2048,
      temperature: options?.temperature || 0.7,
    });

    // Handle content blocks from the response
    const content = response.content.reduce((acc, block) => {
      if ("text" in block) {
        return acc + block.text;
      }
      return acc;
    }, "");

    return {
      content,
      usage: {
        promptTokens: response.usage?.input_tokens || 0,
        completionTokens: response.usage?.output_tokens || 0,
        totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      },
    };
  } catch (error) {
    console.error("Anthropic API Error:", error);
    throw error;
  }
};

/**
 * Get a simple chat response from Anthropic
 * @param prompt - The prompt to send to the AI
 * @returns The response from the AI
 */
export const getAnthropicChatResponse = async (prompt: string): Promise<AIResponse> => {
  return await getAnthropicTextResponse([{ role: "user", content: prompt }]);
};

/**
 * Get a text response from OpenAI
 * @param messages - The messages to send to the AI
 * @param options - The options for the request
 * @returns The response from the AI
 */
export const getOpenAITextResponse = async (messages: AIMessage[], options?: AIRequestOptions): Promise<AIResponse> => {
  try {
    const client = getOpenAIClient();
    const defaultModel = "gpt-4o"; //accepts images as well, use this for image analysis

    const response = await client.chat.completions.create({
      model: options?.model || defaultModel,
      messages: messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens || 2048,
    });

    return {
      content: response.choices[0]?.message?.content || "",
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  } catch (error: any) {
    // Silently handle rate limits
    const isRateLimit = error?.message?.includes('429') || error?.message?.includes('rate_limit');
    if (!isRateLimit && __DEV__) {
      console.warn('OpenAI API warning:', error?.message?.substring(0, 100));
    }
    throw error;
  }
};

/**
 * Get a simple chat response from OpenAI
 * @param prompt - The prompt to send to the AI
 * @returns The response from the AI
 */
export const getOpenAIChatResponse = async (prompt: string): Promise<AIResponse> => {
  return await getOpenAITextResponse([{ role: "user", content: prompt }]);
};

/**
 * Get a text response from Grok
 * @param messages - The messages to send to the AI
 * @param options - The options for the request
 * @returns The response from the AI
 */
export const getGrokTextResponse = async (messages: AIMessage[], options?: AIRequestOptions): Promise<AIResponse> => {
  try {
    const client = getGrokClient();
    const defaultModel = "grok-3-beta";

    const response = await client.chat.completions.create({
      model: options?.model || defaultModel,
      messages: messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens || 2048,
    });

    return {
      content: response.choices[0]?.message?.content || "",
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  } catch (error: any) {
    if (__DEV__) {
      console.warn('Grok API warning:', error?.message?.substring(0, 100));
    }
    throw error;
  }
};

/**
 * Get a simple chat response from Grok
 * @param prompt - The prompt to send to the AI
 * @returns The response from the AI
 */
export const getGrokChatResponse = async (prompt: string): Promise<AIResponse> => {
  return await getGrokTextResponse([{ role: "user", content: prompt }]);
};

/**
 * Get a text response from GPT-MINI (gpt-5-mini)
 * Uses fetch API directly as per Vibecode integration
 * @param messages - The messages to send to the AI
 * @param options - The options for the request
 * @returns The response from the AI
 */
export const getGPTMiniTextResponse = async (
  messages: AIMessage[],
  options?: AIRequestOptions
): Promise<AIResponse> => {
  try {
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Changed from gpt-5-mini to gpt-4o-mini which is more stable
        messages: messages,
        max_tokens: options?.maxTokens || 1000,
        temperature: options?.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Silently handle rate limit errors - they're expected on free tier
      const isRateLimit = response.status === 429 || errorText.includes('rate_limit_exceeded');
      if (isRateLimit) {
        // Only log in development mode
        if (__DEV__) {
          console.log('OpenAI rate limit reached, using fallback');
        }
      } else if (__DEV__) {
        // Only log non-rate-limit errors in dev
        console.warn('GPT-MINI API Error:', response.status);
      }
      
      throw new Error(`GPT-MINI API request failed: ${response.status}`);
    }

    const responseText = await response.text();

    // Validate we got a response
    if (!responseText || responseText.trim() === '') {
      console.error('GPT-MINI returned empty response');
      throw new Error('Empty response from GPT-MINI API');
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      if (__DEV__) {
        console.warn('Failed to parse GPT-MINI response');
      }
      throw new Error('Invalid JSON response from GPT-MINI API');
    }

    const message = data.choices?.[0]?.message;
    const content = message?.content || '';
    const refusal = message?.refusal;
    const finishReason = data.choices?.[0]?.finish_reason;

    // Check if the request was refused
    if (refusal) {
      if (__DEV__) {
        console.warn('GPT-4o-mini refused request:', refusal);
      }
      throw new Error(`GPT-4o-mini refused: ${refusal}`);
    }

    // Check for empty content (common with reasoning models)
    if (!content || content.trim() === '') {
      // Silently throw - fallback handling will catch this
      throw new Error('No content in GPT-4o-mini response');
    }

    return {
      content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  } catch (error: any) {
    // Silently handle rate limits and expected errors
    const isRateLimit = error?.message?.includes('429') || error?.message?.includes('rate_limit');
    if (!isRateLimit && __DEV__) {
      console.warn('GPT-MINI API warning:', error?.message?.substring(0, 100));
    }
    throw error;
  }
};

/**
 * Get a simple chat response from GPT-MINI
 * @param prompt - The prompt to send to the AI
 * @returns The response from the AI
 */
export const getGPTMiniChatResponse = async (prompt: string): Promise<AIResponse> => {
  return await getGPTMiniTextResponse([{ role: "user", content: prompt }]);
};
