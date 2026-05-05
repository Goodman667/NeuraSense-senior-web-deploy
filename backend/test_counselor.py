import asyncio
from app.services.llm import CounselorService

async def test():
    counselor = CounselorService()
    print(f"API Key: {counselor.LLM_API_KEY[:20]}...")
    print(f"Provider: {counselor.LLM_PROVIDER}")
    print(f"Model: {counselor.LLM_MODEL}")
    
    print("\n--- Calling generate_response ---")
    try:
        response = await counselor.generate_response(
            user_message="你好，我今天心情不太好",
            conversation_history=None,
            emotion_context=None
        )
        print(f"\nSUCCESS!")
        print(f"Response: {response.message}")
    except Exception as e:
        print(f"\nFAILED: {e}")
        import traceback
        traceback.print_exc()

asyncio.run(test())
