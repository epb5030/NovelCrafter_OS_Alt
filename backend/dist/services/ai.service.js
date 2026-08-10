"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const database_1 = require("../config/database");
class AIService {
    static async getSetting(key) {
        const db = await (0, database_1.getDatabase)();
        const row = await db.get('SELECT value FROM settings WHERE key = ?', key);
        return row ? row.value : '';
    }
    static async prepareContext(options) {
        const db = await (0, database_1.getDatabase)();
        // 1. Provider & Model Settings
        const activeProvider = await this.getSetting('active_provider') || 'ollama';
        let apiKey = '';
        let model = '';
        let endpoint = '';
        if (activeProvider === 'openai') {
            apiKey = await this.getSetting('openai_api_key');
            model = await this.getSetting('openai_model') || 'gpt-4o-mini';
            endpoint = 'https://api.openai.com/v1/chat/completions';
        }
        else if (activeProvider === 'anthropic') {
            apiKey = await this.getSetting('anthropic_api_key');
            model = await this.getSetting('anthropic_model') || 'claude-3-5-sonnet-20240620';
            endpoint = 'https://api.anthropic.com/v1/messages';
        }
        else if (activeProvider === 'openrouter') {
            apiKey = await this.getSetting('openrouter_api_key');
            model = await this.getSetting('openrouter_model') || 'meta-llama/llama-3-8b-instruct:free';
            endpoint = 'https://openrouter.ai/api/v1/chat/completions';
        }
        else {
            // Default: Ollama
            model = await this.getSetting('ollama_model') || 'llama3';
            const rawUrl = await this.getSetting('ollama_url') || 'http://localhost:11434';
            endpoint = `${rawUrl.replace(/\/$/, '')}/api/chat`;
        }
        // Validate key unless Ollama
        if (activeProvider !== 'ollama' && !apiKey) {
            throw new Error(`API key is missing for provider: ${activeProvider}. Please add your key in Settings.`);
        }
        // 2. Fetch Scene & Project Context
        const scene = await db.get(`
      SELECT o.*, p.title as project_title, p.summary as project_summary 
      FROM outline_elements o
      JOIN projects p ON o.project_id = p.id
      WHERE o.id = ?
    `, options.sceneId);
        if (!scene) {
            throw new Error(`Scene ID ${options.sceneId} not found.`);
        }
        const sceneContentRow = await db.get('SELECT content FROM scene_contents WHERE scene_id = ?', options.sceneId);
        const sceneText = sceneContentRow ? sceneContentRow.content : '';
        // 3. Extract Codex entries relevant to the scene
        const codexEntries = await db.all('SELECT * FROM codex_entries WHERE project_id = ?', scene.project_id);
        const metadataIds = JSON.parse(scene.metadata || '[]');
        const textToLower = sceneText.toLowerCase();
        const activeEntries = codexEntries.filter(entry => {
            if (metadataIds.includes(entry.id))
                return true;
            if (textToLower.includes(entry.name.toLowerCase()))
                return true;
            if (entry.aliases) {
                const aliasList = entry.aliases.split(',').map((a) => a.trim().toLowerCase());
                return aliasList.some((alias) => alias && textToLower.includes(alias));
            }
            return false;
        });
        let codexContext = '';
        if (activeEntries.length > 0) {
            codexContext = 'STORY CODEX REFERENCE (World Lore & Entities):\n';
            activeEntries.forEach(entry => {
                codexContext += `- [${entry.category.toUpperCase()}] ${entry.name}`;
                if (entry.aliases)
                    codexContext += ` (Aliases: ${entry.aliases})`;
                codexContext += `: ${entry.description || ''}`;
                if (entry.notes)
                    codexContext += ` | Notes: ${entry.notes}`;
                codexContext += '\n';
            });
        }
        // 4. Style & Constraint Settings (POV, Tense, Tone, Custom Guidelines)
        const povSetting = options.styleOverrides?.pov || await this.getSetting('writing_pov') || 'third_limited';
        const tenseSetting = options.styleOverrides?.tense || await this.getSetting('writing_tense') || 'past';
        const toneSetting = options.styleOverrides?.tone || await this.getSetting('writing_tone') || 'Balanced Narrative';
        const customRules = await this.getSetting('writing_custom_rules');
        const povDescriptions = {
            first_person: "First Person Point of View ('I', 'me', 'we'). Stick to the narrator's direct sensory experience and inner thoughts.",
            third_limited: "Third Person Limited Point of View ('he', 'she', 'they'). Adhere strictly to the active POV character's perspective without head-hopping.",
            third_omniscient: "Third Person Omniscient Point of View. The narrator has an overarching, all-knowing perspective.",
            second_person: "Second Person Point of View ('you')."
        };
        const tenseDescriptions = {
            past: "Past Tense (e.g., 'walked', 'said', 'felt').",
            present: "Present Tense (e.g., 'walks', 'says', 'feels')."
        };
        const styleInstructions = `
Writing Style & Narrative Constraints:
- Point of View: ${povDescriptions[povSetting] || povSetting}
- Tense: ${tenseDescriptions[tenseSetting] || tenseSetting}
- Tone & Atmosphere: ${toneSetting}
${customRules ? `- Author Custom Guidelines: ${customRules}` : ''}
`;
        // 5. System Prompt Construction
        const systemPrompt = `You are a professional co-writer assistant helping an author draft their manuscript.
Story Details:
- Project Title: ${scene.project_title}
- Project Concept: ${scene.project_summary || 'No overall project summary provided.'}
- Active Scene: ${scene.title}
- Active Scene Outline/Summary: ${scene.summary || 'No scene summary provided.'}

${styleInstructions}
${codexContext}
Guidelines:
1. Conform strictly to the style, pacing, tone, POV, tense, and vocabulary established.
2. Adhere to character traits, locations, and lore in the Story Codex.
3. Be helpful, imaginative, and focused on writing high-quality narrative prose. Avoid writing meta-commentary, lists, or intros/outros unless specifically requested. Output raw story prose directly.`;
        // 6. Structure Messages Payload based on action type
        const messages = [];
        if (options.action === 'continue') {
            const templateContinue = await this.getSetting('prompt_template_continue');
            const continueInstruction = templateContinue ||
                'Please continue writing the next section or paragraph of the scene naturally. Do not repeat what has been written. Output only the new narrative prose.';
            messages.push({ role: 'system', content: systemPrompt });
            messages.push({
                role: 'user',
                content: `Here is the current manuscript draft for the scene:\n\n"""\n${sceneText}\n"""\n\n${continueInstruction}`
            });
        }
        else if (options.action === 'rewrite') {
            const templateRewrite = await this.getSetting('prompt_template_rewrite');
            const customInstruction = options.prompt || templateRewrite || 'Improve flow, imagery, and pacing while preserving story meaning';
            messages.push({ role: 'system', content: systemPrompt });
            messages.push({
                role: 'user',
                content: `Here is the current scene manuscript:\n\n"""\n${sceneText}\n"""\n\nSpecific text selected to rewrite:\n"${options.selection}"\n\nInstructions for rewrite: ${customInstruction}.\n\nOutput only the rewritten prose to replace the selection.`
            });
        }
        else if (options.action === 'summarize') {
            messages.push({ role: 'system', content: 'You are a helper that summarizes story scenes concisely into plot cards.' });
            messages.push({
                role: 'user',
                content: `Summarize the key events, revelations, and emotional beats in the following manuscript text:\n\n"""\n${options.selection || sceneText}\n"""`
            });
        }
        else {
            // Default: 'chat' action
            messages.push({ role: 'system', content: systemPrompt });
            if (options.history && options.history.length > 0) {
                options.history.forEach(msg => {
                    messages.push({ role: msg.role, content: msg.content });
                });
            }
            messages.push({
                role: 'user',
                content: `${options.prompt}\n\n(Current scene manuscript for your reference:)\n"""\n${sceneText.slice(-3000)}\n"""`
            });
        }
        return {
            provider: activeProvider,
            endpoint,
            apiKey,
            model,
            messages,
            systemPrompt
        };
    }
    /**
     * Non-streaming fallback generation
     */
    static async generate(options) {
        let fullText = '';
        await this.generateStream(options, chunk => {
            fullText += chunk;
        });
        return fullText;
    }
    /**
     * Streaming generation supporting Ollama, OpenAI, OpenRouter, and Anthropic
     */
    static async generateStream(options, onChunk, signal) {
        const { provider, endpoint, apiKey, model, messages, systemPrompt } = await this.prepareContext(options);
        const headers = {
            'Content-Type': 'application/json'
        };
        let body = {};
        if (provider === 'openai') {
            headers['Authorization'] = `Bearer ${apiKey}`;
            body = {
                model,
                messages,
                temperature: 0.7,
                stream: true
            };
        }
        else if (provider === 'anthropic') {
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
            const systemMessage = messages.find(m => m.role === 'system');
            const anthropicSystem = systemMessage ? systemMessage.content : systemPrompt;
            const anthropicMessages = messages
                .filter(m => m.role !== 'system')
                .map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content
            }));
            body = {
                model,
                system: anthropicSystem,
                messages: anthropicMessages,
                max_tokens: 4000,
                temperature: 0.7,
                stream: true
            };
        }
        else if (provider === 'openrouter') {
            headers['Authorization'] = `Bearer ${apiKey}`;
            headers['HTTP-Referer'] = 'https://github.com/opencrafter';
            headers['X-Title'] = 'OpenCrafter';
            body = {
                model,
                messages,
                temperature: 0.7,
                stream: true
            };
        }
        else {
            // Ollama
            body = {
                model,
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                stream: true,
                options: {
                    temperature: 0.7
                }
            };
        }
        let fullAccumulatedText = '';
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`AI Provider returned error [Status ${response.status}]: ${errorText}`);
            }
            if (!response.body) {
                throw new Error('Response body is null, cannot stream from AI provider.');
            }
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            while (true) {
                if (signal?.aborted) {
                    reader.cancel();
                    break;
                }
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                // Retain uncompleted line in buffer
                buffer = lines.pop() || '';
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed)
                        continue;
                    // 1. Ollama format: newline-delimited JSON objects
                    if (provider === 'ollama') {
                        try {
                            const parsed = JSON.parse(trimmed);
                            if (parsed.message?.content) {
                                const textChunk = parsed.message.content;
                                fullAccumulatedText += textChunk;
                                onChunk(textChunk);
                            }
                        }
                        catch (_) {
                            // Partial JSON or heartbeat line
                        }
                    }
                    // 2. Anthropic SSE format
                    else if (provider === 'anthropic') {
                        if (trimmed.startsWith('data:')) {
                            const jsonStr = trimmed.replace(/^data:\s*/, '');
                            try {
                                const parsed = JSON.parse(jsonStr);
                                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                                    const textChunk = parsed.delta.text;
                                    fullAccumulatedText += textChunk;
                                    onChunk(textChunk);
                                }
                            }
                            catch (_) { }
                        }
                    }
                    // 3. OpenAI & OpenRouter SSE format
                    else {
                        if (trimmed.startsWith('data:')) {
                            const jsonStr = trimmed.replace(/^data:\s*/, '');
                            if (jsonStr === '[DONE]')
                                continue;
                            try {
                                const parsed = JSON.parse(jsonStr);
                                const textChunk = parsed.choices?.[0]?.delta?.content;
                                if (textChunk) {
                                    fullAccumulatedText += textChunk;
                                    onChunk(textChunk);
                                }
                            }
                            catch (_) { }
                        }
                    }
                }
            }
            // Process any remaining bytes in buffer
            if (buffer.trim() && provider === 'ollama') {
                try {
                    const parsed = JSON.parse(buffer.trim());
                    if (parsed.message?.content) {
                        const textChunk = parsed.message.content;
                        fullAccumulatedText += textChunk;
                        onChunk(textChunk);
                    }
                }
                catch (_) { }
            }
            return fullAccumulatedText;
        }
        catch (error) {
            if (signal?.aborted || error.name === 'AbortError') {
                return fullAccumulatedText;
            }
            console.error(`Error communicating with LLM stream (${provider}):`, error);
            throw new Error(`LLM Streaming Error: ${error.message || error}`);
        }
    }
}
exports.AIService = AIService;
