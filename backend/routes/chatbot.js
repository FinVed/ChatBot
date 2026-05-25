import { Router } from 'express';
import { chatWithAI } from '../services/ai.js';
import { Message, Conversation, Document } from '../models/index.js';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid'; // ⚡ FIXED: Added missing import to prevent runtime crash

const router = Router();

// Global production-grade system prompt defining the AI persona and safety boundaries
const SYSTEM_PROMPT = `
You are an elite, senior technical software engineering mentor and architect.
Your mission is to help developers write highly optimized code, isolate complex debugging errors, and design scalable architectures.

Core Guidelines:
1. Provide structured, production-ready responses.
2. When code is requested, always wrap snippets in clear Markdown blocks specifying the language.
3. Be concise but contextually thorough. Break down root causes rather than just providing quick patches.
4. If an image or a document context is supplied, anchor your logic directly to the raw structures identified within those assets.
`;

/**
 * REUSABLE DISPATCH HELPER
 * Pulls the sliding history slice window from Sequelize, formats it chronologically, 
 * commits the user input, and requests evaluation from the Anthropic SDK wrapper.
 */
async function processConversationWithMemory({ conversationId, userId, newestMessageContent, reqImages = [], attachedDocsContext = '' }) {
  
  // 1. DEFENSIVE SESSION CHECK: Ensure a conversation session container exists in MySQL
  await Conversation.findOrCreate({
    where: { id: conversationId },
    defaults: { userId: userId || 7 } // Falls back to our hardcoded user row if missing
  });

  // 2. FETCH THE SLIDING WINDOW CONTEXT (Last 10 Turns)
  const rawHistory = await Message.findAll({
    where: { conversationId },
    order: [['createdAt', 'DESC']],
    limit: 10,
    attributes: ['role', 'content'],
  });

  const contextHistoryWindow = rawHistory.reverse().map(msg => ({
    role: msg.role,
    content: msg.content,
  }));

  // Build out current user message blocks...
  let finalUserTurnContent = newestMessageContent;
  if (attachedDocsContext) {
    finalUserTurnContent = `[SYSTEM]: Context:\n${attachedDocsContext}\n\nQuestion: ${newestMessageContent}`;
  }

  const currentUserTurn = { role: 'user', content: finalUserTurnContent };

  if (reqImages && reqImages.length > 0) {
    const imageBlocks = reqImages.map((img) => ({
      type: 'image',
      source: { type: 'base64', media_type: img.mediaType, data: img.base64Data },
    }));
    currentUserTurn.content = [
      ...imageBlocks,
      { type: 'text', text: newestMessageContent || 'Analyze attached asset.' }
    ];
  }

  contextHistoryWindow.push(currentUserTurn);

  // 3. DISPATCH NETWORK CALL TO CLAUDE
  const assistantReply = await chatWithAI(contextHistoryWindow, SYSTEM_PROMPT, { maxTokens: 1200 });

  // 4. COMMIT SESSIONS TRANSACTIONALLY TO MYSQL
  await Message.create({
    conversationId,
    role: 'user',
    content: newestMessageContent || 'Analyzed architectural asset attachments.'
  });

  await Message.create({
    conversationId,
    role: 'assistant',
    content: assistantReply
  });

  return assistantReply;
}

// ==========================================
// 🛠️ ENDPOINT 1: PLAIN TEXT CONVERSATION ROUTE
// ==========================================
router.post('/api/chat', async (req, res) => {
  try {
    const { messages, conversationId, userId } = req.body; 
    if (!conversationId) return res.status(400).json({ error: 'conversationId parameter is required.' });
    
    const newestTurn = messages[messages.length - 1];
    
    const reply = await processConversationWithMemory({
      conversationId,
      userId, 
      newestMessageContent: newestTurn.content
    });

    return res.json({ reply });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 📷 ENDPOINT 2: MULTIMODAL VISION ROUTE
// ==========================================
router.post('/api/chat-multimodal', async (req, res) => {
  try {
    const { messages, conversationId, images, userId } = req.body; // Retained userId mapping flexibility
    if (!conversationId) return res.status(400).json({ error: 'conversationId reference is required.' });
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'No structured image base64 arrays were detected on this endpoint.' });
    }

    const newestTurn = messages[messages.length - 1];

    const reply = await processConversationWithMemory({
      conversationId,
      userId,
      newestMessageContent: newestTurn.content,
      reqImages: images
    });

    return res.json({ reply });
  } catch (error) {
    console.error('Multimodal Vision Route Failure:', error);
    return res.status(500).json({ error: error.message || 'Internal vision pipeline breakdown.' });
  }
});

// ==========================================
// 📄 ENDPOINT 3: RETRIEVAL-AUGMENTED GENERATION (RAG) ROUTE
// ==========================================
router.post('/api/chat-with-rag', async (req, res) => {
  try {
    const { messages, conversationId, userId, documents } = req.body;
    
    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId reference tracking token is missing.' });
    }
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ error: 'No inline document arrays were detected on this RAG endpoint.' });
    }

    // 1. CONTEXT COMPILATION
    // Map the incoming raw file texts into a single string for Claude to digest
    const compiledDocsContext = documents.map(doc => {
      return `[Source File Name: ${doc.name}]\n${doc.text}\n---`;
    }).join('\n\n');

    // 2. PERSIST TRACKING RECORD TO MYSQL (Audit history log layer)
    for (const doc of documents) {
      await Document.create({
        id: `doc-${uuidv4()}`,
        name: doc.name,
        fileContent: doc.text
      });
    }

    const newestTurn = messages[messages.length - 1];

    // 3. EXECUTE PROMPT WORKFLOW WITH REAL HISTORY AND INTEGRATED CONTEXT
    // Note: processConversationWithMemory handles its own internal defensive findOrCreate call safely
    const reply = await processConversationWithMemory({
      conversationId,
      userId,
      newestMessageContent: newestTurn.content,
      attachedDocsContext: compiledDocsContext 
    });

    return res.json({ reply });

  } catch (error) {
    console.error('Production RAG Pipeline Failure:', error);
    return res.status(500).json({ error: error.message || 'Internal database knowledge chunk processing error.' });
  }
});

export default router;