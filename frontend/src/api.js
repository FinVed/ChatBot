import axios from 'axios'

/** Axios instance for the roaster API (Vite proxies `/api` to the backend in dev). */
export const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
})

/** Multi-turn follow-up using accumulated message context on the server. */
export function postConversationMessage(userMessageText) {
  return api.post('/api/conversation/message', { userMessageText })
}
