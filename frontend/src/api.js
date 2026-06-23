import axios from 'axios'

// 💻 THE FIX: Dynamically read your live Railway URL in production, fallback locally
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

/** Axios instance for the roaster API */
export const api = axios.create({
  baseURL: BASE_URL, 
  headers: {
    'Content-Type': 'application/json',
  },
})

/** Multi-turn follow-up using accumulated message context on the server. */
export function postConversationMessage(userMessageText) {
  return api.post('/api/conversation/message', { userMessageText })
}