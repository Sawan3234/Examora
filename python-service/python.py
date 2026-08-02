from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()
uri = os.getenv('MONGODB_URI')
client = MongoClient(uri)
db = client.examora

# Correct syntax - find_one() not findOne()
user = db.users.find_one({'name': 'suyog'})
count = len(user.get('faceDescriptors', []))
print(f"Face descriptors count: {count}")

if count > 0:
    print(f"✅ First descriptor length: {len(user['faceDescriptors'][0])}")
else:
    print("❌ No face data found!")