// -------------------------------------------------------------------------- //
//  App State Configuration                                                   //
// -------------------------------------------------------------------------- //
let sessionId = localStorage.getItem('hub_session_id');
if (!sessionId) {
  sessionId = 'session_' + Math.random().toString(36).substring(2, 15);
  localStorage.setItem('hub_session_id', sessionId);
}

let activeAgentId = 'hub';
let connectedAgents = [];
let geminiApiKey = localStorage.getItem('gemini_api_key') || '';
let currentMode = localStorage.getItem('routing_mode') || 'auto'; // 'auto' or 'api'

// Hub Theme defaults for restoring
const hubTheme = {
  primary: '#8a2be2',
  primaryDark: '#5f0fa3',
  bgGradient: 'linear-gradient(135deg, #10061e 0%, #050209 100%)',
  accent: '#00f0ff',
  textColor: '#f1f1f7'
};

// -------------------------------------------------------------------------- //
//  DOM Cache & Element Selection                                             //
// -------------------------------------------------------------------------- //
const nodeList = document.getElementById('nodeList');
const activeNodesCount = document.getElementById('activeNodesCount');
const chatHeader = document.getElementById('chatHeader');
const headerAvatar = document.getElementById('headerAvatar');
const headerName = document.getElementById('headerName');
const headerTagline = document.getElementById('headerTagline');
const headerPing = document.getElementById('headerPing');
const disconnectBtn = document.getElementById('disconnectBtn');
const messagesContainer = document.getElementById('messagesContainer');
const typingIndicator = document.getElementById('typingIndicator');
const suggestionsRow = document.getElementById('suggestionsRow');
const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');

// Mobile Layout DOM Elements
const sidebar = document.getElementById('sidebar');
const menuToggleBtn = document.getElementById('menuToggleBtn');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');

// Modals
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const modeOptions = document.getElementsByName('mode');

const openRegisterBtn = document.getElementById('openRegisterBtn');
const registerModal = document.getElementById('registerModal');
const closeRegisterBtn = document.getElementById('closeRegisterBtn');
const registerForm = document.getElementById('registerForm');

// Overlay
const handshakeOverlay = document.getElementById('handshakeOverlay');
const handshakeStatus = document.getElementById('handshakeStatus');

// -------------------------------------------------------------------------- //
//  Initialization & Event Listeners                                          //
// -------------------------------------------------------------------------- //
document.addEventListener('DOMContentLoaded', () => {
  // Load configuration
  apiKeyInput.value = geminiApiKey;
  for (const option of modeOptions) {
    if (option.value === currentMode) {
      option.checked = true;
    }
  }

  // API Call to get initial node registry list
  fetchAgents();

  // Mobile Layout Event Handlers
  menuToggleBtn.addEventListener('click', () => {
    sidebar.classList.add('mobile-open');
  });

  closeSidebarBtn.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
  });

  // Settings Handlers
  settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
  closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
  saveSettingsBtn.addEventListener('click', saveConfiguration);

  // Register Agent Handlers
  openRegisterBtn.addEventListener('click', () => registerModal.classList.remove('hidden'));
  closeRegisterBtn.addEventListener('click', () => registerModal.classList.add('hidden'));
  registerForm.addEventListener('submit', registerNewAgent);

  // Close modals on overlay click
  window.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.classList.add('hidden');
    if (e.target === registerModal) registerModal.classList.add('hidden');
  });

  // Chat Submit
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text) return;
    sendMessage(text);
  });

  // Disconnect button action
  disconnectBtn.addEventListener('click', () => {
    sendMessage("Disconnect and return to the main hub router");
  });

  // Render initial suggestion chips
  renderSuggestions();

  // PWA Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('Service Worker registered successfully:', reg.scope);
      }).catch((err) => {
        console.warn('Service Worker registration failed:', err);
      });
    });
  }
});

// -------------------------------------------------------------------------- //
//  API & Network Services                                                    //
// -------------------------------------------------------------------------- //

async function fetchAgents() {
  try {
    const response = await fetch('/api/agents');
    if (!response.ok) throw new Error('Failed to load agents list');
    const data = await response.json();
    connectedAgents = data.agents;
    activeNodesCount.textContent = connectedAgents.length;
    renderSidebarNodes();
  } catch (error) {
    console.error('Error fetching registry:', error);
    nodeList.innerHTML = `<div class="node-item loading" style="color: #ff6000;">⚠️ Connection Error</div>`;
  }
}

function renderSidebarNodes() {
  nodeList.innerHTML = '';
  
  // Render Hub Link Card
  const hubCard = document.createElement('div');
  hubCard.className = `node-item ${activeAgentId === 'hub' ? 'active' : ''}`;
  hubCard.innerHTML = `
    <div class="node-profile">
      <div class="node-logo">🤖</div>
      <div>
        <div class="node-name">Global Care Router</div>
        <div class="node-cat">Network Hub</div>
      </div>
    </div>
    <div class="node-ping-info">
      <div class="node-ping" style="color: var(--accent);">2ms</div>
      <div class="node-status">Connected</div>
    </div>
  `;
  hubCard.addEventListener('click', () => {
    if (activeAgentId !== 'hub') {
      sendMessage("Switch to main hub router");
    }
  });
  nodeList.appendChild(hubCard);

  // Render registered company nodes
  connectedAgents.forEach(agent => {
    const card = document.createElement('div');
    card.className = `node-item ${activeAgentId === agent.id ? 'active' : ''}`;
    
    // Apply styling indicator dynamic coloring if active
    if (activeAgentId === agent.id) {
      card.style.borderColor = agent.theme.primary;
      card.style.boxShadow = `0 0 12px ${agent.theme.primary}26`;
    } else {
      card.style.borderColor = '';
      card.style.boxShadow = '';
    }

    card.innerHTML = `
      <div class="node-profile">
        <div class="node-logo">${agent.logo}</div>
        <div>
          <div class="node-name">${agent.name}</div>
          <div class="node-cat">${agent.category}</div>
        </div>
      </div>
      <div class="node-ping-info">
        <div class="node-ping">${agent.ping}</div>
        <div class="node-status">${agent.status}</div>
      </div>
    `;
    card.addEventListener('click', () => {
      if (activeAgentId !== agent.id) {
        sendMessage(`Connect me to ${agent.name}`);
      }
    });
    nodeList.appendChild(card);
  });
}

// -------------------------------------------------------------------------- //
//  Messaging and Flow Core                                                   //
// -------------------------------------------------------------------------- //

async function sendMessage(messageText) {
  // Auto-close mobile drawer sidebar
  sidebar.classList.remove('mobile-open');

  // Clear input
  userInput.value = '';
  
  // Render user text bubble
  appendMessage('user', messageText);
  
  // Show Typing Indicator
  showTyping(true);

  // Send request body
  const requestBody = {
    message: messageText,
    sessionId: sessionId
  };

  // Attach API key if api mode is checked
  if (currentMode === 'api' && geminiApiKey) {
    requestBody.geminiApiKey = geminiApiKey;
  }

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) throw new Error('API server processing failed');

    const data = await response.json();
    showTyping(false);

    // If routing has changed, trigger transition sequence
    if (data.routedTo && data.routedTo !== activeAgentId) {
      await performNetworkHandshake(data.routedTo, data.agentInfo);
      activeAgentId = data.routedTo;
      
      // Update sidebar
      renderSidebarNodes();
      
      // Update UI Header details
      updateHeaderLayout(data.agentInfo, data.routedTo);
      
      // Render system handshake message in chat
      if (data.message.isSystemNotification) {
        appendSystemNotification(data.message.notificationText);
      }
      
      // Render chatbot greeting message
      appendMessage('assistant', data.message.text);
    } else {
      // Normal chat response
      appendMessage('assistant', data.message.text, data.message.usedAPI);
    }

    // Refresh Suggestion chips
    renderSuggestions();

  } catch (error) {
    console.error('Chat error:', error);
    showTyping(false);
    appendMessage('assistant', `⚠️ **Network Sync Error**: I couldn't transmit your query to the active node. Please check your local connection or try restarting the node server.`);
  }
}

// -------------------------------------------------------------------------- //
//  UI View Update Utilities                                                   //
// -------------------------------------------------------------------------- //

function appendMessage(role, text, usedAPI = false) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${role}`;

  // Avatar Logo
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'msg-avatar';
  
  if (role === 'user') {
    avatarDiv.textContent = '👤';
  } else {
    // Look up emoji in config
    if (activeAgentId === 'hub') {
      avatarDiv.textContent = '🤖';
    } else {
      const activeAgent = connectedAgents.find(a => a.id === activeAgentId);
      avatarDiv.textContent = activeAgent ? activeAgent.logo : '🤖';
    }
  }

  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'msg-bubble';
  bubbleDiv.innerHTML = formatMarkdown(text);

  // Add Live API Badge if utilized
  if (role === 'assistant' && usedAPI) {
    const badge = document.createElement('div');
    badge.className = 'api-badge';
    badge.textContent = 'Live Gemini Response';
    bubbleDiv.appendChild(badge);
  }

  msgDiv.appendChild(avatarDiv);
  msgDiv.appendChild(bubbleDiv);
  
  messagesContainer.appendChild(msgDiv);
  scrollToBottom();
}

function appendSystemNotification(text) {
  const notifyDiv = document.createElement('div');
  notifyDiv.className = 'message system-notification';
  notifyDiv.innerHTML = `<div class="notification-bubble">⚡ ${text}</div>`;
  messagesContainer.appendChild(notifyDiv);
  scrollToBottom();
}

function showTyping(show) {
  if (show) {
    typingIndicator.classList.remove('hidden');
    scrollToBottom();
  } else {
    typingIndicator.classList.add('hidden');
  }
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Strips down basic markdown notation for bold and links
 */
function formatMarkdown(text) {
  let formatted = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold **text**
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italics *text*
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Custom links [text](url)
  formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="chat-link">$1</a>');

  // Newlines to breaks
  formatted = formatted.replace(/\n/g, '<br>');

  return formatted;
}

// -------------------------------------------------------------------------- //
//  Dynamic Brand Transitions (Handshake Routing)                             //
// -------------------------------------------------------------------------- //

function performNetworkHandshake(targetId, agentInfo) {
  return new Promise((resolve) => {
    // Show Full screen Handshake loader
    handshakeStatus.textContent = `Routing Connection through Global Server...`;
    
    // Customize handshake styling colors dynamically
    const targetTheme = agentInfo.theme;
    document.documentElement.style.setProperty('--primary', targetTheme.primary);
    
    handshakeOverlay.classList.remove('hidden');

    setTimeout(() => {
      handshakeStatus.textContent = `Establishing connection to ${agentInfo.name} Care...`;
    }, 600);

    setTimeout(() => {
      handshakeOverlay.classList.add('hidden');
      resolve();
    }, 1300); // 1.3 seconds animation duration
  });
}

function updateHeaderLayout(agentInfo, targetId) {
  const theme = agentInfo.theme;
  
  // Apply all CSS custom variables for the brand
  document.documentElement.style.setProperty('--primary', theme.primary);
  document.documentElement.style.setProperty('--primary-dark', theme.primaryDark);
  document.documentElement.style.setProperty('--bg-gradient', theme.bgGradient);
  document.documentElement.style.setProperty('--accent', theme.accent);
  document.documentElement.style.setProperty('--text-color', theme.textColor || '#ffffff');

  // Apply header texts
  headerAvatar.textContent = agentInfo.logo || '🤖';
  headerName.textContent = agentInfo.name;
  headerTagline.textContent = agentInfo.tagline;
  
  // Set ping speed badge
  if (targetId === 'hub') {
    headerPing.textContent = 'Ping: 2ms';
    disconnectBtn.classList.add('hidden');
  } else {
    const agent = connectedAgents.find(a => a.id === targetId);
    headerPing.textContent = `Ping: ${agent ? agent.ping : '30ms'}`;
    disconnectBtn.classList.remove('hidden');
  }
}

// -------------------------------------------------------------------------- //
//  Suggestion Chips & Prompts Engine                                          //
// -------------------------------------------------------------------------- //

function renderSuggestions() {
  suggestionsRow.innerHTML = '';
  
  let options = [];
  if (activeAgentId === 'hub') {
    options = [
      "Connect me to Spotify support",
      "I want to chat with Nike Care",
      "Connect me to Amazon Support",
      "Connect me to Netflix Help",
      "Connect me to Starbucks rewards",
      "Connect me to DHL Express",
      "Show connected companies list"
    ];
  } else if (activeAgentId === 'nike') {
    options = [
      "What is your return policy?",
      "Help me track my order status",
      "Do Nike running shoes run true to size?",
      "Disconnect and go back to main hub"
    ];
  } else if (activeAgentId === 'spotify') {
    options = [
      "How much does Spotify Premium cost?",
      "How can I recover a deleted playlist?",
      "How does offline listening work?",
      "Disconnect"
    ];
  } else if (activeAgentId === 'delta') {
    options = [
      "What are Delta's baggage limits?",
      "How can I cancel or modify my flight?",
      "When does check-in open?",
      "Return to hub"
    ];
  } else if (activeAgentId === 'amazon') {
    options = [
      "What is Amazon's return policy?",
      "How much does Amazon Prime subscription cost?",
      "Help me track my package",
      "Disconnect"
    ];
  } else if (activeAgentId === 'starbucks') {
    options = [
      "How do I redeem Starbucks rewards Stars?",
      "How do I load money onto my Starbucks Card?",
      "What drink customizations can I choose?",
      "Disconnect"
    ];
  } else if (activeAgentId === 'netflix') {
    options = [
      "What are the Netflix monthly plan prices?",
      "How do Netflix household password sharing rules work?",
      "How do I fix buffer or quality issues?",
      "Disconnect"
    ];
  } else if (activeAgentId === 'dhl') {
    options = [
      "How do I track my DHL shipment?",
      "How are customs duties and taxes calculated?",
      "How do I get a shipping rate quote?",
      "Disconnect"
    ];
  } else {
    // General fallback
    options = [
      "What are your support hours?",
      "Can I speak to a live operator?",
      "Disconnect agent"
    ];
  }

  options.forEach(promptText => {
    const chip = document.createElement('div');
    chip.className = 'suggest-chip';
    chip.textContent = promptText;
    chip.addEventListener('click', () => {
      sendMessage(promptText);
    });
    suggestionsRow.appendChild(chip);
  });
}

// -------------------------------------------------------------------------- //
//  Configuration Settings Modal Logic                                         //
// -------------------------------------------------------------------------- //

function saveConfiguration() {
  geminiApiKey = apiKeyInput.value.trim();
  localStorage.setItem('gemini_api_key', geminiApiKey);
  
  for (const option of modeOptions) {
    if (option.checked) {
      currentMode = option.value;
      localStorage.setItem('routing_mode', currentMode);
    }
  }

  settingsModal.classList.add('hidden');
  
  // Inject visual feedback alert
  appendSystemNotification(`Configuration updated successfully. Mode: ${currentMode === 'api' ? 'Live LLM API' : 'Auto Offline Simulator'}.`);
}

// -------------------------------------------------------------------------- //
//  Registering New Brand Agent Nodes                                         //
// -------------------------------------------------------------------------- //

async function registerNewAgent(e) {
  e.preventDefault();
  
  const name = document.getElementById('regName').value.trim();
  const category = document.getElementById('regCategory').value.trim();
  const logo = document.getElementById('regLogo').value.trim();
  const primaryColor = document.getElementById('regColor').value;
  const greeting = document.getElementById('regGreeting').value.trim();
  const systemPrompt = document.getElementById('regPrompt').value.trim();
  const keywordsStr = document.getElementById('regKeywords').value.trim();

  // Parse keywords list
  const keywords = keywordsStr.split(',').map(k => k.trim().toLowerCase()).filter(k => k !== '');

  // Construct request payload
  const newAgent = {
    id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    name: name,
    tagline: `Official connected agent node for ${name}.`,
    category: category,
    ping: `${Math.floor(Math.random() * 45) + 5}ms`,
    status: "Online",
    location: "Global Network Edge",
    logo: logo || "🏢",
    theme: {
      primary: primaryColor,
      primaryDark: darkenColor(primaryColor, 30),
      bgGradient: `linear-gradient(135deg, ${darkenColor(primaryColor, 75)} 0%, #050209 100%)`,
      accent: primaryColor,
      textColor: "#ffffff"
    },
    greeting: greeting,
    systemPrompt: systemPrompt,
    keywords: keywords,
    faq: [
      {
        pattern: ".*(help|support|info).*",
        response: `Welcome to ${name} automated support. I can assist you based on our custom policy rules. Please let me know how I can resolve your inquiry.`
      }
    ]
  };

  // Append locally for testing
  connectedAgents.push(newAgent);
  activeNodesCount.textContent = connectedAgents.length;
  renderSidebarNodes();

  // Close modal and reset form
  registerModal.classList.add('hidden');
  registerForm.reset();

  appendSystemNotification(`Successfully registered and connected **${name} Support** agent node to the global router network.`);
}

// Color darkening utility for brand themes
function darkenColor(hex, percent) {
  let num = parseInt(hex.replace("#",""),16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) - amt,
      G = (num >> 8 & 0x00FF) - amt,
      B = (num & 0x0000FF) - amt;
  return "#" + (0x1000000 + (R<0?0:R>255?255:R)*0x10000 + (G<0?0:G>255?255:G)*0x100 + (B<0?0:B>255?255:B)).toString(16).slice(1);
}
