# python/app.py - COMPLETE FIXED VERSION
# python/app.py - COMPLETE FIXED VERSION

from flask import Flask, request, jsonify
from flask_cors import CORS
import face_recognition
import numpy as np
import cv2
import base64
import os
import pickle
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import LabelEncoder
from datetime import datetime
import logging
from pymongo import MongoClient
# REMOVE THIS: from dotenv import load_dotenv
from bson import ObjectId
import hashlib
from collections import defaultdict

## ====== ENVIRONMENT SETUP ======
import os
import sys
from pathlib import Path

# Get the directory where app.py is located
app_dir = Path(__file__).parent
env_file = app_dir / '.env'

print(f"Looking for .env at: {env_file}")
print(f"File exists: {env_file.exists()}")

# Read the .env file manually
with open(env_file, 'r') as f:
    for line in f:
        if line.strip() and not line.startswith('#'):
            key, value = line.strip().split('=', 1)
            os.environ[key] = value
            print(f"Set {key} = {value[:20]}...")

MONGODB_URI = os.getenv('MONGODB_URI')

if not MONGODB_URI:
    raise ValueError("MONGODB_URI not found in .env file")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# ====== MONGODB CONNECTION ======
try:
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    db = client.examora
    users_col = db.users
    sessions_col = db.sessions
    violations_col = db.violations
    logger.info("✅ Connected to MongoDB")
except Exception as e:
    logger.error(f"❌ MongoDB connection failed: {e}")
    raise

# ====== MODEL MANAGEMENT ======
MODEL_DIR = 'models'
KNN_MODEL_PATH = os.path.join(MODEL_DIR, 'knn_model.pkl')
ENCODER_PATH = os.path.join(MODEL_DIR, 'label_encoder.pkl')

os.makedirs(MODEL_DIR, exist_ok=True)

knn_model = None
label_encoder = None
student_embeddings_cache = {}
all_embeddings = []
all_student_ids = []

# ====== AUDIO VIOLATION CACHE ======
audio_violations = defaultdict(list)

def save_models():
    """Save trained models to disk"""
    global knn_model, label_encoder
    try:
        if knn_model:
            with open(KNN_MODEL_PATH, 'wb') as f:
                pickle.dump(knn_model, f)
        if label_encoder:
            with open(ENCODER_PATH, 'wb') as f:
                pickle.dump(label_encoder, f)
        logger.info("💾 Models saved to disk")
    except Exception as e:
        logger.error(f"Failed to save models: {e}")

def load_models():
    """Load trained models from disk"""
    global knn_model, label_encoder
    try:
        if os.path.exists(KNN_MODEL_PATH) and os.path.exists(ENCODER_PATH):
            with open(KNN_MODEL_PATH, 'rb') as f:
                knn_model = pickle.load(f)
            with open(ENCODER_PATH, 'rb') as f:
                label_encoder = pickle.load(f)
            logger.info("✅ Models loaded from disk")
            return True
    except Exception as e:
        logger.error(f"Failed to load models: {e}")
    return False

def train_knn_model():
    """Train KNN model from collected embeddings"""
    global knn_model, label_encoder, all_embeddings, all_student_ids
    
    if len(all_embeddings) < 1:
        logger.warning(f"⚠️ Need at least 1 embedding, have {len(all_embeddings)}")
        return False
    
    try:
        X = np.array(all_embeddings)
        y = np.array(all_student_ids)
        
        label_encoder = LabelEncoder()
        y_encoded = label_encoder.fit_transform(y)
        
        unique_students = len(np.unique(y_encoded))
        if unique_students == 1:
            n_neighbors = 1
        else:
            n_neighbors = min(5, unique_students)
        
        knn_model = KNeighborsClassifier(n_neighbors=n_neighbors, metric='euclidean')
        knn_model.fit(X, y_encoded)
        
        save_models()
        logger.info(f"✅ KNN trained: {unique_students} student(s), k={n_neighbors}")
        return True
    except Exception as e:
        logger.error(f"Training failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def load_embeddings_from_db():
    """Load all face embeddings from MongoDB"""
    global student_embeddings_cache, all_embeddings, all_student_ids, knn_model
    
    student_embeddings_cache = {}
    all_embeddings = []
    all_student_ids = []
    
    try:
        users = users_col.find({'faceDescriptors': {'$exists': True, '$ne': []}})
        
        for user in users:
            student_id = str(user['_id'])
            face_descriptors = user.get('faceDescriptors', [])
            
            if face_descriptors:
                student_embeddings_cache[student_id] = []
                for desc in face_descriptors:
                    if desc is None:
                        continue
                    try:
                        embedding = np.array(desc, dtype=np.float64)
                        student_embeddings_cache[student_id].append(embedding)
                        all_embeddings.append(embedding)
                        all_student_ids.append(student_id)
                    except:
                        continue
        
        logger.info(f"✅ Loaded {len(all_embeddings)} embeddings from {len(student_embeddings_cache)} students")
        
        if len(all_embeddings) >= 1:
            return train_knn_model()
        else:
            if load_models():
                return True
            return False
            
    except Exception as e:
        logger.error(f"Error loading embeddings: {e}")
        return False

def extract_face_embedding(image_base64):
    """Extract face embedding from base64 image"""
    try:
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        
        img_data = base64.b64decode(image_base64)
        nparr = np.frombuffer(img_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return None, "Invalid image format"
        
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(image_rgb)
        
        if not face_locations:
            return None, "No face detected in image"
        
        face_encodings = face_recognition.face_encodings(image_rgb, face_locations)
        
        if not face_encodings:
            return None, "Could not encode face"
        
        return face_encodings[0], None
        
    except Exception as e:
        return None, str(e)

# ====== API ENDPOINTS ======

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'mongodb': 'connected',
        'model_ready': knn_model is not None,
        'students': len(student_embeddings_cache)
    })

@app.route('/status', methods=['GET'])
def status():
    return jsonify({
        'students_enrolled': len(student_embeddings_cache),
        'total_embeddings': len(all_embeddings),
        'knn_ready': knn_model is not None,
        'classes': len(label_encoder.classes_) if label_encoder else 0
    })

@app.route('/register-face', methods=['POST'])
def register_face():
    try:
        data = request.json
        image_base64 = data.get('image')
        student_id = data.get('studentId')
        
        if not image_base64 or not student_id:
            return jsonify({'success': False, 'error': 'Missing image or studentId'}), 400
        
        embedding, error = extract_face_embedding(image_base64)
        if error:
            return jsonify({'success': False, 'error': error}), 400
        
        result = users_col.update_one(
            {'_id': ObjectId(student_id)},
            {
                '$push': {'faceDescriptors': embedding.tolist()},
                '$set': {'faceRegisteredAt': datetime.now()}
            }
        )
        
        if result.modified_count == 0:
            return jsonify({'success': False, 'error': 'Student not found'}), 404
        
        load_embeddings_from_db()
        
        logger.info(f"✅ Face registered for student {student_id}")
        
        return jsonify({
            'success': True,
            'message': 'Face registered successfully',
            'total_samples': len(all_embeddings)
        })
        
    except Exception as e:
        logger.error(f"Register error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/verify-face', methods=['POST'])
def verify_face():
    """
    ONE-VS-ONE verification: compares the live face only against the
    EXPECTED student's own enrolled embeddings. Does NOT use the
    multi-class KNN vote across all students, since that let an
    imposter's face get classified as whichever student happened to
    win a noisy plurality vote among a handful of neighbors.
    """
    try:
        data = request.json
        image_base64 = data.get('image')
        expected_student_id = data.get('studentId')

        if not image_base64 or not expected_student_id:
            return jsonify({'verified': False, 'error': 'Missing image or studentId'}), 400

        embedding, error = extract_face_embedding(image_base64)
        if error:
            return jsonify({
                'verified': False,
                'error': error,
                'confidence': 0
            }), 200

        enrolled = student_embeddings_cache.get(expected_student_id, [])
        if not enrolled:
            return jsonify({
                'verified': False,
                'error': 'No enrolled face for this student',
                'confidence': 0
            }), 200

        # Compare ONLY against this specific student's own enrolled samples.
        # 0.6 is the standard face_recognition tolerance — the old dual check
        # (distance < 0.5 AND confidence > 0.55) effectively required distance
        # < 0.27, which caused false mismatches for enrolled students.
        MATCH_DISTANCE_THRESHOLD = 0.6

        distances = [float(np.linalg.norm(embedding - e)) for e in enrolled]
        min_distance = min(distances)
        confidence = float(max(0, min(1.0, 1 - (min_distance / MATCH_DISTANCE_THRESHOLD))))

        verified = bool(min_distance < MATCH_DISTANCE_THRESHOLD)

        return jsonify({
            'verified': verified,
            'confidence': confidence,
            'distance': min_distance,
            'match_level': 'high' if confidence > 0.8 else 'medium' if confidence > 0.6 else 'low'
        })

    except Exception as e:
        logger.error(f"Verify error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'verified': False, 'error': str(e)}), 500

@app.route('/analyze-frame', methods=['POST'])
def analyze_frame():
    try:
        data = request.json
        image_base64 = data.get('image')
        
        if not image_base64:
            return jsonify({'faceCount': 0, 'violations': []}), 200
        
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        
        img_data = base64.b64decode(image_base64)
        nparr = np.frombuffer(img_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({'faceCount': 0, 'violations': []}), 200
        
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(image_rgb)
        face_count = len(face_locations)
        
        violations = []
        
        if face_count == 0:
            violations.append({
                'type': 'no_face',
                'severity': 'high',
                'message': 'No face detected in frame'
            })
        elif face_count > 1:
            violations.append({
                'type': 'multiple_faces',
                'severity': 'high',
                'message': f'{face_count} faces detected'
            })
        
        return jsonify({
            'faceCount': face_count,
            'violations': violations,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Analyze error: {e}")
        return jsonify({'faceCount': 0, 'violations': []}), 500

@app.route('/log-audio-violation', methods=['POST'])
def log_audio_violation():
    try:
        data = request.json
        session_id = data.get('sessionId')
        violation_type = data.get('type')
        severity = data.get('severity', 'medium')
        metadata = data.get('metadata', {})
        
        if not session_id or not violation_type:
            return jsonify({'success': False, 'error': 'Missing sessionId or type'}), 400
        
        audio_violations[session_id].append({
            'type': violation_type,
            'severity': severity,
            'metadata': metadata,
            'timestamp': datetime.now()
        })
        
        violations_col.insert_one({
            'sessionId': session_id,
            'type': violation_type,
            'severity': severity,
            'metadata': metadata,
            'timestamp': datetime.now()
        })
        
        logger.info(f"🎤 Audio violation: {violation_type} for session {session_id}")
        
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f"Log audio violation error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/get-audio-violations/<session_id>', methods=['GET'])
def get_audio_violations(session_id):
    try:
        db_violations = list(violations_col.find(
            {'sessionId': session_id},
            {'_id': 0}
        ).sort('timestamp', -1))
        
        for v in db_violations:
            v['timestamp'] = v['timestamp'].isoformat() if v['timestamp'] else None
        
        return jsonify({
            'violations': db_violations,
            'count': len(db_violations)
        })
        
    except Exception as e:
        logger.error(f"Get violations error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/start-session', methods=['POST'])
def start_session():
    try:
        data = request.json
        student_id = data.get('studentId')
        exam_id = data.get('examId')
        
        if not student_id or not exam_id:
            return jsonify({'success': False, 'error': 'Missing studentId or examId'}), 400
        
        session_id = hashlib.md5(f"{student_id}{exam_id}{datetime.now()}".encode()).hexdigest()
        
        sessions_col.insert_one({
            'sessionId': session_id,
            'studentId': student_id,
            'examId': exam_id,
            'startTime': datetime.now(),
            'status': 'active',
            'violations': []
        })
        
        logger.info(f"✅ Session started: {session_id}")
        
        return jsonify({
            'success': True,
            'sessionId': session_id,
            'message': 'Session started successfully'
        })
        
    except Exception as e:
        logger.error(f"Start session error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/end-session', methods=['POST'])
def end_session():
    try:
        data = request.json
        session_id = data.get('sessionId')
        
        if not session_id:
            return jsonify({'success': False, 'error': 'Missing sessionId'}), 400
        
        sessions_col.update_one(
            {'sessionId': session_id},
            {
                '$set': {
                    'status': 'completed',
                    'endTime': datetime.now()
                }
            }
        )
        
        if session_id in audio_violations:
            del audio_violations[session_id]
        
        logger.info(f"✅ Session ended: {session_id}")
        
        return jsonify({'success': True, 'message': 'Session ended'})
        
    except Exception as e:
        logger.error(f"End session error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/clear-data', methods=['POST'])
def clear_data():
    global knn_model, label_encoder, student_embeddings_cache, all_embeddings, all_student_ids
    
    try:
        student_embeddings_cache = {}
        all_embeddings = []
        all_student_ids = []
        knn_model = None
        label_encoder = None
        
        if os.path.exists(KNN_MODEL_PATH):
            os.remove(KNN_MODEL_PATH)
        if os.path.exists(ENCODER_PATH):
            os.remove(ENCODER_PATH)
        
        logger.info("🗑️ All face data cleared")
        
        return jsonify({'success': True, 'message': 'All data cleared'})
        
    except Exception as e:
        logger.error(f"Clear data error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ====== STARTUP ======
if __name__ == '__main__':
    load_embeddings_from_db()
    
    logger.info("=" * 50)
    logger.info("🚀 Python Proctoring Service Started")
    logger.info(f"📊 Students: {len(student_embeddings_cache)}")
    logger.info(f"📊 Embeddings: {len(all_embeddings)}")
    logger.info(f"🤖 KNN Model: {'✅ Ready' if knn_model else '❌ Not trained'}")
    logger.info(f"🌐 Port: 5001")
    logger.info("=" * 50)
    
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)