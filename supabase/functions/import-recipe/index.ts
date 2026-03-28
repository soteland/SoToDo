import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { url } = await req.json()
  if (!url) return new Response(JSON.stringify({ error: 'url required' }), { status: 400, headers: corsHeaders })

  // Fetch the page
  const pageRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  const html = await pageRes.text()

  // Strip tags, collapse whitespace, cap length
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000)

  const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Extract the recipe from the text below and return it as JSON in Norwegian (bokmål). Translate all text.

Text:
${text}

Return ONLY valid JSON — no markdown, no explanation — in this exact format:
{
  "name": "Recipe name in Norwegian",
  "description": "1–2 sentence description in Norwegian",
  "instructions": [
    "Step 1 in Norwegian",
    "Step 2 in Norwegian"
  ],
  "ingredients": [
    {
      "item_name": "Ingredient name in Norwegian",
      "quantity": 1,
      "unit": "stk",
      "is_pantry_staple": false
    }
  ]
}

Rules:
- unit must be one of: stk, g, kg, dl, L
- is_pantry_staple = true for: salt, pepper, spices, oil, flour, sugar, butter, vinegar, broth/stock cubes, soy sauce, basic condiments the user likely already has
- is_pantry_staple = false for: fresh produce, meat, fish, dairy, specific sauces you need to buy
- quantity must be a positive integer; use the closest whole number
- Translate everything to Norwegian bokmål`,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return new Response(JSON.stringify({ error: 'Could not parse recipe from page' }), {
      status: 422,
      headers: corsHeaders,
    })
  }

  const recipe = JSON.parse(jsonMatch[0])

  return new Response(JSON.stringify(recipe), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
