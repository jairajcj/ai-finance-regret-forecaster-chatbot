// LinkedIn Context AI Chatbot - Main Script

class LinkedInChatbot {
    constructor() {
        this.apiKey = localStorage.getItem('gemini_api_key');
        this.conversationHistory = [];
        this.isProcessing = false;
        
        // DOM Elements
        this.chatMessages = document.getElementById('chat-messages');
        this.userInput = document.getElementById('user-input');
        this.sendButton = document.getElementById('send-button');
        this.typingIndicator = document.getElementById('typing-indicator');
        this.charCount = document.getElementById('char-count');
        this.statusText = document.getElementById('status-text');
        this.apiKeyModal = document.getElementById('api-key-modal');
        this.apiKeyInput = document.getElementById('api-key-input');
        this.saveApiKeyButton = document.getElementById('save-api-key');
        
        this.init();
    }
    
    init() {
        // Check for API key
        if (!this.apiKey) {
            this.showApiKeyModal();
        }
        
        // Event Listeners
        this.sendButton.addEventListener('click', () => this.handleSend());
        this.userInput.addEventListener('input', () => this.handleInput());
        this.userInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.saveApiKeyButton.addEventListener('click', () => this.saveApiKey());
        this.apiKeyInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.saveApiKey();
            }
        });
        
        // Auto-resize textarea
        this.userInput.addEventListener('input', () => {
            this.userInput.style.height = 'auto';
            this.userInput.style.height = this.userInput.scrollHeight + 'px';
        });
    }
    
    showApiKeyModal() {
        this.apiKeyModal.classList.add('active');
        this.apiKeyInput.focus();
    }
    
    hideApiKeyModal() {
        this.apiKeyModal.classList.remove('active');
    }
    
    saveApiKey() {
        const apiKey = this.apiKeyInput.value.trim();
        
        if (!apiKey) {
            this.showError('Please enter a valid API key');
            return;
        }
        
        this.apiKey = apiKey;
        localStorage.setItem('gemini_api_key', apiKey);
        this.hideApiKeyModal();
        this.updateStatus('Ready', 'success');
        this.apiKeyInput.value = '';
    }
    
    handleInput() {
        const length = this.userInput.value.length;
        this.charCount.textContent = `${length}/2000`;
        
        // Enable/disable send button
        this.sendButton.disabled = length === 0 || this.isProcessing;
    }
    
    handleKeyDown(e) {
        // Send on Enter (without Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!this.sendButton.disabled) {
                this.handleSend();
            }
        }
    }
    
    async handleSend() {
        const message = this.userInput.value.trim();
        
        if (!message || this.isProcessing) return;
        
        // Clear input
        this.userInput.value = '';
        this.userInput.style.height = 'auto';
        this.handleInput();
        
        // Add user message to chat
        this.addMessage(message, 'user');
        
        // Show typing indicator
        this.showTypingIndicator();
        
        // Process message
        await this.processMessage(message);
        
        // Hide typing indicator
        this.hideTypingIndicator();
    }
    
    async processMessage(message) {
        this.isProcessing = true;
        this.updateStatus('Thinking...', 'processing');
        
        try {
            // Create LinkedIn-focused prompt
            const linkedInPrompt = this.createLinkedInPrompt(message);
            
            // Call Gemini API
            const response = await this.callGeminiAPI(linkedInPrompt);
            
            // Add bot response to chat
            this.addMessage(response, 'bot');
            
            // Update conversation history
            this.conversationHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: response }
            );
            
            this.updateStatus('Ready', 'success');
        } catch (error) {
            console.error('Error processing message:', error);
            this.addMessage(
                '❌ Sorry, I encountered an error. Please check your API key and try again.',
                'bot'
            );
            this.updateStatus('Error', 'error');
            
            // If API key is invalid, show modal
            if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('403')) {
                setTimeout(() => this.showApiKeyModal(), 2000);
            }
        } finally {
            this.isProcessing = false;
            this.sendButton.disabled = false;
        }
    }
    
    createLinkedInPrompt(userMessage) {
        const systemContext = `You are a LinkedIn expert AI assistant. Your role is to provide helpful, professional, and actionable advice about LinkedIn and professional networking. 

Focus on:
- LinkedIn profile optimization
- Professional networking strategies
- Career development advice
- Content creation for LinkedIn
- Job search guidance
- Personal branding
- Industry insights and trends

Provide specific, actionable advice. Use a friendly yet professional tone. Include examples when relevant.

User's question: ${userMessage}

Provide a comprehensive response with LinkedIn context:`;
        
        return systemContext;
    }
    
    async callGeminiAPI(prompt) {
        const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
        
        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            }
        };
        
        const response = await fetch(`${API_URL}?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }
        
        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response from API');
        }
        
        return data.candidates[0].content.parts[0].text;
    }
    
    addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        
        if (type === 'bot') {
            avatarDiv.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="url(#avatarGradient${Date.now()})"/>
                    <path d="M12 6V12L16 14" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    <defs>
                        <linearGradient id="avatarGradient${Date.now()}" x1="0" y1="0" x2="24" y2="24">
                            <stop stop-color="#0077B5"/>
                            <stop offset="1" stop-color="#00A0DC"/>
                        </linearGradient>
                    </defs>
                </svg>
            `;
        } else {
            avatarDiv.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="url(#userGradient${Date.now()})"/>
                    <circle cx="12" cy="10" r="3" fill="white"/>
                    <path d="M6 18C6 15.2386 8.68629 13 12 13C15.3137 13 18 15.2386 18 18" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    <defs>
                        <linearGradient id="userGradient${Date.now()}" x1="0" y1="0" x2="24" y2="24">
                            <stop stop-color="#6366f1"/>
                            <stop offset="1" stop-color="#8b5cf6"/>
                        </linearGradient>
                    </defs>
                </svg>
            `;
        }
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        
        // Format text with markdown-like features
        textDiv.innerHTML = this.formatMessage(text);
        
        contentDiv.appendChild(textDiv);
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        this.chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom with smooth animation
        setTimeout(() => {
            this.chatMessages.parentElement.scrollTo({
                top: this.chatMessages.parentElement.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }
    
    formatMessage(text) {
        // Convert markdown-like syntax to HTML
        let formatted = text;
        
        // Bold text **text**
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Italic text *text*
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Code blocks `code`
        formatted = formatted.replace(/`(.*?)`/g, '<code style="background: rgba(0, 119, 181, 0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>');
        
        // Line breaks
        formatted = formatted.replace(/\n/g, '<br>');
        
        // Numbered lists
        formatted = formatted.replace(/^(\d+)\.\s(.+)$/gm, '<div style="margin: 4px 0;">$1. $2</div>');
        
        // Bullet points
        formatted = formatted.replace(/^[-•]\s(.+)$/gm, '<div style="margin: 4px 0;">• $1</div>');
        
        return formatted;
    }
    
    showTypingIndicator() {
        this.typingIndicator.classList.add('active');
        this.chatMessages.parentElement.scrollTo({
            top: this.chatMessages.parentElement.scrollHeight,
            behavior: 'smooth'
        });
    }
    
    hideTypingIndicator() {
        this.typingIndicator.classList.remove('active');
    }
    
    updateStatus(text, type) {
        this.statusText.textContent = text;
        const statusDot = document.querySelector('.status-dot');
        
        switch(type) {
            case 'success':
                statusDot.style.background = '#10b981';
                break;
            case 'processing':
                statusDot.style.background = '#f59e0b';
                break;
            case 'error':
                statusDot.style.background = '#ef4444';
                break;
        }
    }
    
    showError(message) {
        // Create a temporary error notification
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
            z-index: 2000;
            animation: slideInRight 0.4s ease-out;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.animation = 'slideOutRight 0.4s ease-out';
            setTimeout(() => errorDiv.remove(), 400);
        }, 3000);
    }
}

// Add animations to document
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`;
document.head.appendChild(style);

// Initialize chatbot when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new LinkedInChatbot();
});
