export const runtime = 'nodejs';

export async function POST(req: Request) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) return new Response("API Key Missing", { status: 500 });

    try {
        const { name, question, cards } = await req.json();
        const promptText = `你是一位神秘的塔罗牌大师。用户${name}想问：${question}。抽到的牌是：${cards.map((c: any) => c.name).join(', ')}。请给出占卜结果。`;

        // 💡 备选模型列表，按优先级排序
        const modelNames = ["gemini-3-flash", "gemini-1.5-flash-latest", "gemini-1.5-flash"];
        let lastError = "";

        for (const modelName of modelNames) {
            // 尝试 v1beta 路径，因为它对新模型支持最全
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
            });

            if (response.ok) {
                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
            } else {
                const errData = await response.json();
                lastError = `${modelName}: ${errData.error?.message}`;
                console.warn(`⚠️ Attempt failed for ${modelName}`, errData.error?.message);
            }
        }

        throw new Error(`所有模型均不可用。最后一次错误：${lastError}`);

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}