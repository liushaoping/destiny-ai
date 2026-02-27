export const runtime = 'nodejs';

export async function POST(req: Request) {
    const apiKey = process.env.OPENAI_API_KEY; // 依然使用你存放 DeepSeek Key 的变量
    if (!apiKey) return new Response("API Key Missing", { status: 500 });

    try {
        const { name, question, cards } = await req.json();
        const promptText = `你是一位神秘的塔罗牌大师。用户${name}想问：${question}。抽到的牌是：${cards.map((c: any) => c.name).join(', ')}。请给出解读结果。`;

        const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: "你是一位精通塔罗牌占卜的大师，语气神秘且富有洞察力。" },
                    { role: "user", content: promptText }
                ],
                stream: true // 🔥 开启流式输出
            })
        });

        // 使用 TransformStream 将 DeepSeek 的流格式转换为前端易读的文本流
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body?.getReader();
                if (!reader) return;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n').filter(line => line.trim() !== '');

                    for (const line of lines) {
                        if (line.includes('[DONE]')) continue;
                        if (line.startsWith('data: ')) {
                            try {
                                const json = JSON.parse(line.replace('data: ', ''));
                                const text = json.choices[0]?.delta?.content || "";
                                if (text) controller.enqueue(encoder.encode(text));
                            } catch (e) {
                                console.error("解析流出错", e);
                            }
                        }
                    }
                }
                controller.close();
            }
        });

        return new Response(stream, {
            headers: { "Content-Type": "text/plain; charset=utf-8" }
        });

    } catch (error: any) {
        return new Response(error.message, { status: 500 });
    }
}