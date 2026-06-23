/**
 * Shared Anthropic Messages helper for backend routes.
 *
 * Environment defaults (override without changing callers):
 * - `ANTHROPIC_API_KEY` — required for requests
 * - `ANTHROPIC_MODEL` — defaults to claude-sonnet-4-6
 * - `ANTHROPIC_MAX_TOKENS` — defaults to 4096
 * - `ANTHROPIC_TIMEOUT_MS` — per-request timeout, defaults to 30000
 */
import Anthropic from '@anthropic-ai/sdk'
import { fetch as undiciFetch } from 'undici'
import dotenv from 'dotenv';
dotenv.config();

// 💻 THE FIX: Use a real, valid Anthropic model name that supports vision!
const FALLBACK_MODEL = 'claude-sonnet-4-6' 
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 1000

// Ensure global fetch is polyfilled natively for older Node.js systems
const httpFetch =
  typeof globalThis.fetch === 'function'
    ? globalThis.fetch.bind(globalThis)
    : undiciFetch

/**
 * Helper to safely extract integer variables from process.env
 */
function envInt(name, fallback) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : fallback
}

console.log(process.env.ANTHROPIC_API_KEY, 'Key is here')

// 2. Instantiate the single, centralized Anthropic API client instance
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  fetch: httpFetch,
})

/**
 * Custom Error Class to standardize upstream AI anomalies
 */
class ChatAIError extends Error {
  constructor(message, category, status = null) {
    super(message)
    this.name = 'ChatAIError'
    this.category = category // 'transient' (retryable) or 'permanent' (fail fast)
    this.status = status
  }
}

/**
 * Parses raw SDK response blocks down to a clean, single text string
 */
function extractTextFromMessage(message) {
  if (!message?.content || !Array.isArray(message.content)) return ''
  return message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
}

/**
 * Standardizes Anthropic SDK error exceptions into structured local entities
 */
function toChatAIError(err) {
  if (err instanceof ChatAIError) return err

  const status = err?.status || null
  const msg = err?.message || 'An unknown AI processing error occurred.'
  console.log(err, 'chat Error');

  // Catch 400 Bad Request, 401 Auth, 403 Permissions, 404 Model Not Found
  if (status && status >= 400 && status < 500) {
    if (status === 429) {
      return new ChatAIError('Rate limit exceeded. Please back off and try again later.', 'transient', status)
    }
    return new ChatAIError(`Permanent AI Configuration Error: ${msg}`, 'permanent', status)
  }

  // Catch 5xx Server errors, Timeout errors, Connection errors
  return new ChatAIError(`Transient network connection issue: ${msg}`, 'transient', status)
}

/**
 * Sleep helper utility to power our exponential backoff sequence
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Centralized, production-grade wrapper to dispatch conversational streams to Claude.
 * Includes automated input safety validations, retries, and clean string outputs.
 * * @param {Array} messages - Historically sequenced conversation array: [{role: 'user', content: '...'}]
 * @param {string} systemPrompt - Foundation level behavior shaping system constraints
 * @param {Object} options - Optional per-request parameters (model override, maxTokens, etc.)
 * @returns {Promise<string>} The evaluated text string response from the assistant
 */
export async function chatWithAI(messages, systemPrompt = '', options = {}) {
  // Guard clause: Ensure a meaningful message sequence is present
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new ChatAIError(
      'Permanent AI error: The messages parameter must be a non-empty array structure.',
      'permanent',
    )
  }

  // Destructure any explicit caller configuration overrides
  const {
    model: modelOverride,
    maxTokens: maxTokensOverride,
    timeoutMs: timeoutMsOverride,
    signal,
    headers,
    idempotencyKey,
    fetchOptions,
    defaultBaseURL,
  } = options

  // Core configuration tier synthesis
  const model = modelOverride ?? process.env.ANTHROPIC_MODEL ?? FALLBACK_MODEL
  const maxTokens = maxTokensOverride ?? envInt('ANTHROPIC_MAX_TOKENS', 4096)
  const timeoutMs = timeoutMsOverride ?? envInt('ANTHROPIC_TIMEOUT_MS', 30000)

  let lastErr

  // 3. Robust Execution Loop with Intelligent Backoff Retries
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const params = {
        model,
        max_tokens: maxTokens,
        messages,
        ...(systemPrompt !== undefined && systemPrompt !== ''
          ? { system: systemPrompt }
          : {}),
      }

      // Handshake with the direct SDK endpoint
      const response = await anthropic.messages.create(params, {
        signal,
        headers,
        idempotencyKey,
        fetchOptions,
        defaultBaseURL,
        timeout: timeoutMs,
        maxRetries: 0, // Disabled standard client retries to enforce our tracking engine explicitly
      })

      const text = extractTextFromMessage(response)
      if (!text) {
        throw new ChatAIError(
          'Permanent AI error: Empty text structural string payload in AI response block.',
          'permanent',
        )
      }
      
      return text // Successful request execution complete!

    } catch (err) {
      lastErr = err
      const chatErr = toChatAIError(err)

      // Break out immediately if the error cannot be saved by running it again (e.g., Invalid API key, Bad 404 model parameter)
      if (chatErr.category === 'permanent' || attempt === MAX_RETRIES) {
        throw chatErr
      }

      // Handle structural exponential backoff wait tracking: 1s -> 2s -> 4s
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt)
      console.warn(`⚠️ Temporary AI connection drop (Attempt ${attempt + 1}/${MAX_RETRIES + 1}). Retrying in ${delay}ms... Details: ${chatErr.message}`)
      await sleep(delay)
    }
  }

  throw toChatAIError(lastErr)
}