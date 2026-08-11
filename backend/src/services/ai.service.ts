import { getDatabase } from '../config/database';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerationOptions {
  sceneId: number;
  prompt?: string;        // Optional user prompt/instruction (for chat or custom commands)
  history?: ChatMessage[]; // Optional chat history
  action?: 'continue' | 'chat' | 'rewrite' | 'summarize' | 'expand_beats' | 'generate_beats' | 'critique'; // Action type
  selection?: string;     // Text selection (for rewrite/summarize)
  beats?: string[];       // Scene beats for expansion
  pacing?: 'concise' | 'standard' | 'elaborate'; // Expansion pacing dial
  // Optional runtime overrides
  styleOverrides?: {
    pov?: string;
    tense?: string;
    tone?: string;
  };
}

interface PreparedLLMContext {
  provider: string;
  endpoint: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  systemPrompt: string;
}

export class AIService {
  public static async getSetting(key: string): Promise<string> {
    const db = await getDatabase();
    const row = await db.get('SELECT value FROM settings WHERE key = ?', key);
    return row ? row.value : '';
  }

  private static async prepareContext(options: GenerationOptions): Promise<PreparedLLMContext> {
    const db = await getDatabase();

    // 1. Provider & Model Settings
    const activeProvider = await this.getSetting('active_provider') || 'ollama';
    
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
    const codexEntries = await db.all('SELECT * FROM codex_entries WHERE project_id = ?', scene.project_id);
    const metadataIds: number[] = JSON.parse(scene.metadata || '[]');
    const textToLower = sceneText.toLowerCase();

    const activeEntries = codexEntries.filter(entry => {
      if (metadataIds.includes(entry.id)) return true;
      if (textToLower.includes(entry.name.toLowerCase())) return true;
      if (entry.aliases) {
        const aliasList = entry.aliases.split(',').map((a: string) => a.trim().toLowerCase());
        return aliasList.some((alias: string) => alias && textToLower.includes(alias));
      }
      return false;
    });

    let codexContext = '';
    if (activeEntries.length > 0) {
      codexContext = 'STORY CODEX REFERENCE (World Lore & Entities):\n';
      activeEntries.forEach(entry => {
        codexContext += `- [${entry.category.toUpperCase()}] ${entry.name}`;
        if (entry.aliases) codexContext += ` (Aliases: ${entry.aliases})`;
        codexContext += `: ${entry.description || ''}`;
        if (entry.notes) codexContext += ` | Notes: ${entry.notes}`;
        codexContext += '\n';
      });
    }

    // 4. Style & Constraint Settings (POV, Tense, Tone, Custom Guidelines)
    const povSetting = options.styleOverrides?.pov || await this.getSetting('writing_pov') || 'third_limited';
    const tenseSetting = options.styleOverrides?.tense || await this.getSetting('writing_tense') || 'past';
    const toneSetting = options.styleOverrides?.tone || await this.getSetting('writing_tone') || 'Balanced Narrative';
    const customRules = await this.getSetting('writing_custom_rules');

    const povDescriptions: Record<string, string> = {
      first_person: "First Person Point of View ('I', 'me', 'we'). Stick to the narrator's direct sensory experience and inner thoughts.",
      third_limited: "Third Person Limited Point of View ('he', 'she', 'they'). Adhere strictly to the active POV character's perspective without head-hopping.",
      third_omniscient: "Third Person Omniscient Point of View. The narrator has an overarching, all-knowing perspective.",
      second_person: "Second Person Point of View ('you')."
    };

    const tenseDescriptions: Record<string, string> = {
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
    const messages: ChatMessage[] = [];

    if (options.action === 'continue') {
      const templateContinue = await this.getSetting('prompt_template_continue');
      const continueInstruction = templateContinue || 
        'Please continue writing the next section or paragraph of the scene naturally. Do not repeat what has been written. Output only the new narrative prose.';

      messages.push({ role: 'system', content: systemPrompt });
      messages.push({
        role: 'user',
        content: `Here is the current manuscript draft for the scene:\n\n"""\n${sceneText}\n"""\n\n${continueInstruction}`
      });
    } else if (options.action === 'rewrite') {
      const templateRewrite = await this.getSetting('prompt_template_rewrite');
      const customInstruction = options.prompt || templateRewrite || 'Improve flow, imagery, and pacing while preserving story meaning';

      messages.push({ role: 'system', content: systemPrompt });
      messages.push({
        role: 'user',
        content: `Here is the current scene manuscript:\n\n"""\n${sceneText}\n"""\n\nSpecific text selected to rewrite:\n"${options.selection}"\n\nInstructions for rewrite: ${customInstruction}.\n\nOutput only the rewritten prose to replace the selection.`
      });
    } else if (options.action === 'summarize') {
      messages.push({ role: 'system', content: 'You are a helper that summarizes story scenes concisely into plot cards.' });
      messages.push({
        role: 'user',
        content: `Summarize the key events, revelations, and emotional beats in the following manuscript text:\n\n"""\n${options.selection || sceneText}\n"""`
      });
    } else if (options.action === 'expand_beats') {
      const pacing = options.pacing || 'standard';
      let pacingGuide = '';
      if (pacing === 'concise') {
        pacingGuide = 'Pacing: Concise & brisk (~100-150 words per beat). Focus on direct action and vital dialogue.';
      } else if (pacing === 'elaborate') {
        pacingGuide = 'Pacing: Elaborate, atmospheric & introspective (~350-500 words per beat). Rich sensory immersion, internal monologue, and environmental mood.';
      } else {
        pacingGuide = 'Pacing: Standard dramatic narrative (~200-250 words per beat). Balanced action, dialogue, and description.';
      }

      const beatsText = (options.beats || []).map((b, i) => `Beat ${i + 1}: ${b}`).join('\n');

      messages.push({ role: 'system', content: systemPrompt });
      messages.push({
        role: 'user',
        content: `Expand the following structured scene beats into a full, seamless narrative scene draft.
${pacingGuide}

Structured Scene Beats:
${beatsText}

${sceneText.trim() ? `(Existing Draft Context to flow naturally from/after):\n"""\n${sceneText.slice(-2000)}\n"""\n` : ''}
Instructions:
- Write continuous, engaging literary prose covering each beat in chronological order.
- Do NOT output bullet points, "Beat 1:", or meta-commentary.
- Connect the beats seamlessly into complete paragraphs.
- Output raw story prose directly.`
      });
    } else if (options.action === 'generate_beats') {
      messages.push({ role: 'system', content: 'You are an expert novel outliner and narrative architect.' });
      messages.push({
        role: 'user',
        content: `Generate 4 to 6 chronological, action-oriented scene beats for this scene.
Project: ${scene.project_title}
Scene: ${scene.title}
Scene Summary/Objective: ${scene.summary || 'No summary provided.'}

${sceneText.trim() ? `Existing manuscript excerpt:\n"""\n${sceneText.slice(0, 1500)}\n"""\n` : ''}
Output format:
1. [Beat 1 description]
2. [Beat 2 description]
3. [Beat 3 description]
4. [Beat 4 description]
5. [Beat 5 description]`
      });
    } else if (options.action === 'critique') {
      messages.push({
        role: 'system',
        content: 'You are a master developmental editor and literary prose doctor. Provide sharp, encouraging, and highly specific critique on manuscript pacing, dialogue realism, sensory detail, and emotional resonance.'
      });
      messages.push({
        role: 'user',
        content: `Please examine and critique this scene draft:
Title: ${scene.title}
Summary Objective: ${scene.summary || 'N/A'}

Manuscript:
"""
${options.selection || sceneText}
"""

Please structure your diagnostic critique with:
1. 🎯 Pacing & Narrative Momentum (Where does it drag or rush?)
2. 💬 Dialogue & Subtext (Are character voices distinct?)
3. 👁️ Sensory Immersion (Sight, sound, smell, tactile depth)
4. ✂️ Show vs. Tell & Filter Words
5. 💡 Top 3 Actionable Suggestions to elevate this scene.`
      });
    } else {
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
  public static async generate(options: GenerationOptions): Promise<string> {
    let fullText = '';
    await this.generateStream(options, chunk => {
      fullText += chunk;
    });
    return fullText;
  }

  /**
   * Streaming generation supporting Ollama, OpenAI, OpenRouter, and Anthropic
   */
  public static async generateStream(
    options: GenerationOptions,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    const { provider, endpoint, apiKey, model, messages, systemPrompt } = await this.prepareContext(options);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    let body: any = {};

    if (provider === 'openai') {
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = {
        model,
        messages,
        temperature: 0.7,
        stream: true
      };
    } else if (provider === 'anthropic') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      
      const systemMessage = messages.find(m => m.role === 'system');
      const anthropicSystem = systemMessage ? systemMessage.content : systemPrompt;
      const anthropicMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
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
    } else if (provider === 'openrouter') {
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['HTTP-Referer'] = 'https://github.com/opencrafter';
      headers['X-Title'] = 'OpenCrafter';
      body = {
        model,
        messages,
        temperature: 0.7,
        stream: true
      };
    } else {
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
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Retain uncompleted line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // 1. Ollama format: newline-delimited JSON objects
          if (provider === 'ollama') {
            try {
              const parsed = JSON.parse(trimmed);
              if (parsed.message?.content) {
                const textChunk = parsed.message.content;
                fullAccumulatedText += textChunk;
                onChunk(textChunk);
              }
            } catch (_) {
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
              } catch (_) {}
            }
          }
          // 3. OpenAI & OpenRouter SSE format
          else {
            if (trimmed.startsWith('data:')) {
              const jsonStr = trimmed.replace(/^data:\s*/, '');
              if (jsonStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const textChunk = parsed.choices?.[0]?.delta?.content;
                if (textChunk) {
                  fullAccumulatedText += textChunk;
                  onChunk(textChunk);
                }
              } catch (_) {}
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
        } catch (_) {}
      }

      return fullAccumulatedText;
    } catch (error: any) {
      if (signal?.aborted || error.name === 'AbortError') {
        return fullAccumulatedText;
      }
      console.error(`Error communicating with LLM stream (${provider}):`, error);
      throw new Error(`LLM Streaming Error: ${error.message || error}`);
    }
  }
}
