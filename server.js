// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config(); // load .env file

const app = express();
app.use(cors());
app.use(express.json()); // allows POST requests with JSON

// Initialize OpenAI with your API key (kept hidden in .env)
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Debate AI endpoint
app.post("/api/debate", async (req, res) => {
  try {
    const { motion, role, messages = [], systemPrompt, maxTokens = 500, temperature = 0.8 } = req.body;
    
    const finalSystemPrompt = systemPrompt || `You are a debate AI playing the role of ${role}`;
    const finalMessages = messages.length > 0 ? messages : [
      { role: "user", content: `Debate the motion: ${motion}` }
    ];

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: finalSystemPrompt },
        ...finalMessages
      ],
      max_tokens: maxTokens,
      temperature: temperature
    });

    res.json({ reply: response.choices[0].message.content });
  } catch (err) {
    console.error('OpenAI API Error:', err);
    res.status(500).json({ error: "Something went wrong with the AI response" });
  }
});

// Topic knowledge generation endpoint
app.post("/api/topic-knowledge", async (req, res) => {
  try {
    const { motion } = req.body;
    
    const systemPrompt = `You are a debate research assistant. Generate comprehensive topic knowledge for the motion: "${motion}". 
    
    Provide:
    1. Key definitions and interpretations
    2. 3-4 major arguments for each side
    3. Real-world examples and case studies
    4. Statistical data and evidence
    5. Common rebuttals and responses
    
    Format as structured text with clear sections for easy reference during prep.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: systemPrompt }],
      max_tokens: 800,
      temperature: 0.7
    });

    res.json({ knowledge: response.choices[0].message.content });
  } catch (err) {
    console.error('Topic knowledge error:', err);
    res.status(500).json({ error: "Failed to generate topic knowledge" });
  }
});

// Prep materials generation endpoint
app.post("/api/prep-materials", async (req, res) => {
  try {
    const { motion, userTeam, format } = req.body;
    const userTeamSide = ['OG', 'CG'].includes(userTeam) ? 'Government' : 'Opposition';
    
    const systemPrompt = `You are an AI debate coach preparing materials for the ${userTeamSide} side on: "${motion}".
    
    Generate:
    1. 3 strong arguments with mechanisms and impacts
    2. Potential rebuttals to opposition arguments
    3. Key statistics and examples
    4. Strategic advice for ${format} format
    
    Keep it concise but comprehensive - this is prep material for quick reference.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: systemPrompt }],
      max_tokens: 600,
      temperature: 0.8
    });

    res.json({ materials: response.choices[0].message.content });
  } catch (err) {
    console.error('Prep materials error:', err);
    res.status(500).json({ error: "Failed to generate prep materials" });
  }
});

// AI speech generation endpoint
app.post("/api/generate-speech", async (req, res) => {
  try {
    const { motion, speakerRole, speechType, teamSide, format, debateHistory, difficulty } = req.body;
    
    let rolePrompt = '';
    switch (speechType) {
      case 'constructive':
        rolePrompt = `You are the ${speakerRole} arguing for the ${teamSide} side. Present your team's main case with clear arguments, mechanisms, and impacts.`;
        break;
      case 'extension':
        rolePrompt = `You are the ${speakerRole}. Your job is to extend the ${teamSide} case through new impacts and mechanisms, while also providing rebuttals to the opposition.`;
        break;
      case 'rebuttal':
        rolePrompt = `You are the ${speakerRole}. Focus on weighing mechanisms, crystallizing the debate, and explaining why your side wins. Provide strong rebuttals and impact comparison.`;
        break;
    }

    const systemPrompt = `${rolePrompt}

Motion: "${motion}"
Format: ${format}

Previous speeches:
${debateHistory}

Deliver a ${speechType} speech. Use advanced debate techniques:
1. Clear signposting and structure
2. Mechanized arguments with logical reasoning
3. Strong impacts and implications
4. Address opponent arguments where relevant
5. Use evidence and examples effectively

Style: ${difficulty} level debate (adjust complexity accordingly)`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: systemPrompt }],
      max_tokens: 700,
      temperature: 0.8
    });

    res.json({ speech: response.choices[0].message.content });
  } catch (err) {
    console.error('Speech generation error:', err);
    res.status(500).json({ error: "Failed to generate speech" });
  }
});

// Judge speech endpoint
app.post("/api/judge-speech", async (req, res) => {
  try {
    const { speaker, speechType, content } = req.body;
    
    const systemPrompt = `You are an expert debate judge evaluating this speech:

Speaker: ${speaker}
Type: ${speechType}
Content: ${content}

Rate on three categories (0-100):
1. Content: Argument quality, logic, evidence, relevance
2. Style: Clarity, persuasiveness, structure, delivery
3. Strategy: Role fulfillment, clash engagement, debate awareness

Provide scores and brief explanations in JSON format:
{
  "content": score,
  "style": score, 
  "strategy": score,
  "comments": "Brief feedback explaining the scores"
}`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: systemPrompt }],
      max_tokens: 300,
      temperature: 0.7
    });

    const scoreData = JSON.parse(response.choices[0].message.content);
    res.json(scoreData);
  } catch (err) {
    console.error('Judging error:', err);
    res.status(500).json({ error: "Failed to judge speech" });
  }
});

// Final RFD generation endpoint
app.post("/api/final-rfd", async (req, res) => {
  try {
    const { motion, format, allSpeeches } = req.body;
    
    const systemPrompt = `You are a world-class debate adjudicator providing a Reason for Decision (RFD) for this ${format} debate on "${motion}".

All speeches:
${allSpeeches}

Provide a comprehensive RFD including:
1. Analysis of each team's case and strategy
2. Key clashes and how they were resolved
3. Impact comparison and weighing
4. Team rankings with justification
5. Individual speaker feedback

Be specific about argumentation quality, strategic choices, and technical debate skills.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: systemPrompt }],
      max_tokens: 1000,
      temperature: 0.7
    });

    res.json({ rfd: response.choices[0].message.content });
  } catch (err) {
    console.error('RFD generation error:', err);
    res.status(500).json({ error: "Failed to generate RFD" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));