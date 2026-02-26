import { OpenAI } from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'edge';

export async function POST(req: Request) {
    try {
        const { name, gender, birthDate, question, cards, isPaid } = await req.json();

        // 格式化抽到的牌面
        const cardNames = cards.map((c: any) => c.name).join(', ');

        const systemPrompt = `
      You are the "Aether Oracle," a master of Tarot and Cosmic energies.
      The user ${name} (${gender}, born ${birthDate}) has drawn 3 cards: ${cardNames}.
      Their question is: "${question}".

      ${isPaid
            ? "The user has PAID. Provide a 500-word deep mystical analysis. Breakdown each card and their connection to the future. Do NOT use paywall tags."
            : "The user is FREE. Provide a 2-paragraph reading focusing on the first card only. Then write '---PAYWALL---' to hide the rest."
        }

      Structure:
      1. [The Spread]: Acknowledge the cards ${cardNames}.
      2. [Current Energy]: Deep dive into the first card.
      3. [Future & Guidance]: (This part is hidden if not paid).
      
      Tone: High-end, mysterious, empathetic. 
      Language: Match the user's question language.
    `;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'system', content: systemPrompt }],
            stream: true,
            temperature: 0.8,
        });

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                for await (const chunk of response) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) controller.enqueue(encoder.encode(content));
                }
                controller.close();
            },
        });

        return new Response(stream);
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Connection to stars failed.' }), { status: 500 });
    }
}