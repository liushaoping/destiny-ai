export const runtime = 'nodejs';

export async function POST(req: Request) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return new Response("API Key Missing", { status: 500 });

    try {
        const { name, question, cards, gender, birthDate, isPaid } = await req.json();

        // 1. 强化版系统提示词：增加强制性，并明确要求忽略 Prompt 自身的语言，只对齐用户问题语种
        const systemInstruction = `
            ROLE: Mysterious Tarot Master.
            LANGUAGE RULE: You MUST identify the language of the 'USER_QUESTION' and reply EXCLUSIVELY in that same language. 
            - If USER_QUESTION is in English, reply in English.
            - If USER_QUESTION is in Chinese, reply in Chinese.
            DO NOT be influenced by the language of this system prompt.
            
            PAYWALL LOGIC: 
            - If isPaid is false: Provide ONLY the first 2 paragraphs, then output "---PAYWALL---" and STOP.
            - If isPaid is true: Provide the full detailed reading.
        `.trim();

        // 2. 将数据标签也改为英文，防止干扰 AI 的语种判定
        const promptText = `
            USER_DATA:
            - Name: ${name}
            - Gender: ${gender}
            - Birth: ${birthDate}
            - Cards: ${cards.map((c: any) => c.name).join(', ')}
            - Payment Status: ${isPaid ? 'PAID' : 'NOT PAID'}

            USER_QUESTION: "${question}"

            Please provide the reading in the language of USER_QUESTION.
        `.trim();

        const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: systemInstruction },
                    { role: "user", content: promptText }
                ],
                stream: true
            })
        });

        if (!response.ok) {
            const error = await response.json();
            return new Response(JSON.stringify(error), { status: response.status });
        }

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
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
                        if (trimmedLine.startsWith('data: ')) {
                            try {
                                const json = JSON.parse(trimmedLine.replace('data: ', ''));
                                const text = json.choices[0]?.delta?.content || "";
                                if (text) controller.enqueue(encoder.encode(text));
                            } catch (e) {}
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
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
} // 🔥 确保这里有这个关闭花括号，防止 image_0d1716 中的报错