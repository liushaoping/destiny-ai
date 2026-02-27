import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. 初始化，增加 key 存在性校验
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// 建议在部署 Vercel 时启用 edge 以获得更好的流式体验
export const runtime = 'edge';

export async function POST(req: Request) {
    try {
        // 如果 key 没配置，直接拦截并报错
        if (!genAI) {
            return new Response(JSON.stringify({
                error: "Configuration missing",
                details: "API Key is not configured in Vercel Environment Variables."
            }), { status: 500 });
        }

        const { name, gender, birthDate, question, cards, isPaid } = await req.json();
        const cardNames = cards.map((c: any) => c.name).join(', ');

        // 2. 这里的模型名称使用最新的稳定版本标识符
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const promptText = `
      You are the "Aether Oracle." 
      User: ${name} (${gender}, born ${birthDate}). 
      Cards Drawn: ${cardNames}.
      Question: "${question}".

      ${isPaid
            ? "The user has PAID. Provide a deep, mystical 500-word analysis."
            : "FREE trial. Provide 2 paragraphs, then add the exact string '---PAYWALL---' and stop."
        }
      Tone: Mystical, empathetic, and professional. Match the user's language.
    `;

        // 3. 执行流式生成
        const result = await model.generateContentStream(promptText);

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
                } catch (err: any) {
                    // 这里捕捉流过程中的具体错误
                    controller.enqueue(encoder.encode(`\n[Cosmic Error]: ${err.message}`));
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });

    } catch (error: any) {
        console.error("Gemini Route Error:", error);

        // 返回标准 JSON 格式错误，防止前端解析出 HTML
        return new Response(
            JSON.stringify({
                error: "The cosmic connection was interrupted.",
                details: error.message || "Unknown API error"
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}