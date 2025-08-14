// TODO: Add Firebase configuration here
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    databaseURL: "YOUR_DATABASE_URL"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const rtdb = firebase.database();

// --- DOM Elements ---
const sessionList = document.getElementById('session-list');
const chatPanel = document.getElementById('chat-panel');
const welcomePanel = document.getElementById('welcome-panel');
const adminChatMessages = document.getElementById('admin-chat-messages');
const sessionUserId = document.getElementById('session-user-id');
const draftInput = document.getElementById('draft-input');
const improveBtn = document.getElementById('improve-btn');
const improveTone = document.getElementById('improve-tone');
const adminSendBtn = document.getElementById('admin-send-btn');
const docUploadInput = document.getElementById('doc-upload-input');
const uploadDocBtn = document.getElementById('upload-doc-btn');
const projectDocsList = document.getElementById('project-docs-list');
const indexingProgress = document.getElementById('indexing-progress');

// --- State ---
let currentSessionId = null;
let messageUnsubscribe = null;
let sessionsUnsubscribe = null;
let adminUser = null; // In a real app, admin would log in.

// --- Main Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // In a real app, this would be a proper login flow.
    // For MVP, we assume an admin is already authenticated.
    // You might need to set custom claims for admin users.
    auth.onAuthStateChanged(user => {
        if (user) {
            adminUser = user;
            showToast("Admin autenticado.");
            listenToSessions();
            initEventListeners();
        } else {
            // For MVP, sign in an admin anonymously for testing.
            // In production, redirect to a login page.
            auth.signInAnonymously().catch(err => console.error("Admin auth failed", err));
        }
    });
});

function initEventListeners() {
    adminSendBtn.addEventListener('click', handleAdminSendMessage);
    improveBtn.addEventListener('click', handleImproveWriting);
    uploadDocBtn.addEventListener('click', handleProjectDocUpload);
}

function listenToSessions() {
    if (sessionsUnsubscribe) sessionsUnsubscribe();
    sessionsUnsubscribe = db.collection('sessions')
        .orderBy('lastUpdate', 'desc')
        .onSnapshot(snapshot => {
            sessionList.innerHTML = '';
            snapshot.forEach(doc => {
                renderSessionItem(doc.id, doc.data());
            });
        });
}

function renderSessionItem(id, data) {
    const item = document.createElement('li');
    item.className = 'session-item';
    item.dataset.sessionId = id;
    if (id === currentSessionId) {
        item.classList.add('active');
    }

    item.innerHTML = `
        <div class="session-id">Usuario: ${data.userId.substring(0, 8)}...</div>
        <div class="session-last-msg">${escapeHTML(data.lastMessage || '')}</div>
    `;
    item.addEventListener('click', () => selectSession(id));
    sessionList.appendChild(item);
}

function selectSession(sessionId) {
    if (currentSessionId === sessionId) return;

    currentSessionId = sessionId;
    
    // Update active class on session list
    document.querySelectorAll('.session-item').forEach(item => {
        item.classList.toggle('active', item.dataset.sessionId === sessionId);
    });

    welcomePanel.classList.add('hidden');
    chatPanel.classList.remove('hidden');
    sessionUserId.textContent = sessionId.replace('session_', '').substring(0, 8);

    listenToMessages();
}

function listenToMessages() {
    if (messageUnsubscribe) messageUnsubscribe();

    adminChatMessages.innerHTML = '';
    messageUnsubscribe = db.collection('sessions').doc(currentSessionId).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            adminChatMessages.innerHTML = '';
            snapshot.forEach(doc => {
                renderMessage(doc.data());
            });
            adminChatMessages.scrollTop = adminChatMessages.scrollHeight;
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
    
    const sender = msg.from === 'user' ? 'Usuario' : msg.from === 'admin' ? 'Tú (Agente)' : 'Bot';
    const time = msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString() : '';
    
    msgDiv.innerHTML = `${content}<div class="message-meta">${sender} - ${time}</div>`;
    adminChatMessages.appendChild(msgDiv);
}

async function handleAdminSendMessage() {
    const text = draftInput.value.trim();
    if (!text || !currentSessionId) return;

    draftInput.value = '';
    await addMessage('admin', { text });
}

async function handleImproveWriting() {
    const draft = draftInput.value.trim();
    if (!draft) return;

    showToast("Mejorando redacción...");
    try {
        const improvedText = await aiAdapter.improveWriting({
            draft,
            tone: improveTone.value
        });
        draftInput.value = improvedText;
        showToast("Texto mejorado.");
    } catch (error) {
        console.error("Error improving writing:", error);
        showToast("Error al mejorar el texto.", true);
    }
}

async function handleProjectDocUpload() {
    const file = docUploadInput.files[0];
    if (!file || file.type !== 'application/pdf') {
        showToast("Por favor, selecciona un archivo PDF.", true);
        return;
    }

    showToast(`Subiendo ${file.name}...`);
    indexingProgress.classList.remove('hidden');
    indexingProgress.value = 10;

    try {
        // 1. Upload PDF to Storage
        const docId = `${Date.now()}_${file.name}`;
        const filePath = `project/docs/${docId}`;
        const storageRef = storage.ref(filePath);
        const uploadTask = await storageRef.put(file);
        const fileUrl = await uploadTask.ref.getDownloadURL();
        indexingProgress.value = 30;

        // 2. Create document in Firestore
        const docRef = db.collection('projectDocs').doc(docId);
        await docRef.set({
            docId,
            title: file.name,
            fileUrl,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            tags: [],
            chunks: 0
        });
        showToast("PDF subido, extrayendo texto...");

        // 3. Client-side text extraction and chunking
        const fileReader = new FileReader();
        fileReader.onload = async (event) => {
            const typedarray = new Uint8Array(event.target.result);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(s => s.str).join(' ');
            }
            indexingProgress.value = 50;
            showToast("Texto extraído, creando chunks...");

            // Simple chunking
            const chunks = chunkText(fullText, 1000, 200);
            
            // 4. Get embeddings and save chunks
            // TODO: Implement local vs remote embedding flag
            const embeddings = await aiAdapter.embedTexts(chunks);
            indexingProgress.value = 80;

            const batch = db.batch();
            chunks.forEach((chunkText, i) => {
                const chunkRef = docRef.collection('chunks').doc(`chunk_${i}`);
                batch.set(chunkRef, {
                    chunkId: `chunk_${i}`,
                    text: chunkText,
                    embedding: embeddings[i],
                    order: i
                });
            });
            await batch.commit();

            await docRef.update({ chunks: chunks.length });
            showToast("Documento indexado con éxito.", false);
            indexingProgress.classList.add('hidden');
        };
        fileReader.readAsArrayBuffer(file);

    } catch (error) {
        console.error("Error processing project document:", error);
        showToast("Error al procesar el documento.", true);
        indexingProgress.classList.add('hidden');
    }
}

async function addMessage(from, data, type = 'text') {
    if (!currentSessionId) return;
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

// --- Utility Functions ---
function chunkText(text, chunkSize, overlap) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        const end = i + chunkSize;
        chunks.push(text.substring(i, end));
        i += chunkSize - overlap;
    }
    return chunks;
}

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
