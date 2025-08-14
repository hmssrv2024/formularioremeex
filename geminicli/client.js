// TODO: Add Firebase configuration here
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    databaseURL: "YOUR_DATABASE_URL" // If using RTDB for presence
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const rtdb = firebase.database(); // For presence

// --- DOM Elements ---
const chatMessages = document.getElementById('chat-messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const attachmentBtn = document.getElementById('attachment-btn');
const fileInput = document.getElementById('file-input');
const recordVoiceBtn = document.getElementById('record-voice-btn');
const callBtn = document.getElementById('call-btn');
const consentSwitch = document.getElementById('consent-switch');
const agentStatus = document.getElementById('agent-status');

// --- State ---
let currentUser;
let currentSessionId;
let messageUnsubscribe;
let presenceUnsubscribe;
let mediaRecorder;
let audioChunks = [];

// --- Main Logic ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const userCredential = await auth.signInAnonymously();
        currentUser = userCredential.user;
        await setupSession();
        initEventListeners();
        showToast("Conectado como usuario anónimo.");
    } catch (error) {
        console.error("Authentication failed:", error);
        showToast("Error de autenticación.", true);
    }
});

async function setupSession() {
    // For this MVP, we use a single session for a user. 
    // A more robust solution might involve creating new sessions.
    currentSessionId = `session_${currentUser.uid}`;
    const sessionRef = db.collection('sessions').doc(currentSessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
        await sessionRef.set({
            userId: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            consent: consentSwitch.checked,
            status: 'active',
            lastMessage: 'Sesión iniciada.'
        });
    }

    listenToMessages();
    setupPresence();
}

function initEventListeners() {
    messageForm.addEventListener('submit', handleSendMessage);
    attachmentBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);
    recordVoiceBtn.addEventListener('click', toggleVoiceRecording);
    consentSwitch.addEventListener('change', handleConsentChange);
    // TODO: Add callBtn event listener for WebRTC
}

async function handleSendMessage(e) {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;

    messageInput.value = '';
    await addMessage('user', { text });

    // TODO: Trigger RAG answer from bot
}

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    showToast(`Subiendo ${file.name}...`);
    try {
        const filePath = `sessions/${currentSessionId}/uploads/${Date.now()}_${file.name}`;
        const storageRef = storage.ref(filePath);
        const uploadTask = await storageRef.put(file);
        const fileUrl = await uploadTask.ref.getDownloadURL();

        const messageType = file.type.startsWith('image/') ? 'image' :
                            file.type.startsWith('audio/') ? 'audio' : 'file';

        await addMessage('user', {
            fileUrl,
            fileName: file.name,
            fileType: file.type
        }, messageType);

        showToast("Archivo subido con éxito.");
    } catch (error) {
        console.error("Error uploading file:", error);
        showToast("Error al subir el archivo.", true);
    }
}

async function toggleVoiceRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        recordVoiceBtn.classList.remove('recording');
        recordVoiceBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line></svg>`;
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };
            mediaRecorder.onstop = handleVoiceRecordingStop;
            mediaRecorder.start();
            recordVoiceBtn.classList.add('recording');
            recordVoiceBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="red" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
            showToast("Grabando...");
        } catch (error) {
            console.error("Could not get microphone access:", error);
            showToast("No se pudo acceder al micrófono.", true);
        }
    }
}

async function handleVoiceRecordingStop() {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // For simplicity, we'll just upload it. Transcription would be triggered by a cloud function or handled by admin.
    const filePath = `sessions/${currentSessionId}/uploads/${Date.now()}_voice_note.webm`;
    const storageRef = storage.ref(filePath);
    const uploadTask = await storageRef.put(audioBlob);
    const fileUrl = await uploadTask.ref.getDownloadURL();

    await addMessage('user', {
        fileUrl,
        fileName: 'Nota de voz.webm',
        fileType: 'audio/webm'
    }, 'audio');
    showToast("Nota de voz enviada.");
}


async function handleConsentChange() {
    const sessionRef = db.collection('sessions').doc(currentSessionId);
    await sessionRef.update({ consent: consentSwitch.checked });
    showToast(`Consentimiento ${consentSwitch.checked ? 'otorgado' : 'revocado'}.`);
}

async function addMessage(from, data, type = 'text') {
    const message = {
        from,
        type,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        ...data
    };
    await db.collection('sessions').doc(currentSessionId).collection('messages').add(message);
    await db.collection('sessions').doc(currentSessionId).update({
        lastMessage: type === 'text' ? data.text : `[${type}]`,
        lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
    });
}

function listenToMessages() {
    if (messageUnsubscribe) messageUnsubscribe();

    messageUnsubscribe = db.collection('sessions').doc(currentSessionId).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            chatMessages.innerHTML = '';
            snapshot.forEach(doc => {
                renderMessage(doc.data());
            });
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
}

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
    const time = msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString() : '';
    
    msgDiv.innerHTML = `${content}<div class="message-meta">${sender} - ${time}</div>`;
    chatMessages.appendChild(msgDiv);
}

function setupPresence() {
    const userStatusRef = rtdb.ref(`/status/${currentUser.uid}`);
    const sessionPresenceRef = db.collection('sessions').doc(currentSessionId);

    rtdb.ref('.info/connected').on('value', async (snapshot) => {
        if (snapshot.val() === false) {
            sessionPresenceRef.update({ 'presence.user': 'offline' });
            return;
        }

        await userStatusRef.onDisconnect().set({ state: 'offline', last_changed: firebase.database.ServerValue.TIMESTAMP }).then(() => {
            userStatusRef.set({ state: 'online', last_changed: firebase.database.ServerValue.TIMESTAMP });
            sessionPresenceRef.update({ 'presence.user': 'online' });
        });
    });
}


// --- Utility Functions ---
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

// TODO: WebRTC implementation
// const pc = new RTCPeerConnection({ iceServers: [...] });
// ... signaling logic via Firestore/RTDB ...
