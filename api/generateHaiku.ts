import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { topic } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      // Return a fallback haiku if no API key
      const fallbackHaiku = `${topic} whispers soft\nNature's gentle melody\nPeace flows through my soul`;
      return res.status(200).json({ haiku: fallbackHaiku });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        messages: [{
          role: 'user',
          content: `Write a traditional haiku (3 lines: 5-7-5 syllables) about "${topic}". Return only the haiku text, no title or explanation.`
        }],
        max_tokens: 60
      })
    });

    if (!response.ok) {
      throw new Error('Claude API request failed');
    }

    const data = await response.json();
    const haiku = data.content[0].text.trim();
    
    res.status(200).json({ haiku });
  } catch (error) {
    console.error('Error generating haiku:', error);
    // Return a generic haiku on error
    const fallbackHaiku = `Silent code flows deep\nElectrons dance through the void\nMagic comes to life`;
    res.status(200).json({ haiku: fallbackHaiku });
  }
}