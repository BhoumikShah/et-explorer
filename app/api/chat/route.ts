import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages, contextData } = await req.json();

    // 1. System Prompt matching the ET brand
    const systemPrompt = {
      role: 'system',
      content: `You are the ET Wealth AI. You are a highly professional, rigorous financial advisor. 
      The user is targeting a ${contextData.totalTarget} FIRE corpus by age ${contextData.fireAge}. 
      Their current Safe Withdrawal Rate is ${contextData.swr}% and they invest ${contextData.monthlySip}/mo.
      Answer their analytical questions concisely based on these exact numbers. Keep your responses short and actionable.`
    };

    // 2. We use Groq to access the Open-Source 'Llama 3 8B' model at massive speeds for free.
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // The latest open-source Meta model (Llama 3.1)
        messages: [systemPrompt, ...messages],
        temperature: 0.7, // Balances creativity with analytical facts
      }),
    });

    if (!response.ok) {
       const errorText = await response.text();
       return NextResponse.json({ reply: `ET Wealth AI Connection Error: ${errorText}. Please verify the API key configuration.` }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({ reply: data.choices[0].message.content });

  } catch (error) {
    console.error("Chat Error:", error);
    return NextResponse.json({ reply: 'Failed to securely connect to ET Wealth AI.' }, { status: 500 });
  }
}
