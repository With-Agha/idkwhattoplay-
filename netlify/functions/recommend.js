const Anthropic = require("@anthropic-ai/sdk");

const safe = (str, max) => String(str || "").slice(0, max).trim();

const buildPrompt = {

  group: (d) => `You are the world's best gaming expert. A group of friends needs the PERFECT game tonight.

SQUAD:
- Players: ${safe(d.players, 20)}
- Platforms: ${safe(d.platforms, 120)}
- Time: ${safe(d.time, 40)}
- Vibe: ${safe(d.vibe, 80)}
${d.context ? `- Extra context: ${safe(d.context, 300)}` : ""}

Respond in EXACTLY this JSON format, nothing else:
{
  "game": "Full Game Name",
  "tagline": "One punchy sentence capturing the essence of this game",
  "why": "2-3 sentences explaining exactly why this fits their squad, platform, time and vibe tonight. Sound like a knowledgeable friend.",
  "protip": "One highly specific practical tip for their first session",
  "genre": "Genre (e.g. Battle Royale, Co-op Shooter, Party Game)",
  "players": "e.g. 2-6 players",
  "time_to_play": "e.g. 30 min sessions or 2-3 hour sessions",
  "difficulty": "Easy / Medium / Hard",
  "mood_match": "e.g. Perfect for: Chaotic fun nights",
  "similar": ["Game 1", "Game 2", "Game 3"],
  "reasons": ["Reason why they'll love it 1", "Reason why they'll love it 2", "Reason why they'll love it 3"]
}`,

  backlog: (d) => `You are a gaming expert helping someone choose from games they already own.

SITUATION:
- Games owned: ${safe(d.games, 600)}
- Mood: ${safe(d.mood, 80)}
- Time: ${safe(d.time, 40)}
- Playing: ${safe(d.players, 30)}

Respond in EXACTLY this JSON format, nothing else:
{
  "game": "Game Name (must be from their list)",
  "tagline": "One punchy sentence capturing why this is the pick right now",
  "why": "2-3 sentences connecting their exact mood to why this specific game is perfect tonight.",
  "protip": "One specific tip — which mode, save approach, or where to jump in",
  "genre": "Genre",
  "players": "e.g. Solo or 2-4 players",
  "time_to_play": "e.g. 1-2 hour sessions",
  "difficulty": "Easy / Medium / Hard",
  "mood_match": "e.g. Perfect for: Chill unwinding",
  "similar": ["Similar game 1", "Similar game 2", "Similar game 3"],
  "reasons": ["Why you'll love it tonight 1", "Why you'll love it tonight 2", "Why you'll love it tonight 3"]
}`,

  mood: (d) => `You are a game recommendation engine running on pure emotional vibes.

RIGHT NOW:
- Feeling: ${safe(d.feeling, 100)}
- Playing: ${safe(d.solo, 30)}
- Time: ${safe(d.time, 40)}

Respond in EXACTLY this JSON format, nothing else:
{
  "game": "Full Game Name",
  "tagline": "One poetic sentence capturing why this matches their energy",
  "why": "2-3 sentences connecting their emotional state to this game. Be almost poetic — make them feel understood then excited.",
  "protip": "One insight that makes the experience better",
  "genre": "Genre",
  "players": "e.g. Solo or Multiplayer",
  "time_to_play": "e.g. Any session length",
  "difficulty": "Easy / Medium / Hard",
  "mood_match": "e.g. Perfect for: Stressed minds that need escape",
  "similar": ["Similar game 1", "Similar game 2", "Similar game 3"],
  "reasons": ["Emotional reason 1", "Emotional reason 2", "Emotional reason 3"]
}`
};

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Method not allowed." }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Invalid request." }) }; }

  const { mode, ...data } = body;
  if (!mode || !buildPrompt[mode]) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Invalid mode." }) };
  }

  // Log for analytics
  console.log(JSON.stringify({
    event: "recommendation_request",
    mode,
    timestamp: new Date().toISOString(),
    vibe: data.vibe || data.mood || data.feeling || "unknown",
    players: data.players || "unknown",
    time: data.time || "unknown"
  }));

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 900,
      messages: [{ role: "user", content: buildPrompt[mode](data) }]
    });

    const raw = message.content.filter(b => b.type === "text").map(b => b.text).join("").trim();

    // Parse JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid response format.");
    const result = JSON.parse(jsonMatch[0]);

    console.log(JSON.stringify({ event: "recommendation_success", mode, game: result.game, timestamp: new Date().toISOString() }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result })
    };

  } catch (err) {
    console.error(JSON.stringify({ event: "error", mode, error: err.message, timestamp: new Date().toISOString() }));
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Something went wrong. Please try again." })
    };
  }
};
