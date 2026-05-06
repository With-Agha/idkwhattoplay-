const Anthropic = require("@anthropic-ai/sdk");

const safe = (str, max) => String(str || "").slice(0, max).trim();

// ── Prompts live on the server — users can never see or manipulate these ──
const buildPrompt = {

  group: (d) => `You are the world's best gaming expert. A group of friends needs the PERFECT game to play together tonight.

SQUAD DETAILS:
- Players: ${safe(d.players, 20)}
- Platforms they have: ${safe(d.platforms, 120)}
- Time available: ${safe(d.time, 40)}
- Tonight's vibe: ${safe(d.vibe, 80)}
${d.context ? `- Extra context: ${safe(d.context, 300)}` : ""}

Respond in EXACTLY this format — no preamble, no extra text:

GAME: [Full Game Name Here]

WHY IT FITS TONIGHT:
[2-3 punchy sentences. Be specific about WHY this game works for their exact player count, platforms, time, and vibe. Sound like a friend who knows games, not a Wikipedia article.]

PRO TIP:
[One highly specific, practical tip. A mode to start in, a setting to change, or something that makes the first session way better.]

HARD RULES — follow these or you fail:
- Recommend ONE game only. No alternatives, no "or you could try...".
- Only recommend games actually playable on the platforms listed.
- Player count must match — never recommend a 2-player game for 5 people.
- If time is short, no 60-hour RPGs.
- If they listed games they own, strongly prefer recommending one of those.`,

  backlog: (d) => `You are a gaming expert helping someone choose from games they already own.

PLAYER SITUATION:
- Games they own: ${safe(d.games, 600)}
- Current mood: ${safe(d.mood, 80)}
- Time available: ${safe(d.time, 40)}
- Playing: ${safe(d.players, 30)}

YOUR JOB: Pick exactly ONE game from their list that best matches their mood right now.

Respond in EXACTLY this format — no preamble:

GAME: [Game Name — must be from their list]

WHY THIS ONE RIGHT NOW:
[2-3 sentences connecting their exact mood to why this specific game is the right choice tonight. Be direct and confident.]

WHERE TO START:
[One specific tip — which mode, which save approach, or exactly where to jump in for tonight's session.]

HARD RULES:
- You MUST pick from the games they listed. Do not suggest games they don't own.
- ONE game only. Be decisive.
- If their list is empty or unreadable, ask them to add some games.`,

  mood: (d) => `You are a game recommendation engine that runs on pure emotional vibes.

RIGHT NOW:
- How they're feeling: ${safe(d.feeling, 100)}
- Solo or with people: ${safe(d.solo, 30)}
- Time available: ${safe(d.time, 40)}

Give ONE perfect game recommendation based entirely on this emotional state. Any platform, any era — pure vibe match.

Respond in EXACTLY this format — no preamble:

GAME: [Full Game Name Here]

WHY THIS MATCHES YOUR ENERGY:
[2-3 sentences that connect their exact emotional state to the game. Be almost poetic — make them feel understood, then excited.]

THE VIBE YOU'LL GET:
[1-2 sentences describing the actual feeling of playing this game tonight — not mechanics, pure experience.]

HARD RULES:
- ONE game only. Be opinionated and confident.
- Prioritise emotional resonance above all else.
- Don't hedge. Don't say "it depends". Just pick.`
};

exports.handler = async function (event) {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed." })
    };
  }

  // Parse body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid request." })
    };
  }

  const { mode, ...data } = body;

  // Validate mode
  if (!mode || !buildPrompt[mode]) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid mode." })
    };
  }

  // Log every search for future analytics — player intent data
  console.log(JSON.stringify({
    event: "recommendation_request",
    mode,
    timestamp: new Date().toISOString(),
    vibe: data.vibe || data.mood || data.feeling || "unknown",
    players: data.players || "unknown",
    platforms: data.platforms || "N/A",
    time: data.time || "unknown",
    hasContext: !!(data.context || data.games)
  }));

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 700,
      messages: [{ role: "user", content: buildPrompt[mode](data) }]
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    if (!text || text.length < 20) throw new Error("Empty response from AI.");

    // Parse the game title from the response for affiliate links
    const gameTitleMatch = text.match(/^GAME:\s*(.+)/m);
    const gameTitle = gameTitleMatch ? gameTitleMatch[1].trim() : "";

    console.log(JSON.stringify({
      event: "recommendation_success",
      mode,
      gameRecommended: gameTitle,
      timestamp: new Date().toISOString()
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result: text, gameTitle })
    };

  } catch (err) {
    console.error(JSON.stringify({
      event: "recommendation_error",
      mode,
      error: err.message,
      timestamp: new Date().toISOString()
    }));

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Something went wrong. Please try again." })
    };
  }
};
