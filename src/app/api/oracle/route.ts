import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = 'nodejs';

export async function POST(req: Request) {
    // 1. 纯净初始化，不传任何 version 参数
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey!);

    try {
        // 2. 仅指定模型名，让 0.24.1 SDK 自动选择最优路径 (v1)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const { name, question, cards } = await req.json();
        const prompt = `你是一位神秘的塔罗牌大师。用户${name}想问：${question}。抽到的牌是：${cards.map((c: any) => c.name).join(', ')}。请给出占卜结果。`;

        // 3. 发起请求
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        return new Response(text, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
    } catch (error: any) {
        // 这里的日志会告诉我们最终真相
        console.error("❌ THE TRUTH:", error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}