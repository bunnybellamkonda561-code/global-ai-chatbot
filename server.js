const express = require('express');
const path = require('path');
const fs = require('fs');
const simulator = require('./simulator');
const registry = require('./registry.json');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple in-memory session database
const sessions = {};

// GET /api/agents
app.get('/api/agents', (req, res) => {
  res.json({
    hub: registry.hub,
    agents: registry.agents.map(a => ({
      id: a.id,
      name: a.name,
      tagline: a.tagline,
      category: a.category,
      ping: a.ping,
      status: a.status,
      location: a.location,
      logo: a.logo,
      theme: a.theme,
      greeting: a.greeting
    }))
  });
});

// POST /api/chat
app.post('/api/chat', async (req, res) => {
  const { message, sessionId, geminiApiKey } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Initialize session if not present
  if (!sessionId || !sessions[sessionId]) {
    const sId = sessionId || Math.random().toString(36).substring(2, 15);
    sessions[sId] = {
      id: sId,
      currentAgentId: 'hub',
      history: []
    };
  }

  const session = sessions[sessionId || Object.keys(sessions)[0]];

  // Check if user is asking to connect to a specific brand/hub
  const targetAgentId = simulator.detectRouting(message, session.currentAgentId);

  // If a routing target was detected
  if (targetAgentId && targetAgentId !== session.currentAgentId) {
    const oldAgentId = session.currentAgentId;
    session.currentAgentId = targetAgentId;

    let targetAgent;
    let greeting = '';
    if (targetAgentId === 'hub') {
      targetAgent = registry.hub;
      greeting = registry.hub.greeting;
    } else {
      targetAgent = registry.agents.find(a => a.id === targetAgentId);
      greeting = targetAgent.greeting;
    }

    // Add routing change log to session history
    session.history.push({
      role: 'system',
      text: `Routed session from ${oldAgentId} to ${targetAgentId}`
    });

    return res.json({
      sessionId: session.id,
      routedTo: targetAgentId,
      agentInfo: {
        name: targetAgent.name,
        tagline: targetAgent.tagline,
        theme: targetAgent.theme,
        logo: targetAgentId === 'hub' ? '🤖' : targetAgent.logo
      },
      message: {
        role: 'assistant',
        text: greeting,
        isSystemNotification: true,
        notificationText: `Connecting to ${targetAgent.name}... Connected via Global Router (ping: ${targetAgentId === 'hub' ? '2ms' : targetAgent.ping}).`
      }
    });
  }

  // Process message using the current active agent
  const activeAgentId = session.currentAgentId;
  const isHub = activeAgentId === 'hub';
  const activeAgent = isHub ? registry.hub : registry.agents.find(a => a.id === activeAgentId);

  session.history.push({ role: 'user', text: message });

  let replyText = '';
  let usedAPI = false;
  const apiKey = (geminiApiKey && geminiApiKey.trim() !== '') ? geminiApiKey : process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim() !== '') {
    try {
      // Use Live Gemini API
      const systemInstruction = isHub
        ? `You are the Global AI Care Router chatbot. Your purpose is to guide customer inquiries and route them to connected company chatbots around the world. The currently connected companies are: ${registry.agents.map(a => a.name + " (" + a.category + ")").join(', ')}. Keep your responses concise, helpful, and invite the user to connect to these brands.`
        : `You are the customer care agent for ${activeAgent.name}. ${activeAgent.systemPrompt} Respond in character. Keep answers short and direct.`;

      // Construct messages list for API
      const contents = session.history.filter(h => h.role !== 'system').map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      }));

      // Call Gemini API via fetch (uses Gemini 1.5 Flash as standard fast model)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: contents,
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.7
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API returned error: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      if (responseData.candidates && responseData.candidates[0].content && responseData.candidates[0].content.parts[0]) {
        replyText = responseData.candidates[0].content.parts[0].text;
        usedAPI = true;
      } else {
        throw new Error('Invalid response structure from Gemini API');
      }
    } catch (apiError) {
      console.error('API Error, falling back to simulator:', apiError.message);
      // Fallback to simulator if API request fails
      replyText = `*[Live API Connection failed: ${apiError.message}. Switching to local agent simulation]*\n\n` + 
                  simulator.getSimulatedResponse(message, activeAgentId);
    }
  } else {
    // Standard offline simulation mode
    replyText = simulator.getSimulatedResponse(message, activeAgentId);
  }

  session.history.push({ role: 'assistant', text: replyText });

  // Cap history to last 20 messages to keep session sizes lightweight
  if (session.history.length > 20) {
    session.history = session.history.slice(-20);
  }

  res.json({
    sessionId: session.id,
    routedTo: activeAgentId,
    agentInfo: {
      name: activeAgent.name,
      tagline: activeAgent.tagline,
      theme: activeAgent.theme,
      logo: isHub ? '🤖' : activeAgent.logo
    },
    message: {
      role: 'assistant',
      text: replyText,
      usedAPI: usedAPI
    }
  });
});

app.listen(PORT, () => {
  console.log(`Global Chatbot Hub server running on http://localhost:${PORT}`);
});
