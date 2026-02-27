import { GoogleGenerativeAI } from "@google/generative-ai";

// 强制使用 nodejs 运行环境，有时 Edge 运行环境会导致环境变量读取不稳
export const runtime = 'nodejs';

export async function POST(req: Request) {
    // 1. 打印内部调试信息 (会在 Vercel Logs 显示)
    console.log("--- 🌌 ORACLE INVOCATION START ---");

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    console.log("API Key exists:", !!apiKey);
    if (apiKey) console.log("Key prefix:", apiKey.substring(0, 6));

    try {
        if (!apiKey) {
            throw new Error("ENVIRONMENT_VARIABLE_MISSING: GOOGLE_GENERATIVE_AI_API_KEY is not set.");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const { name, question, cards } = await req.json();

        // 2. 这里的模型名称采用最稳妥的写法
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        console.log("Attempting to generate content...");

        // 使用非流式请求测试稳定性
        const result = await model.generateContent(`你是一位塔罗牌大师。用户${name}问：${question}。抽到的牌是：${cards.map((c: any) => c.name).join(', ')}。请给出简短占卜。`);
        const response = await result.response;
        const text = response.text();

        console.log("Content generated successfully!");

        return new Response(text, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });

    } catch (error: any) {
        console.error("❌ CRITICAL ERROR:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}