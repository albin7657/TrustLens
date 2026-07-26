import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
print(f"Key prefix: {api_key[:20] if api_key else 'NOT FOUND'}")

genai.configure(api_key=api_key)

# The model list showed gemini-2.5-flash is available, let's verify it works
for model_name in ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"]:
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Say 'hello test'")
        print(f"SUCCESS with model: {model_name}")
        print(response.text[:150])
        break
    except Exception as e:
        print(f"FAIL {model_name}: {str(e)[:100]}")
