// 1. 引入必要的类
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = 'nodejs';

export async function POST(req: Request) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    try {
        // 2. 关键修复：在初始化时强制指定 API 版本为 "v1"
        const genAI = new GoogleGenerativeAI(apiKey!);

        // 3. 另一种保底写法（如果上面失效）：直接指定模型完整路径
        const model = genAI.getGenerativeModel(
            { model: "gemini-1.5-flash" },
            { apiVersion: "v1" } // 👈 强制覆盖默认的 v1beta
        );

        const { name, question, cards } = await req.json();

        // 构建 Prompt
        const prompt = `你是一位神秘塔罗牌大师。用户${name}问：${question}。抽到的牌：${cards.map((c: any) => c.name).join(', ')}。请给出占卜结果。`;

        // 4. 执行生成
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        return new Response(text, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });

    } catch (error: any) {
        console.error("❌ FINAL ERROR:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}