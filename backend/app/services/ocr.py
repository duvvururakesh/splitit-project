import json
import re

from PIL import Image

from app.config import settings

PROMPT = """You are a receipt parser. Extract all line items and distribute the tax directly onto each taxable item.

Return ONLY valid JSON with no markdown fences, no explanation — just the raw JSON object.

Use exactly this shape:
{
  "merchant_name": "string or null",
  "total": number,
  "subtotal": number,
  "tax_total": number,
  "items": [
    {
      "name": "string",
      "quantity": number,
      "unit_price": number,
      "total_price": number,
      "is_taxable": boolean,
      "tax_rate": number,
      "is_tip_line": false
    }
  ]
}

Rules:
- "total" is the final amount on the receipt (including tax and tip)
- "subtotal" is the pre-tax sum of all regular items
- "tax_total" is the total tax shown on the receipt (0 if none)
- Do NOT include a separate tax line item — distribute tax onto the items instead
- For each item, set "is_taxable": true if it is subject to sales tax
  - Look for a "T" marker or asterisk next to the price on the receipt
  - If no markers, use context: groceries/food may be exempt in some states; prepared food, alcohol, household goods are typically taxable
  - When in doubt, mark all non-tip items as taxable
- Set "tax_rate" to the effective percentage for taxable items:
  - tax_rate = (tax_total / taxable_subtotal) * 100
  - Where taxable_subtotal = sum of total_price for all is_taxable items
  - Non-taxable items get tax_rate: 0
- "unit_price" and "total_price" are the PRE-TAX amounts
- Include tip as a separate item with is_tip_line: true, is_taxable: false, tax_rate: 0
- quantity defaults to 1 if not shown
- All numbers must be plain numbers (no $ signs)
- If a value is unclear, make your best estimate
"""


def parse_receipt(image_path: str) -> dict:
    import google.generativeai as genai

    genai.configure(api_key=settings.GEMINI_API_KEY)

    img = Image.open(image_path).convert("RGB")

    model = genai.GenerativeModel("gemini-2.5-flash")
    response = model.generate_content([img, PROMPT])

    raw = response.text.strip()

    # Strip markdown fences if model added them
    raw = re.sub(r"^```[a-z]*\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw)

    data = json.loads(raw)

    # Safety: if the AI still outputs a tax line, convert it instead of failing
    cleaned_items = []
    tax_line_total = 0.0
    for item in data.get("items", []):
        if item.get("is_tax_line"):
            tax_line_total += float(item.get("total_price", 0))
        else:
            cleaned_items.append(item)

    # If tax lines were found but tax wasn't distributed, do it now
    if tax_line_total > 0 and cleaned_items:
        taxable_subtotal = sum(
            float(i.get("total_price", 0))
            for i in cleaned_items
            if not i.get("is_tip_line") and i.get("is_taxable", True)
        )
        if taxable_subtotal > 0:
            rate = (tax_line_total / taxable_subtotal) * 100
            for item in cleaned_items:
                if not item.get("is_tip_line"):
                    item["is_taxable"] = True
                    item["tax_rate"] = round(rate, 4)

    data["items"] = cleaned_items
    return data
