export const runtime = 'nodejs';

export async function POST(req: Request) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) return new Response("API Key Missing", { status: 500 });

    try {
        const { name, question, cards } = await req.json();
        const promptText = `你是一位神秘的塔罗牌大师。用户${name}想问：${question}。抽到的牌是：${cards.map((c: any) => c.name).join(', ')}。请给出占卜结果。`;

        // 🔥 修改点：使用你列表中显示的 Gemini 3 Flash
        // 路径依然使用 v1 稳定版
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-3-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("❌ API Detail Error:", data);
            // 如果 gemini-3-flash 依然报找不到，尝试 gemini-3.1-pro
            return new Response(JSON.stringify(data), { status: response.status });
        }

        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "大师正在感应宇宙能量...";

        return new Response(aiResponse, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });

    } catch (error: any) {
        return new Response(error.message, { status: 500 });
    }
}