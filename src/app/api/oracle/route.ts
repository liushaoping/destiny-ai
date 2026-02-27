export const runtime = 'nodejs';

export async function POST(req: Request) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return new Response("OpenAI API Key Missing", { status: 500 });
    }

    try {
        const { name, question, cards } = await req.json();
        const promptText = `你是一位神秘的塔罗牌大师。用户${name}想问：${question}。抽到的牌是：${cards.map((c: any) => c.name).join(', ')}。请给出解读结果。`;

        // 直接使用原生 fetch 请求 OpenAI 接口
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini", // 使用性价比最高的模型
                messages: [
                    { role: "system", content: "你是一位精通塔罗牌占卜的大师，语气神秘且富有洞察力。" },
                    { role: "user", content: promptText }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("❌ OpenAI API Error:", data);
            return new Response(JSON.stringify({ error: data.error?.message || "OpenAI Error" }), { status: response.status });
        }

        const aiResponse = data.choices?.[0]?.message?.content || "大师正在感应星象...";

        return new Response(aiResponse, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}