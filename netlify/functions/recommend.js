const Anthropic = require("@anthropic-ai/sdk");

const safe = (str, max) => String(str || "").slice(0, max).trim();

const buildPrompt = {
  group: (d) => `You are the world's best gaming expert. A group of friends needs the PERFECT game tonight.

SQUAD:
- Players: ${safe(d.players, 20)}
- Platforms: ${safe(d.platforms, 120)}
- Time: ${safe(d.time, 40)}
- Vibe: ${safe(d.vibe, 80)}
${d.context ? `- Context: ${safe(d.context, 300)}` : ""}

Respond ONLY with valid JSON, no markdown, no preamble:
{
  "game": "Full Game Name",
  "tagline": "One punchy sentence — the vibe of this game in one line",
  "why": "2-3 sentences why this fits their exact squad size, platform, time and vibe. Friend voice, not robot.",
  "reasons": ["Reason 1 they'll love it", "Reason 2 they'll love it", "Reason 3 they'll love it"],
  "protip": "One highly specific practical tip for their first session",
  "genre": "e.g. Battle Royale",
  "players": "e.g. 2-6 players",
  "session_length": "e.g. 30 min sessions",
  "difficulty": "Easy / Medium / Hard",
  "mood_match": "e.g. Perfect for: Chaotic fun",
  "ambience": "dark|bright|cozy|intense",
  "similar": ["Similar Game 1", "Similar Game 2", "Similar Game 3"],
  "hltb": "e.g. Main Story: ~15h"
}`,

  backlog: (d) => `You are a gaming expert helping someone choose from games they already own.

SITUATION:
- Games owned: ${safe(d.games, 600)}
- Mood: ${safe(d.mood, 80)}
- Time: ${safe(d.time, 40)}
- Playing: ${safe(d.players, 30)}

Respond ONLY with valid JSON, no markdown, no preamble. Pick from their list:
{
  "game": "Game Name from their list",
  "tagline": "One sentence — why this is the right pick right now",
  "why": "2-3 sentences connecting their mood to this specific game tonight.",
  "reasons": ["Why tonight is perfect for this 1", "Why tonight is perfect for this 2", "Why tonight is perfect for this 3"],
  "protip": "One specific tip — mode, save approach, or where to jump in",
  "genre": "Genre",
  "players": "Solo or multiplayer info",
  "session_length": "e.g. 1-2 hour sessions",
  "difficulty": "Easy / Medium / Hard",
  "mood_match": "e.g. Perfect for: Unwinding",
  "ambience": "dark|bright|cozy|intense",
  "similar": ["Similar Game 1", "Similar Game 2", "Similar Game 3"],
  "hltb": "e.g. Main Story: ~20h"
}`,

  mood: (d) => `You are a game recommendation engine running on pure emotional vibes.

RIGHT NOW:
- Feeling: ${safe(d.feeling, 100)}
- Playing: ${safe(d.solo, 30)}
- Time: ${safe(d.time, 40)}

Respond ONLY with valid JSON, no markdown, no preamble:
{
  "game": "Full Game Name",
  "tagline": "One almost-poetic line — the emotional resonance of this pick",
  "why": "2-3 sentences connecting their emotional state to this game. Make them feel understood.",
  "reasons": ["Emotional reason 1", "Emotional reason 2", "Emotional reason 3"],
  "protip": "One insight that makes the experience better tonight",
  "genre": "Genre",
  "players": "Solo or multiplayer info",
  "session_length": "e.g. Any length",
  "difficulty": "Easy / Medium / Hard",
  "mood_match": "e.g. Perfect for: Stressed minds",
  "ambience": "dark|bright|cozy|intense",
  "similar": ["Similar Game 1", "Similar Game 2", "Similar Game 3"],
  "hltb": "e.g. Main Story: ~8h"
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

  console.log(JSON.stringify({
    event: "request", mode,
    vibe: data.vibe || data.mood || data.feeling || "unknown",
    players: data.players || "unknown",
    time: data.time || "unknown",
    timestamp: new Date().toISOString()
  }));

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 900,
      messages: [{ role: "user", content: buildPrompt[mode](data) }]
    });

    const raw = message.content.filter(b => b.type === "text").map(b => b.text).join("").trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid response format.");
    const result = JSON.parse(jsonMatch[0]);

    console.log(JSON.stringify({ event: "success", mode, game: result.game, ambience: result.ambience, timestamp: new Date().toISOString() }));

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
