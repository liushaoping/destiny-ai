import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. 初始化 Gemini 客户端
// 确保你在 .env.local 中添加了 GOOGLE_GENERATIVE_AI_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export const runtime = 'edge';

export async function POST(req: Request) {
    try {
        const { name, gender, birthDate, question, cards, isPaid } = await req.json();

        // 格式化卡牌信息
        const cardNames = cards.map((c: any) => c.name).join(', ');

        // 2. 构建系统级 Prompt
        const promptText = `
      You are the "Aether Oracle," a master of Tarot and Cosmic energies.
      The user ${name} (${gender}, born ${birthDate}) has drawn 3 cards: ${cardNames}.
      Their question is: "${question}".

      ${isPaid
            ? "The user has PAID. Provide a deep mystical analysis of at least 500 words. Breakdown each card and their connection to the future. Do NOT use any paywall tags."
            : "The user is on a FREE trial. Provide a 2-paragraph reading focusing ONLY on the general energy of the first card. After the second paragraph, you MUST write the exact string '---PAYWALL---' and then stop immediately."
        }

      Structure your response in a mysterious, high-end, and empathetic tone. 
      Match the language of the user's question.
    `;

        // 3. 调用 Gemini 1.5 Flash 模型
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // 开启流式传输
        const result = await model.generateContentStream(promptText);

        // 4. 将 Gemini 的流转换为标准 ReadableStream 以适配 Next.js
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    for await (const chunk of result.stream) {
                        const chunkText = chunk.text();
                        if (chunkText) {
                            controller.enqueue(encoder.encode(chunkText));
                        }
                    }
                    controller.close();
                } catch (err) {
                    controller.error(err);
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Transfer-Encoding": "chunked",
            },
        });

    } catch (error: any) {
        // 调试日志
        console.error("🌌 Gemini Oracle Error:", error);

        return new Response(
            JSON.stringify({
                error: "The cosmic connection was interrupted.",
                details: error.message
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        );
    }
}