from google import genai
from google.genai import types

client = genai.Client(api_key="AIzaSyBbddeSPEn0k870HhLkzmAdRV2zQP4qAAM")

tool = types.Tool(google_search=types.GoogleSearch())

config = types.GenerateContentConfig(tools=[tool])

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="current date and time in New Delhi",
    config=config,
)

print(response.text)