import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = 'nodejs';

export async function POST(req: Request) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey!);

    try {
        // 探测当前账户支持的模型列表
        const models = await genAI.listModels();

        // 打印到 Vercel 日志 (查看 Logs 即可看到)
        console.log("--- AVAILABLE MODELS ---");
        models.models.forEach(m => console.log(`Model Name: ${m.name}`));

        return new Response("Check Vercel Logs for model list", { status: 200 });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}