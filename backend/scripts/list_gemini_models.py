import os
from dotenv import load_dotenv
import google.generativeai as genai

# ✅ Load .env from one directory above backend/
dotenv_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(dotenv_path)

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print(f"❌ No GEMINI_API_KEY found. Tried loading from: {os.path.abspath(dotenv_path)}")
    exit(1)

genai.configure(api_key=api_key)

def main():
    print("Listing available Gemini models...\n")
    try:
        models = genai.list_models()
    except Exception as e:
        print("❌ Error fetching models:", e)
        return

    found_any = False
    for m in models:
        name = getattr(m, "name", None) or getattr(m, "model", None)
        methods = getattr(m, "supported_generation_methods", []) or getattr(m, "supported_methods", [])
        print(f"- {name} | supported methods: {methods}")
        if "generateContent" in (methods or []):
            found_any = True

    if found_any:
        print("\n✅ Found models supporting 'generateContent'!")
    else:
        print("\n⚠️ No models found supporting 'generateContent'.")

if __name__ == "__main__":
    main()
