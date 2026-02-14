export interface FoodRecognitionResult {
  foodName: string;
  protein: number;
  calories: number;
  confidence: 'high' | 'medium' | 'low';
}

export async function recognizeFood(
  imageBase64: string,
  apiKey: string,
): Promise<FoodRecognitionResult[]> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `你是一個食物營養分析助手。分析照片中的食物，回傳 JSON 陣列，每個食物項目包含：
- foodName: 食物名稱（中文，含份量估計，例如「雞胸肉 約150g」）
- protein: 蛋白質克數（數字）
- calories: 熱量 kcal（數字）
- confidence: 辨識信心（"high" / "medium" / "low"）

只回傳 JSON 陣列，不要其他文字。如果無法辨識食物，回傳空陣列 []。`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: '請分析這張照片中的食物營養成分。' },
            {
              type: 'image_url',
              image_url: { url: imageBase64, detail: 'low' },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      err?.error?.message || `OpenAI API 錯誤 (${response.status})`,
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim() ?? '[]';

  // Extract JSON from potential markdown code blocks
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed)) return [];

  return parsed.map(
    (item: Record<string, unknown>): FoodRecognitionResult => ({
      foodName: String(item.foodName ?? ''),
      protein: Math.round(Number(item.protein) || 0),
      calories: Math.round(Number(item.calories) || 0),
      confidence: (['high', 'medium', 'low'].includes(
        item.confidence as string,
      )
        ? item.confidence
        : 'low') as FoodRecognitionResult['confidence'],
    }),
  );
}

export function fileToBase64DataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
