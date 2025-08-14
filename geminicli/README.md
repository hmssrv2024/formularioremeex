# Proyecto de Chat Híbrido (para Vercel)

Este proyecto es una implementación de un sistema de chat en vivo que combina un chatbot inteligente con la capacidad de intervención de un agente humano. **Esta versión está diseñada específicamente para ser desplegada en Vercel.**

## Arquitectura Vercel

- **Frontend:** HTML, CSS, y JS vanilla servidos como un sitio estático desde la carpeta `public/`.
- **Backend:** Funciones Serverless de Vercel en la carpeta `api/`.
- **Base de Datos:** [Vercel KV](https://vercel.com/storage/kv) (basado en Redis) para almacenar mensajes y sesiones.
- **Almacenamiento de Archivos:** [Vercel Blob](https://vercel.com/storage/blob) para todos los adjuntos (PDFs, imágenes, etc.).
- **IA:** Un endpoint de API (`/api/ai`) actúa como un proxy seguro para la API de Google Gemini, manteniendo la clave de API en el servidor.

---

## Configuración del Proyecto

Para ejecutar este proyecto, necesitas una cuenta de Vercel y configurar el almacenamiento y las variables de entorno.

### 1. Instalar Vercel CLI

Si no lo tienes, instala la CLI de Vercel globalmente:

```bash
npm install -g vercel
```

### 2. Configurar Almacenamiento en Vercel

1.  Desde la raíz de tu proyecto, conecta tu repositorio a Vercel KV:
    ```bash
    vercel kv create
    ```
    Elige un nombre (ej. `chat-db`) y sigue los pasos para vincularlo. Esto creará un archivo `.env.local` con las credenciales necesarias.

2.  Ahora, crea un almacén de Vercel Blob:
    ```bash
    vercel blob create
    ```
    Sigue los pasos. Esto añadirá la variable `BLOB_READ_WRITE_TOKEN` a tu archivo `.env.local`.

### 3. Configurar la API Key de IA

1.  Consigue tu API Key de [Google AI Studio](https://aistudio.google.com/).
2.  Añade la clave a tus variables de entorno de Vercel. Puedes añadirla a tu archivo `.env.local` para desarrollo local:
    ```
    GEMINI_API_KEY="AIza..."
    ```
3.  **Importante:** Cuando despliegues en Vercel, asegúrate de añadir estas mismas variables de entorno en la configuración de tu proyecto en el dashboard de Vercel (Settings -> Environment Variables).

### 4. Instalar Dependencias

```bash
npm install
```

---

## Cómo Ejecutar Localmente

Usa la CLI de Vercel para emular el entorno de la nube en tu máquina local. Esto ejecutará tanto el frontend como las funciones serverless de la API.

```bash
vercel dev
```

Luego, abre `http://localhost:3000` en tu navegador para ver el chat del cliente y `http://localhost:3000/admin.html` para el panel de soporte.

## Desplegar en Vercel

El despliegue es muy sencillo:

1.  Sube tu código a un repositorio de GitHub.
2.  Importa el repositorio en Vercel.
3.  Asegúrate de que las variables de entorno (`KV_*`, `BLOB_*`, `GEMINI_API_KEY`) están configuradas en el dashboard de Vercel.
4.  Vercel desplegará automáticamente cada vez que hagas `git push`.

O puedes desplegar manualmente desde la terminal:

```bash
vercel --prod
```

---

## TODOs y Mejoras

-   **Seguridad de Admin:** El panel de admin es público. En producción, deberías protegerlo con [Autenticación de Vercel](https://vercel.com/docs/security/deployment-protection) o un sistema de login propio.
-   **WebRTC:** La señalización para las llamadas WebRTC necesita ser implementada a través de un servicio de WebSocket o usando la base de datos KV para intercambiar mensajes de señalización.
-   **RAG en Backend:** La indexación de PDFs (`/api/rag-docs`) es un placeholder. La extracción de texto y la generación de embeddings en una función serverless puede exceder los límites de tiempo. Para producción, considera usar un servicio de tareas en segundo plano o una función serverless con mayor tiempo de ejecución.