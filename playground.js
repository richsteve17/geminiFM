import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

// 1. Read API Key from .env file automatically so you don't have to configure anything
let apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
    try {
        const envPath = path.resolve('.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const match = envContent.match(/VITE_GEMINI_API_KEY\s*=\s*(.+)/) || envContent.match(/GEMINI_API_KEY\s*=\s*(.+)/);
            if (match && match[1]) {
                apiKey = match[1].trim().replace(/['"]/g, '');
            }
        }
    } catch (err) {
        console.error("Failed to read .env file:", err);
    }
}

if (!apiKey) {
    console.error("❌ ERROR: Could not find VITE_GEMINI_API_KEY in your .env file.");
    console.error("Please ensure you have a .env file containing: VITE_GEMINI_API_KEY=your_key");
    process.exit(1);
}

// 2. Initialize Gemini SDK
const ai = new GoogleGenAI({ apiKey });
const model = 'gemini-2.5-flash'; // Using the 1,500 requests/day Gemini 2.5 Flash model!

async function main() {
    const args = process.argv.slice(2);
    
    // If the user passed a prompt in the terminal, run it!
    if (args.length > 0) {
        const prompt = args.join(' ');
        console.log(`🤖 Prompt: "${prompt}"`);
        console.log("Thinking...");
        
        try {
            const response = await ai.models.generateContent({
                model,
                contents: prompt,
            });
            console.log("\n💬 Response:\n" + response.text);
        } catch (err) {
            console.error("❌ API Call failed:", err);
        }
        return;
    }

    // Default: Show examples of different API call modes
    console.log("=========================================");
    console.log("🌟 GEMINI API PLAYGROUND EXAMPLES 🌟");
    console.log("=========================================\n");

    // Example A: Standard Text Response
    console.log("--- [Example A] Ask a Simple Question ---");
    try {
        const resA = await ai.models.generateContent({
            model,
            contents: "What are the 3 most iconic stadiums in football and why?",
        });
        console.log(resA.text.trim());
    } catch (err) {
        console.error("Example A failed:", err);
    }

    console.log("\n-----------------------------------------");

    // Example B: Structured JSON Response
    console.log("--- [Example B] Request Structured JSON ---");
    try {
        const resB = await ai.models.generateContent({
            model,
            contents: "List 2 fictional team transfers (player, fee, buying club, selling club).",
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        transfers: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    player: { type: "STRING" },
                                    feeEuro: { type: "INTEGER" },
                                    buyingClub: { type: "STRING" },
                                    sellingClub: { type: "STRING" }
                                },
                                required: ["player", "feeEuro", "buyingClub", "sellingClub"]
                            }
                        }
                    }
                }
            }
        });
        console.log(JSON.stringify(JSON.parse(resB.text), null, 2));
    } catch (err) {
        console.error("Example B failed:", err);
    }

    console.log("\n-----------------------------------------");
    console.log("💡 TIP: You can pass custom prompts. Try running:");
    console.log("node playground.js \"Why is Darwin Nunez chaotic?\"");
    console.log("=========================================");
}

main();
