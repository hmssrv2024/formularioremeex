document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const chatMessages = document.getElementById('chat-messages');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const fileInput = document.getElementById('file-input');
    const attachmentBtn = document.getElementById('attachment-btn');

    // --- State ---
    let sessionId = localStorage.getItem('chatSessionId');
    let lastMessageTimestamp = 0;
    let pollingInterval;

    // --- Initialization ---
    async function init() {
        if (!sessionId) {
            try {
                const response = await fetch('/api/sessions', { method: 'POST' });
                const data = await response.json();
                sessionId = data.sessionId;
                localStorage.setItem('chatSessionId', sessionId);
                showToast('Nueva sesión iniciada.');
            } catch (error) {
                showToast('Error al iniciar sesión', true);
                console.error(error);
                return;
            }
        }
        startPolling();
        initEventListeners();
    }

    function initEventListeners() {
        messageForm.addEventListener('submit', handleSendMessage);
        attachmentBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileUpload);
                messageInput.addEventListener('input', handleTyping);
    }

    let typingTimeout = null;
    function handleTyping() {
        if (!typingTimeout) {
            // Send typing=true immediately
            fetch('/api/typing-indicator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, isTyping: true })
            });
        }

        // Clear previous timeout
        clearTimeout(typingTimeout);

        // Set a new timeout to send typing=false
        typingTimeout = setTimeout(() => {
            fetch('/api/typing-indicator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, isTyping: false })
            });
            typingTimeout = null;
        }, 3000); // User is considered to have stopped typing after 3 seconds
    }

    // --- Real-time (Polling) ---
    function startPolling() {
        if (pollingInterval) clearInterval(pollingInterval);
        fetchMessages(); // Fetch immediately on start
        pollingInterval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
    }

    async function fetchMessages() {
        if (!sessionId) return;
        try {
            const response = await fetch(`/api/messages?sessionId=${sessionId}&since=${lastMessageTimestamp}`);
            if (!response.ok) throw new Error('Failed to fetch messages');
            const messages = await response.json();
            if (messages.length > 0) {
                messages.forEach(renderMessage);
                lastMessageTimestamp = messages[messages.length - 1].timestamp;
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }

    // --- Actions ---
    async function handleSendMessage(e) {
        e.preventDefault();
        const text = messageInput.value.trim();
        if (!text) return;

                messageInput.value = '';

        // Notify backend that user is typing
        fetch('/api/typing-indicator', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, isTyping: false })
        });

        await sendMessage({ type: 'text', text });
        // TODO: Trigger bot RAG response
    }

    async function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        showToast(`Subiendo ${file.name}...`);
        try {
            const response = await fetch(`/api/upload?sessionId=${sessionId}&filename=${file.name}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': file.type },
                    body: file
                }
            );

            if (!response.ok) throw new Error('Upload failed');
            const { url } = await response.json();

            const messageType = file.type.startsWith('image/') ? 'image' :
                                file.type.startsWith('audio/') ? 'audio' : 'file';

            await sendMessage({ type: messageType, fileUrl: url, fileName: file.name });
            showToast('Archivo subido con éxito.');
        } catch (error) {
            console.error("Error uploading file:", error);
            showToast("Error al subir el archivo.", true);
        }
    }

    async function sendMessage(messageBody) {
        try {
            await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, from: 'user', ...messageBody })
            });
            fetchMessages(); // Fetch immediately after sending for quick feedback
        } catch (error) {
            showToast('No se pudo enviar el mensaje', true);
            console.error(error);
        }
    }

    // --- Rendering ---
    function renderMessage(msg) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', msg.from);

        let content = '';
        switch (msg.type) {
            case 'text':
                content = `<div class="message-content">${escapeHTML(msg.text)}</div>`;
                break;
            case 'image':
                content = `<div class="message-content"><img src="${msg.fileUrl}" alt="${msg.fileName}" style="max-width:100%; border-radius: 8px;"></div>`;
                break;
            case 'audio':
                content = `<div class="message-content"><audio controls src="${msg.fileUrl}"></audio></div>`;
                break;
            case 'file':
                content = `<div class="message-content"><a href="${msg.fileUrl}" target="_blank" rel="noopener noreferrer">Descargar ${escapeHTML(msg.fileName)}</a></div>`;
                break;
            default:
                content = `<div class="message-content"><em>Mensaje no soportado</em></div>`;
        }
        
        const sender = msg.from === 'user' ? 'Tú' : msg.from === 'admin' ? 'Agente' : 'Bot';
        const time = new Date(msg.timestamp).toLocaleTimeString();
        
        msgDiv.innerHTML = `${content}<div class="message-meta">${sender} - ${time}</div>`;
        chatMessages.appendChild(msgDiv);
    }

    // --- Utilities ---
    function showToast(message, isError = false) {
        const toast = document.getElementById('toast-notification');
        toast.textContent = message;
        toast.className = 'toast show';
        if (isError) toast.style.backgroundColor = 'var(--error-color)';
        setTimeout(() => {
            toast.className = toast.className.replace('show', '');
            if (isError) toast.style.backgroundColor = '';
        }, 3000);
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    init();
});
