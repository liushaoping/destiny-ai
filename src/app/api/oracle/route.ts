import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = 'nodejs';

export async function POST(req: Request) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    // 💡 核心修改：手动强制 SDK 使用 v1 路径，跳过 v1beta 的 404 陷阱
    const genAI = new GoogleGenerativeAI(apiKey!, { apiVersion: 'v1' });

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const { name, question, cards } = await req.json();
        const prompt = `你是一位神秘的塔罗牌大师。用户${name}想问：${question}。抽到的牌是：${cards.map((c: any) => c.name).join(', ')}。请给出占卜结果。`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        return new Response(text, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
    } catch (error: any) {
        // 如果这里还报 404，那一定是模型权限或地域限制
        console.error("❌ THE TRUTH:", error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}