import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = 'edge';

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

        // 如果 Key 没拿到，直接返回清晰的提示
        if (!apiKey || apiKey.length < 10) {
            return new Response(JSON.stringify({
                error: "Key Missing",
                details: "Vercel 环境变量中未找到有效的 Google API Key。"
            }), { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const { name, gender, birthDate, question, cards, isPaid } = await req.json();

        // 调用 Gemini 1.5 Flash
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const promptText = `你是一位神秘的塔罗牌大师。
      求问者：${name} (${gender}, 出生日期: ${birthDate})。
      抽到的牌：${cards.map((c: any) => c.name).join(', ')}。
      问题：${question}。
      ${isPaid ? "请提供500字以上的深度解析。" : "请简单提供两段解析，然后加上 '---PAYWALL---' 字符串并停止。"}
      请用中文回答，保持神秘感。`;

        const result = await model.generateContentStream(promptText);

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    for await (const chunk of result.stream) {
                        const chunkText = chunk.text();
                        if (chunkText) controller.enqueue(encoder.encode(chunkText));
                    }
                    controller.close();
                } catch (err: any) {
                    controller.enqueue(encoder.encode(`\n[流解析错误]: ${err.message}`));
                    controller.close();
                }
            },
        });

        return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });

    } catch (error: any) {
        return new Response(JSON.stringify({
            error: "宇宙连接中断",
            details: error.message
        }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}