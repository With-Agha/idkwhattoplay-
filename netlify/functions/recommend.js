const Anthropic = require("@anthropic-ai/sdk");

const safe = (str, max) => String(str || "").slice(0, max).trim();

const buildPrompt = {
  group: (d) => `You are a gaming expert. Pick ONE game for: Players: ${safe(d.players, 20)}, Platforms: ${safe(d.platforms, 120)}, Vibe: ${safe(d.vibe, 80)}. Respond ONLY with valid JSON. { "game": "Name", "tagline": "Line", "why": "Description", "reasons": [], "protip": "", "genre": "", "players": "", "session_length": "", "difficulty": "", "mood_match": "", "ambience": "dark|bright|cozy|intense", "similar": [], "hltb": "" }`,
  backlog: (d) => `Pick one from this list: ${safe(d.games, 600)}. Mood: ${safe(d.mood, 80)}. Respond ONLY with valid JSON (same format as above).`,
  mood: (d) => `Pick a game for this feeling: ${safe(d.feeling, 100)}. Respond ONLY with valid JSON (same format as above).`
};

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const body = JSON.parse(event.body);
    const { mode, ...data } = body;
    
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001", 
      max_tokens: 1000,
      messages: [{ role: "user", content: buildPrompt[mode](data) }]
    });

    const result = JSON.parse(message.content[0].text);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result })
    };
  } catch (err) {
    console.error("API Error:", err.message);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "AI is warming up. Try again in 30 seconds." })
    };
  }
};
