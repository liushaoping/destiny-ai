import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = 'nodejs';

export async function POST(req: Request) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
        return new Response("API Key Missing", { status: 500 });
    }

    // ✅ 正确初始化：构造函数只传一个参数
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // ✅ 核心修改：在 getGenerativeModel 中指定模型，
        // 对于 0.24.1+ 版本，SDK 会默认尝试最稳定的 v1 接口。
        const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });

        const { name, question, cards } = await req.json();
        const prompt = `你是一位神秘的塔罗牌大师。用户${name}想问：${question}。抽到的牌是：${cards.map((c: any) => c.name).join(', ')}。请给出占卜结果。`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        return new Response(text, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
    } catch (error: any) {
        // 如果依然报 404，说明是路径映射问题，我们将捕获它
        console.error("❌ THE TRUTH:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}