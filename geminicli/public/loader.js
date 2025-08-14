/**
 * Chat Widget Loader Script
 * This script is meant to be embedded on a third-party website.
 * It creates an iframe to host the chat widget, ensuring style and script isolation.
 */
(function() {
    // Create a container for the iframe and the chat button
    const chatContainer = document.createElement('div');
    chatContainer.id = 'gemini-chat-widget-container';
    chatContainer.style.position = 'fixed';
    chatContainer.style.bottom = '20px';
    chatContainer.style.right = '20px';
    chatContainer.style.zIndex = '9999';

    // Create the chat button
    const chatButton = document.createElement('button');
    chatButton.id = 'gemini-chat-open-button';
    chatButton.style.width = '60px';
    chatButton.style.height = '60px';
    chatButton.style.borderRadius = '50%';
    chatButton.style.backgroundColor = '#1a1f71'; // Use primary color from styles
    chatButton.style.border = 'none';
    chatButton.style.cursor = 'pointer';
    chatButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    chatButton.style.display = 'flex';
    chatButton.style.justifyContent = 'center';
    chatButton.style.alignItems = 'center';
    chatButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;

    // Create the iframe for the chat widget itself
    const chatIframe = document.createElement('iframe');
    chatIframe.id = 'gemini-chat-iframe';
    chatIframe.src = new URL(document.currentScript.src).origin + '/index.html'; // Assumes loader is on same domain
    chatIframe.style.width = '400px';
    chatIframe.style.height = '700px';
    chatIframe.style.border = 'none';
    chatIframe.style.borderRadius = '16px';
    chatIframe.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
    chatIframe.style.display = 'none'; // Initially hidden

    // Append elements to the container
    chatContainer.appendChild(chatIframe);
    chatContainer.appendChild(chatButton);
    document.body.appendChild(chatContainer);

    // Toggle iframe visibility on button click
    chatButton.addEventListener('click', () => {
        const isHidden = chatIframe.style.display === 'none';
        chatIframe.style.display = isHidden ? 'block' : 'none';
        // Change icon on toggle
        if (isHidden) {
            chatButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        } else {
            chatButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
        }
    });
})();
