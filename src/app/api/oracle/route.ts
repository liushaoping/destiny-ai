import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = 'nodejs';

export async function POST(req: Request) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
        return new Response(JSON.stringify({ error: "API Key is missing in Vercel env" }), { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // 强制使用稳定版配置
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash"
        });

        const { name, question, cards } = await req.json();
        const cardNames = cards.map((c: any) => c.name).join(', ');

        const prompt = `你是一位塔罗牌大师。用户${name}想问：${question}。抽到的牌是：${cardNames}。请给出占卜。`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        return new Response(text, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
    } catch (error: any) {
        console.error("❌ API ERROR:", error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}