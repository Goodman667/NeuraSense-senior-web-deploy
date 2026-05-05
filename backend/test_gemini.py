import google.generativeai as genai

API_KEY = "AIzaSyDbFn87bCPyarZl_EphVjd6DjZx8WBAkXQ"
genai.configure(api_key=API_KEY)

# 列出所有可用模型（完整输出）
print("All available models with generateContent:")
models = list(genai.list_models())
for m in models:
    if 'generateContent' in m.supported_generation_methods:
        print(f"  {m.name}")

if models:
    # 使用第一个可用模型
    first_model = None
    for m in models:
        if 'generateContent' in m.supported_generation_methods:
            first_model = m.name
            break
    
    if first_model:
        print(f"\nUsing first available: {first_model}")
        try:
            model = genai.GenerativeModel(first_model)
            response = model.generate_content('你好，我今天心情不好')
            print(f"Response: {response.text[:200]}")
        except Exception as e:
            print(f"Error: {e}")
