import { getDatabase } from '../config/database';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerationOptions {
  sceneId: number;
  prompt?: string;        // Optional user prompt/instruction (for chat or custom commands)
  history?: ChatMessage[]; // Optional chat history
  action?: 'continue' | 'chat' | 'rewrite' | 'summarize'; // Action type
  selection?: string;     // Text selection (for rewrite/summarize)
}

export class AIService {
  private static async getSetting(key: string): Promise<string> {
    const db = await getDatabase();
    const row = await db.get('SELECT value FROM settings WHERE key = ?', key);
    return row ? row.value : '';
  }

  public static async generate(options: GenerationOptions): Promise<string> {
    const db = await getDatabase();

    // 1. Get Settings
    const activeProvider = await this.getSetting('active_provider');
    
    let apiKey = '';
    let model = '';
    let endpoint = '';

    if (activeProvider === 'openai') {
      apiKey = await this.getSetting('openai_api_key');
      model = await this.getSetting('openai_model') || 'gpt-4o-mini';
      endpoint = 'https://api.openai.com/v1/chat/completions';
    } else if (activeProvider === 'anthropic') {
      apiKey = await this.getSetting('anthropic_api_key');
      model = await this.getSetting('anthropic_model') || 'claude-3-5-sonnet-20240620';
      endpoint = 'https://api.anthropic.com/v1/messages';
    } else if (activeProvider === 'openrouter') {
      apiKey = await this.getSetting('openrouter_api_key');
      model = await this.getSetting('openrouter_model') || 'meta-llama/llama-3-8b-instruct:free';
      endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    } else {
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
    // First, get all Codex entries for this project
    const codexEntries = await db.all('SELECT * FROM codex_entries WHERE project_id = ?', scene.project_id);
    
    // We filter codex entries based on whether they are mentioned in the scene text OR in the scene metadata.
    const metadataIds: number[] = JSON.parse(scene.metadata || '[]');
    const textToLower = sceneText.toLowerCase();

    const activeEntries = codexEntries.filter(entry => {
      // Explicitly attached
      if (metadataIds.includes(entry.id)) return true;
      
      // Implicitly detected by name
      if (textToLower.includes(entry.name.toLowerCase())) return true;
      
      // Implicitly detected by aliases
      if (entry.aliases) {
        const aliasList = entry.aliases.split(',').map((a: string) => a.trim().toLowerCase());
        return aliasList.some((alias: string) => alias && textToLower.includes(alias));
      }
      return false;
    });

    // 4. Construct System Prompt & Codex Context
    let codexContext = '';
    if (activeEntries.length > 0) {
      codexContext = 'STORY CODEX REFERENCE (World Lore):\n';
      activeEntries.forEach(entry => {
        codexContext += `- [${entry.category.toUpperCase()}] ${entry.name}`;
        if (entry.aliases) codexContext += ` (Aliases: ${entry.aliases})`;
        codexContext += `: ${entry.description || ''}`;
        if (entry.notes) codexContext += ` | Notes: ${entry.notes}`;
        codexContext += '\n';
      });
    }

    const systemPrompt = `You are a professional co-writer assistant helping an author draft their manuscript.
Story Details:
- Project Title: ${scene.project_title}
- Project Concept: ${scene.project_summary || 'No overall project summary provided.'}
- Active Scene: ${scene.title}
- Active Scene Outline/Summary: ${scene.summary || 'No scene summary provided.'}

${codexContext}
Guidelines:
1. Conform strictly to the style, pacing, and vocabulary established in the manuscript.
2. Adhere to character traits, locations, and lore in the Story Codex.
3. Be helpful, imaginative, and focused on writing high-quality narrative prose. Avoid writing meta-commentary, lists, or intros/outros unless specifically requested. Output raw story prose directly.`;

    // 5. Structure the messages payload based on action type
    const messages: ChatMessage[] = [];

    if (options.action === 'continue') {
      messages.push({ role: 'system', content: systemPrompt });
      messages.push({
        role: 'user',
        content: `Here is the current manuscript draft for the scene:\n\n"""\n${sceneText}\n"""\n\nPlease continue writing the next section or paragraph of the scene naturally. Do not repeat what has been written. Output only the new narrative prose.`
      });
    } else if (options.action === 'rewrite') {
      messages.push({ role: 'system', content: systemPrompt });
      messages.push({
        role: 'user',
        content: `Here is the current scene manuscript:\n\n"""\n${sceneText}\n"""\n\nSpecific text selected to rewrite:\n"${options.selection}"\n\nInstructions for rewrite: ${options.prompt || 'Improve flow and descriptions'}.\n\nOutput only the rewritten prose to replace the selection.`
      });
    } else if (options.action === 'summarize') {
      messages.push({ role: 'system', content: 'You are a helper that summarizes story scenes.' });
      messages.push({
        role: 'user',
        content: `Summarize the following manuscript text:\n\n"""\n${options.selection || sceneText}\n"""`
      });
    } else {
      // Default: 'chat' action
      messages.push({ role: 'system', content: systemPrompt });
      if (options.history && options.history.length > 0) {
        // Filter history to ensure format compatibility and append
        options.history.forEach(msg => {
          messages.push({ role: msg.role, content: msg.content });
        });
      }
      // Add current user prompt
      messages.push({
        role: 'user',
        content: `${options.prompt}\n\n(Current scene manuscript for your reference:)\n"""\n${sceneText.slice(-3000)}\n"""`
      });
    }

    // 6. Make request to provider
    return await this.callLLM(activeProvider, endpoint, apiKey, model, messages, systemPrompt);
  }

  private static async callLLM(
    provider: string,
    endpoint: string,
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    systemPrompt: string
  ): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    let body: any = {};

    if (provider === 'openai') {
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = {
        model,
        messages,
        temperature: 0.7
      };
    } else if (provider === 'anthropic') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      
      // Anthropic messages cannot contain 'system' role messages.
      // We extract the first system prompt if it exists, or use the generated system prompt.
      const systemMessage = messages.find(m => m.role === 'system');
      const anthropicSystem = systemMessage ? systemMessage.content : systemPrompt;
      const anthropicMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
          content: m.content
        }));

      body = {
        model,
        system: anthropicSystem,
        messages: anthropicMessages,
        max_tokens: 4000,
        temperature: 0.7
      };
    } else if (provider === 'openrouter') {
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['HTTP-Referer'] = 'https://github.com/opencrafter';
      headers['X-Title'] = 'OpenCrafter';
      body = {
        model,
        messages,
        temperature: 0.7
      };
    } else {
      // Ollama
      // Ollama /api/chat expects: { model: string, messages: Array<{role, content}>, stream: false }
      body = {
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: false,
        options: {
          temperature: 0.7
        }
      };
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Provider returned error [Status ${response.status}]: ${errorText}`);
      }

      const data = await response.json();

      // Extract result depending on the provider structure
      if (provider === 'openai' || provider === 'openrouter') {
        return data.choices?.[0]?.message?.content || '';
      } else if (provider === 'anthropic') {
        return data.content?.[0]?.text || '';
      } else {
        // Ollama
        return data.message?.content || '';
      }
    } catch (error: any) {
      console.error(`Error communicating with LLM (${provider}):`, error);
      throw new Error(`LLM Error: ${error.message || error}`);
    }
  }
}
