from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, BackgroundTasks
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
import secrets
from datetime import datetime, timezone, timedelta
import httpx
import bcrypt
import jwt
from bson import ObjectId
import numpy as np

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import services
from email_service import email_service
from payment_service import payment_service
from scheduler import init_scheduler, shutdown_scheduler

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'skimly-secret-key-change-in-prod')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7

# OpenAI/Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Create the main app
app = FastAPI(title="Skimly API", description="Universal AI Cognition Layer")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    interests: List[str] = []
    goals: List[str] = []
    projects: List[str] = []
    learning_themes: List[str] = []
    tier: str = "free"
    created_at: datetime

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    interests: Optional[List[str]] = None
    goals: Optional[List[str]] = None
    projects: Optional[List[str]] = None
    learning_themes: Optional[List[str]] = None

class AnalyzeRequest(BaseModel):
    text: str
    source_url: Optional[str] = None
    source_title: Optional[str] = None

class AnalysisOutput(BaseModel):
    key_points: List[str]
    implications: List[str]
    actions: List[str]
    questions: List[str]
    personal_relevance: List[str]

class KnowledgeItem(BaseModel):
    item_id: str
    user_id: str
    original_text: str
    source_url: Optional[str] = None
    source_title: Optional[str] = None
    analysis: AnalysisOutput
    tags: List[str] = []
    created_at: datetime

class KnowledgeItemCreate(BaseModel):
    original_text: str
    source_url: Optional[str] = None
    source_title: Optional[str] = None
    analysis: AnalysisOutput
    tags: List[str] = []

class AskBrainRequest(BaseModel):
    question: str

class AskBrainResponse(BaseModel):
    answer: str
    relevant_items: List[Dict[str, Any]]

class TokenResponse(BaseModel):
    token: str
    user: UserProfile

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class VerifyEmailRequest(BaseModel):
    token: str

class CheckoutRequest(BaseModel):
    origin_url: str

class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str

class PaymentStatusResponse(BaseModel):
    status: str
    payment_status: str
    tier: str

class RecommendationItem(BaseModel):
    type: str  # 'read_next', 'revisit', 'gap', 'contradiction'
    title: str
    description: str
    item_id: Optional[str] = None

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    # Check cookie first
    session_token = request.cookies.get("session_token")
    
    # Then check Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if it's a JWT token (for email/password auth)
    try:
        payload = jwt.decode(session_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if user:
            return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        pass
    
    # Check if it's a session token (for Google OAuth)
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if session:
        expires_at = session.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        
        user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
        if user:
            return user
    
    raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AI HELPERS ====================

async def analyze_text_with_ai(text: str, user_profile: Optional[dict] = None) -> AnalysisOutput:
    """Analyze text using OpenAI GPT-5.2 via emergentintegrations"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    system_message = """You are Skimly, an AI cognition assistant. Analyze the given text and provide structured insights.
    
Your response MUST be valid JSON with exactly these fields:
{
    "key_points": ["List of 3-5 main takeaways"],
    "implications": ["List of 2-4 broader implications or consequences"],
    "actions": ["List of 2-4 actionable next steps"],
    "questions": ["List of 2-3 follow-up questions to explore"],
    "personal_relevance": ["List of 2-3 ways this could be personally relevant"]
}

Be concise but insightful. Each item should be a single sentence."""

    if user_profile:
        interests = ", ".join(user_profile.get("interests", []))
        goals = ", ".join(user_profile.get("goals", []))
        if interests or goals:
            system_message += f"\n\nUser context - Interests: {interests}. Goals: {goals}. Tailor 'personal_relevance' to their context."

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"analyze_{uuid.uuid4().hex[:8]}",
        system_message=system_message
    ).with_model("openai", "gpt-5.2")

    user_message = UserMessage(text=f"Analyze this text:\n\n{text[:4000]}")
    
    try:
        response = await chat.send_message(user_message)
        # Parse JSON response
        import json
        # Clean up response if needed
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        data = json.loads(response_text.strip())
        return AnalysisOutput(**data)
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        # Return fallback response
        return AnalysisOutput(
            key_points=["Unable to analyze text at this time"],
            implications=["Please try again"],
            actions=["Retry the analysis"],
            questions=["What would you like to know?"],
            personal_relevance=["This content may be relevant to your interests"]
        )

async def generate_embedding(text: str) -> List[float]:
    """Generate text embedding for vector search"""
    # Simple word-based embedding for MVP (can upgrade to OpenAI embeddings later)
    import hashlib
    words = text.lower().split()[:100]
    embedding = []
    for i in range(128):
        hash_val = int(hashlib.md5(f"{i}_{' '.join(words[:20])}".encode()).hexdigest()[:8], 16)
        embedding.append((hash_val % 1000) / 1000.0)
    return embedding

async def search_knowledge_by_embedding(user_id: str, query: str, limit: int = 5) -> List[dict]:
    """Search knowledge items by semantic similarity"""
    query_embedding = await generate_embedding(query)
    
    # Get all user's knowledge items
    items = await db.knowledge_items.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(1000)
    
    # Calculate similarity scores (cosine similarity)
    scored_items = []
    for item in items:
        item_embedding = item.get("embedding", [])
        if item_embedding:
            # Simple dot product similarity
            score = sum(a * b for a, b in zip(query_embedding, item_embedding))
            scored_items.append((score, item))
    
    # Sort by score and return top results
    scored_items.sort(key=lambda x: x[0], reverse=True)
    return [item for _, item in scored_items[:limit]]

async def ask_brain_with_ai(question: str, relevant_items: List[dict], user_profile: dict) -> str:
    """Answer question based on user's knowledge base"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    # Build context from relevant items
    context_parts = []
    for i, item in enumerate(relevant_items[:5], 1):
        analysis = item.get("analysis", {})
        context_parts.append(f"Knowledge Item {i}:")
        context_parts.append(f"Original: {item.get('original_text', '')[:500]}")
        context_parts.append(f"Key Points: {', '.join(analysis.get('key_points', []))}")
        context_parts.append("")
    
    context = "\n".join(context_parts)
    
    system_message = f"""You are Skimly's "Ask Your Brain" feature. The user is querying their personal knowledge base.

Based on the user's stored knowledge below, answer their question. If the knowledge doesn't contain relevant information, say so honestly.

USER'S KNOWLEDGE BASE:
{context}

Be concise and helpful. Reference specific insights from their knowledge when possible."""

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"ask_{uuid.uuid4().hex[:8]}",
        system_message=system_message
    ).with_model("openai", "gpt-5.2")

    user_message = UserMessage(text=question)
    
    try:
        response = await chat.send_message(user_message)
        return response
    except Exception as e:
        logger.error(f"Ask brain error: {e}")
        return "I'm having trouble processing your question. Please try again."

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate, response: Response):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "picture": None,
        "interests": [],
        "goals": [],
        "projects": [],
        "learning_themes": [],
        "tier": "free",
        "created_at": now.isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60,
        path="/"
    )
    
    user_profile = UserProfile(
        user_id=user_id,
        email=user_data.email,
        name=user_data.name,
        tier="free",
        created_at=now
    )
    
    return TokenResponse(token=token, user=user_profile)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin, response: Response):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["user_id"])
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60,
        path="/"
    )
    
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    user_profile = UserProfile(
        user_id=user["user_id"],
        email=user["email"],
        name=user["name"],
        picture=user.get("picture"),
        interests=user.get("interests", []),
        goals=user.get("goals", []),
        projects=user.get("projects", []),
        learning_themes=user.get("learning_themes", []),
        tier=user.get("tier", "free"),
        created_at=created_at
    )
    
    return TokenResponse(token=token, user=user_profile)

# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
@api_router.post("/auth/google/session")
async def google_session(request: Request, response: Response):
    """Exchange Google OAuth session_id for session_token"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth API
    async with httpx.AsyncClient() as client:
        auth_response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        auth_data = auth_response.json()
    
    # Check if user exists
    user = await db.users.find_one({"email": auth_data["email"]}, {"_id": 0})
    now = datetime.now(timezone.utc)
    
    if user:
        # Update existing user
        user_id = user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": auth_data["name"], "picture": auth_data.get("picture")}}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data.get("picture"),
            "interests": [],
            "goals": [],
            "projects": [],
            "learning_themes": [],
            "tier": "free",
            "created_at": now.isoformat()
        }
        await db.users.insert_one(user)
    
    # Create session
    session_token = auth_data.get("session_token", f"session_{uuid.uuid4().hex}")
    expires_at = now + timedelta(days=7)
    
    await db.user_sessions.update_one(
        {"user_id": user_id},
        {"$set": {
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": now.isoformat()
        }},
        upsert=True
    )
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    created_at = user.get("created_at", now.isoformat())
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return {
        "token": session_token,
        "user": {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data.get("picture"),
            "interests": user.get("interests", []),
            "goals": user.get("goals", []),
            "projects": user.get("projects", []),
            "learning_themes": user.get("learning_themes", []),
            "tier": user.get("tier", "free"),
            "created_at": created_at.isoformat()
        }
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "picture": user.get("picture"),
        "interests": user.get("interests", []),
        "goals": user.get("goals", []),
        "projects": user.get("projects", []),
        "learning_themes": user.get("learning_themes", []),
        "tier": user.get("tier", "free"),
        "created_at": created_at.isoformat() if created_at else None
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, req: Request, background_tasks: BackgroundTasks):
    """Send password reset email"""
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If an account exists, a reset link has been sent"}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await db.password_resets.insert_one({
        "user_id": user["user_id"],
        "token": reset_token,
        "expires_at": expires_at.isoformat(),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Get base URL from request
    base_url = str(req.base_url).replace('/api/', '').rstrip('/')
    # Use origin header if available for frontend URL
    origin = req.headers.get('origin', base_url)
    
    # Send email in background
    background_tasks.add_task(
        email_service.send_password_reset_email,
        user["email"],
        user["name"],
        reset_token,
        origin
    )
    
    return {"message": "If an account exists, a reset link has been sent"}

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password with token"""
    reset_doc = await db.password_resets.find_one({
        "token": request.token,
        "used": False
    }, {"_id": 0})
    
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check expiry
    expires_at = datetime.fromisoformat(reset_doc["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Update password
    new_hash = hash_password(request.new_password)
    await db.users.update_one(
        {"user_id": reset_doc["user_id"]},
        {"$set": {"password_hash": new_hash}}
    )
    
    # Mark token as used
    await db.password_resets.update_one(
        {"token": request.token},
        {"$set": {"used": True}}
    )
    
    return {"message": "Password reset successfully"}

@api_router.post("/auth/resend-verification")
async def resend_verification(req: Request, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    """Resend email verification"""
    if user.get("email_verified"):
        return {"message": "Email already verified"}
    
    # Generate verification token
    verification_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    
    await db.email_verifications.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "token": verification_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    origin = req.headers.get('origin', str(req.base_url).rstrip('/'))
    
    background_tasks.add_task(
        email_service.send_verification_email,
        user["email"],
        user["name"],
        verification_token,
        origin
    )
    
    return {"message": "Verification email sent"}

@api_router.post("/auth/verify-email")
async def verify_email(request: VerifyEmailRequest):
    """Verify email with token"""
    verification = await db.email_verifications.find_one({
        "token": request.token
    }, {"_id": 0})
    
    if not verification:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    
    # Check expiry
    expires_at = datetime.fromisoformat(verification["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification token has expired")
    
    # Mark email as verified
    await db.users.update_one(
        {"user_id": verification["user_id"]},
        {"$set": {"email_verified": True}}
    )
    
    # Delete verification token
    await db.email_verifications.delete_one({"token": request.token})
    
    return {"message": "Email verified successfully"}

# ==================== PROFILE ROUTES ====================

@api_router.put("/profile")
async def update_profile(
    profile_update: UserProfileUpdate,
    user: dict = Depends(get_current_user)
):
    update_data = {}
    if profile_update.name is not None:
        update_data["name"] = profile_update.name
    if profile_update.interests is not None:
        update_data["interests"] = profile_update.interests
    if profile_update.goals is not None:
        update_data["goals"] = profile_update.goals
    if profile_update.projects is not None:
        update_data["projects"] = profile_update.projects
    if profile_update.learning_themes is not None:
        update_data["learning_themes"] = profile_update.learning_themes
    
    if update_data:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return updated_user

# ==================== ANALYZE ROUTES ====================

@api_router.post("/analyze")
async def analyze_text(
    request: AnalyzeRequest,
    user: dict = Depends(get_current_user)
):
    """Analyze text and return structured insights"""
    if len(request.text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Text too short to analyze")
    
    # Check free tier limits
    if user.get("tier") == "free":
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_count = await db.knowledge_items.count_documents({
            "user_id": user["user_id"],
            "created_at": {"$gte": today_start.isoformat()}
        })
        if today_count >= 10:
            raise HTTPException(status_code=429, detail="Free tier limit reached (10/day). Upgrade to Pro!")
    
    analysis = await analyze_text_with_ai(request.text, user)
    
    return {
        "analysis": analysis.model_dump(),
        "source_url": request.source_url,
        "source_title": request.source_title
    }

@api_router.post("/save")
async def save_knowledge(
    item: KnowledgeItemCreate,
    user: dict = Depends(get_current_user)
):
    """Save analyzed content to knowledge base"""
    item_id = f"ki_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    # Generate embedding for search
    embedding = await generate_embedding(item.original_text)
    
    knowledge_doc = {
        "item_id": item_id,
        "user_id": user["user_id"],
        "original_text": item.original_text,
        "source_url": item.source_url,
        "source_title": item.source_title,
        "analysis": item.analysis.model_dump(),
        "tags": item.tags,
        "embedding": embedding,
        "created_at": now.isoformat()
    }
    
    await db.knowledge_items.insert_one(knowledge_doc)
    
    return {"item_id": item_id, "message": "Knowledge saved"}

# ==================== KNOWLEDGE BASE ROUTES ====================

@api_router.get("/history")
async def get_history(
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    tag: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get user's knowledge history"""
    query = {"user_id": user["user_id"]}
    
    if search:
        query["$or"] = [
            {"original_text": {"$regex": search, "$options": "i"}},
            {"source_title": {"$regex": search, "$options": "i"}},
            {"analysis.key_points": {"$regex": search, "$options": "i"}}
        ]
    
    if tag:
        query["tags"] = tag
    
    items = await db.knowledge_items.find(
        query,
        {"_id": 0, "embedding": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.knowledge_items.count_documents(query)
    
    return {"items": items, "total": total, "skip": skip, "limit": limit}

@api_router.get("/knowledge/{item_id}")
async def get_knowledge_item(item_id: str, user: dict = Depends(get_current_user)):
    """Get a single knowledge item"""
    item = await db.knowledge_items.find_one(
        {"item_id": item_id, "user_id": user["user_id"]},
        {"_id": 0, "embedding": 0}
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@api_router.delete("/knowledge/{item_id}")
async def delete_knowledge_item(item_id: str, user: dict = Depends(get_current_user)):
    """Delete a knowledge item"""
    result = await db.knowledge_items.delete_one({
        "item_id": item_id,
        "user_id": user["user_id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted"}

@api_router.put("/knowledge/{item_id}/tags")
async def update_tags(
    item_id: str,
    tags: List[str],
    user: dict = Depends(get_current_user)
):
    """Update tags for a knowledge item"""
    result = await db.knowledge_items.update_one(
        {"item_id": item_id, "user_id": user["user_id"]},
        {"$set": {"tags": tags}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Tags updated"}

@api_router.get("/tags")
async def get_all_tags(user: dict = Depends(get_current_user)):
    """Get all unique tags for user"""
    pipeline = [
        {"$match": {"user_id": user["user_id"]}},
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    tags = await db.knowledge_items.aggregate(pipeline).to_list(100)
    return [{"tag": t["_id"], "count": t["count"]} for t in tags]

# ==================== ASK YOUR BRAIN ====================

@api_router.post("/ask")
async def ask_brain(
    request: AskBrainRequest,
    user: dict = Depends(get_current_user)
):
    """Query your personal knowledge base"""
    if user.get("tier") == "free":
        raise HTTPException(status_code=403, detail="Ask Your Brain is a Pro feature")
    
    # Search for relevant knowledge items
    relevant_items = await search_knowledge_by_embedding(user["user_id"], request.question)
    
    if not relevant_items:
        return AskBrainResponse(
            answer="I don't have any relevant knowledge stored yet. Start by analyzing some content!",
            relevant_items=[]
        )
    
    # Generate answer
    answer = await ask_brain_with_ai(request.question, relevant_items, user)
    
    # Clean items for response
    clean_items = []
    for item in relevant_items:
        clean_items.append({
            "item_id": item["item_id"],
            "source_title": item.get("source_title"),
            "key_points": item.get("analysis", {}).get("key_points", [])[:2]
        })
    
    return AskBrainResponse(answer=answer, relevant_items=clean_items)

# ==================== DIGEST ====================

@api_router.get("/digest")
async def get_digest(user: dict = Depends(get_current_user)):
    """Get weekly intelligence digest"""
    if user.get("tier") == "free":
        raise HTTPException(status_code=403, detail="Weekly Digest is a Pro feature")
    
    # Get last 7 days of knowledge
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    
    items = await db.knowledge_items.find(
        {"user_id": user["user_id"], "created_at": {"$gte": week_ago}},
        {"_id": 0, "embedding": 0}
    ).sort("created_at", -1).to_list(100)
    
    if not items:
        return {
            "period": "Last 7 days",
            "summary": "No knowledge captured this week. Start analyzing content!",
            "top_insights": [],
            "patterns": [],
            "pending_actions": [],
            "item_count": 0
        }
    
    # Aggregate insights
    all_key_points = []
    all_actions = []
    for item in items:
        analysis = item.get("analysis", {})
        all_key_points.extend(analysis.get("key_points", []))
        all_actions.extend(analysis.get("actions", []))
    
    return {
        "period": "Last 7 days",
        "summary": f"You captured {len(items)} pieces of knowledge this week.",
        "top_insights": all_key_points[:10],
        "patterns": [],  # Could be enhanced with AI analysis
        "pending_actions": all_actions[:10],
        "item_count": len(items)
    }

# ==================== EXPORT ====================

@api_router.get("/export")
async def export_knowledge(
    format: str = "json",
    user: dict = Depends(get_current_user)
):
    """Export all knowledge"""
    items = await db.knowledge_items.find(
        {"user_id": user["user_id"]},
        {"_id": 0, "embedding": 0}
    ).to_list(10000)
    
    if format == "json":
        return {"items": items, "exported_at": datetime.now(timezone.utc).isoformat()}
    else:
        raise HTTPException(status_code=400, detail="Only JSON export supported")

# ==================== STATS ====================

@api_router.get("/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    """Get user statistics"""
    total_items = await db.knowledge_items.count_documents({"user_id": user["user_id"]})
    
    # Today's count
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = await db.knowledge_items.count_documents({
        "user_id": user["user_id"],
        "created_at": {"$gte": today_start.isoformat()}
    })
    
    # This week's count
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    week_count = await db.knowledge_items.count_documents({
        "user_id": user["user_id"],
        "created_at": {"$gte": week_ago}
    })
    
    return {
        "total_items": total_items,
        "today_count": today_count,
        "week_count": week_count,
        "tier": user.get("tier", "free"),
        "daily_limit": 10 if user.get("tier") == "free" else None,
        "remaining_today": max(0, 10 - today_count) if user.get("tier") == "free" else None
    }

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "Skimly API is running", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# ==================== PAYMENTS ====================

@api_router.post("/payments/checkout", response_model=CheckoutResponse)
async def create_checkout(request: CheckoutRequest, user: dict = Depends(get_current_user)):
    """Create Stripe checkout session for Pro upgrade"""
    if user.get("tier") == "pro":
        raise HTTPException(status_code=400, detail="Already on Pro tier")
    
    try:
        # Ensure origin_url ends with /
        host_url = request.origin_url.rstrip('/') + '/'
        
        session = await payment_service.create_pro_checkout_session(
            user_id=user["user_id"],
            user_email=user["email"],
            host_url=host_url
        )
        
        # Create payment transaction record
        await db.payment_transactions.insert_one({
            "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
            "session_id": session.session_id,
            "user_id": user["user_id"],
            "email": user["email"],
            "amount": 12.00,
            "currency": "usd",
            "plan": "pro",
            "status": "initiated",
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return CheckoutResponse(
            checkout_url=session.url,
            session_id=session.session_id
        )
    except Exception as e:
        logger.error(f"Checkout error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")

@api_router.get("/payments/status/{session_id}", response_model=PaymentStatusResponse)
async def get_payment_status(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Check payment status and upgrade user if successful"""
    try:
        # Get origin from request
        origin = request.headers.get('origin', str(request.base_url).rstrip('/'))
        host_url = origin.rstrip('/') + '/'
        
        status = await payment_service.get_checkout_status(session_id, host_url)
        
        # Update transaction record
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "status": status.status,
                "payment_status": status.payment_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # If payment successful, upgrade user to Pro
        current_tier = user.get("tier", "free")
        if status.payment_status == "paid" and current_tier != "pro":
            # Check if already processed
            txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            if txn and txn.get("processed"):
                return PaymentStatusResponse(
                    status=status.status,
                    payment_status=status.payment_status,
                    tier="pro"
                )
            
            # Upgrade user
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$set": {
                    "tier": "pro",
                    "upgraded_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Mark transaction as processed
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"processed": True}}
            )
            
            # Send confirmation email
            email_service.send_upgrade_confirmation(user["email"], user["name"])
            
            return PaymentStatusResponse(
                status=status.status,
                payment_status=status.payment_status,
                tier="pro"
            )
        
        return PaymentStatusResponse(
            status=status.status,
            payment_status=status.payment_status,
            tier=current_tier
        )
    except Exception as e:
        logger.error(f"Payment status error: {e}")
        raise HTTPException(status_code=500, detail="Failed to check payment status")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        origin = request.headers.get('origin', str(request.base_url).rstrip('/'))
        host_url = origin.rstrip('/') + '/'
        
        webhook_response = await payment_service.handle_webhook(body, signature, host_url)
        
        if webhook_response.payment_status == "paid":
            user_id = webhook_response.metadata.get("user_id")
            if user_id:
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "tier": "pro",
                        "upgraded_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Update transaction
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {
                        "status": "complete",
                        "payment_status": "paid",
                        "processed": True
                    }}
                )
        
        return {"received": True}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"received": True}  # Always return 200 to Stripe

# ==================== RECOMMENDATIONS ====================

@api_router.get("/recommendations", response_model=List[RecommendationItem])
async def get_recommendations(user: dict = Depends(get_current_user)):
    """Get personalized recommendations based on knowledge patterns"""
    recommendations = []
    
    # Get user's knowledge items
    items = await db.knowledge_items.find(
        {"user_id": user["user_id"]},
        {"_id": 0, "embedding": 0}
    ).sort("created_at", -1).to_list(100)
    
    if not items:
        recommendations.append(RecommendationItem(
            type="read_next",
            title="Start Your Knowledge Journey",
            description="Analyze your first piece of content to begin building your second brain."
        ))
        return recommendations
    
    # Analyze patterns
    all_tags = []
    all_key_points = []
    recent_topics = set()
    older_items = []
    
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    for item in items:
        all_tags.extend(item.get("tags", []))
        analysis = item.get("analysis", {})
        all_key_points.extend(analysis.get("key_points", []))
        
        created_at = item.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        if created_at and created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        
        if created_at and created_at > week_ago:
            # Recent item - track topics
            if item.get("source_title"):
                recent_topics.add(item["source_title"][:50])
        elif created_at and created_at < month_ago:
            older_items.append(item)
    
    # Recommendation: Revisit old knowledge
    if older_items:
        old_item = older_items[0]
        recommendations.append(RecommendationItem(
            type="revisit",
            title="Revisit Your Knowledge",
            description=f"It's been a while since you captured: \"{old_item.get('original_text', '')[:100]}...\"",
            item_id=old_item.get("item_id")
        ))
    
    # Recommendation: Knowledge gaps based on user interests
    user_interests = user.get("interests", [])
    user_goals = user.get("goals", [])
    
    if user_interests:
        # Find interests not well represented in knowledge
        tag_counts = {}
        for tag in all_tags:
            tag_counts[tag.lower()] = tag_counts.get(tag.lower(), 0) + 1
        
        for interest in user_interests[:3]:
            interest_lower = interest.lower()
            if tag_counts.get(interest_lower, 0) < 3:
                recommendations.append(RecommendationItem(
                    type="gap",
                    title=f"Explore: {interest}",
                    description=f"You've shown interest in {interest} but have limited knowledge captured. Consider reading more about it."
                ))
    
    # Recommendation: Based on goals
    if user_goals:
        goal = user_goals[0]
        recommendations.append(RecommendationItem(
            type="read_next",
            title=f"Work Towards: {goal}",
            description=f"Find content related to your goal: \"{goal}\" and analyze it to build relevant knowledge."
        ))
    
    # Recommendation: Suggest exploring new areas
    if len(items) > 10:
        recommendations.append(RecommendationItem(
            type="read_next",
            title="Diversify Your Knowledge",
            description="Try exploring a completely new topic to broaden your perspective."
        ))
    
    return recommendations[:5]

# ==================== SEND WEEKLY DIGEST ====================

@api_router.post("/admin/send-digests")
async def send_weekly_digests(background_tasks: BackgroundTasks):
    """Admin endpoint to trigger weekly digest emails for Pro users"""
    # This would typically be called by a cron job
    pro_users = await db.users.find(
        {"tier": "pro"},
        {"_id": 0}
    ).to_list(1000)
    
    sent_count = 0
    for user in pro_users:
        # Get digest data
        week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        items = await db.knowledge_items.find(
            {"user_id": user["user_id"], "created_at": {"$gte": week_ago}},
            {"_id": 0, "embedding": 0}
        ).to_list(100)
        
        if items:
            all_key_points = []
            all_actions = []
            for item in items:
                analysis = item.get("analysis", {})
                all_key_points.extend(analysis.get("key_points", []))
                all_actions.extend(analysis.get("actions", []))
            
            digest_data = {
                "item_count": len(items),
                "top_insights": all_key_points[:10],
                "pending_actions": all_actions[:10]
            }
            
            background_tasks.add_task(
                email_service.send_weekly_digest,
                user["email"],
                user["name"],
                digest_data
            )
            sent_count += 1
    
    return {"message": f"Queued {sent_count} digest emails"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize background scheduler on startup"""
    init_scheduler(db, email_service)
    logger.info("Skimly API started with background scheduler")

@app.on_event("shutdown")
async def shutdown_db_client():
    """Cleanup on shutdown"""
    shutdown_scheduler()
    client.close()
    logger.info("Skimly API shutdown complete")
