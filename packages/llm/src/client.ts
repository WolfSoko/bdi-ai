import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const authToken = process.env.ANTHROPIC_AUTH_TOKEN;

    if (authToken) {
      client = new Anthropic({ authToken });
    } else if (apiKey) {
      client = new Anthropic({ apiKey });
    } else {
      throw new Error(
        'Set either ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN in your .env file'
      );
    }
  }
  return client;
}

export async function complete(
  system: string,
  userContent: string,
  model = 'claude-sonnet-4-6'
): Promise<string> {
  const c = getClient();
  const response = await c.messages.create({
    model,
    max_tokens: 2048,
    system,
    messages: [{ role: 'user', content: userContent }],
  });

  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude');
  return block.text;
}

export async function completeJSON<T>(
  system: string,
  userContent: string,
  model = 'claude-sonnet-4-6'
): Promise<T> {
  const jsonSystem = system + '\n\nIMPORTANT: Respond with valid JSON only. No markdown, no explanation, just the JSON.';
  const text = await complete(jsonSystem, userContent, model);

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Failed to parse JSON response: ${cleaned.slice(0, 200)}`);
  }
}
