export const runtime = 'nodejs';

export async function POST(req: Request) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) return new Response("API Key Missing", { status: 500 });

    try {
        const { name, question, cards } = await req.json();
        const promptText = `你是一位神秘的塔罗牌大师。用户${name}想问：${question}。抽到的牌是：${cards.map((c: any) => c.name).join(', ')}。请给出占卜结果。`;

        // 🔥 直接请求 v1 稳定版全路径，彻底绕过 v1beta 陷阱
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Google API Error');
        }

        // 解析 Google API 返回的标准格式
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "大师陷入了沉思，请稍后再试。";

        return new Response(aiResponse, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });

    } catch (error: any) {
        console.error("❌ THE FINAL TRUTH:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}