from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'medical_ai_secret_key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Create the main app
app = FastAPI(title="Assistant IA Médical API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserRole:
    ADMIN = "admin"
    DIRECTION = "direction"
    PERSONNEL_SOIGNANT = "personnel_soignant"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    created_at: str

class UserRoleUpdate(BaseModel):
    role: str

class DocumentCreate(BaseModel):
    title: str
    content: str
    category_id: str
    visibility: List[str] = [UserRole.ADMIN, UserRole.DIRECTION, UserRole.PERSONNEL_SOIGNANT]

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category_id: Optional[str] = None
    visibility: Optional[List[str]] = None

class DocumentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    content: str
    category_id: str
    category_name: Optional[str] = None
    visibility: List[str]
    created_by: str
    created_at: str
    updated_at: str

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class CategoryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: str
    created_at: str

class AIQuestionRequest(BaseModel):
    question: str

class AIResponse(BaseModel):
    response: str
    sources: Optional[List[str]] = []

class DashboardStats(BaseModel):
    total_documents: int
    total_users: int
    documents_by_category: List[dict]
    users_by_role: List[dict]
    recent_documents: List[dict]

# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token_data = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": token_data["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
    return user

async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return current_user

# ============== AUTH ENDPOINTS ==============

@api_router.post("/auth/register", response_model=dict)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    # First user becomes admin
    user_count = await db.users.count_documents({})
    role = UserRole.ADMIN if user_count == 0 else UserRole.PERSONNEL_SOIGNANT
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hash_password(user_data.password),
        "role": role,
        "created_at": now
    }
    
    await db.users.insert_one(user_doc)
    token = create_token(user_id, user_data.email, role)
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "role": role
        }
    }

@api_router.post("/auth/login", response_model=dict)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    token = create_token(user["id"], user["email"], user["role"])
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        }
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        role=current_user["role"],
        created_at=current_user["created_at"]
    )

# ============== USERS ENDPOINTS ==============

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.put("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(user_id: str, role_data: UserRoleUpdate, current_user: dict = Depends(require_admin)):
    if role_data.role not in [UserRole.ADMIN, UserRole.DIRECTION, UserRole.PERSONNEL_SOIGNANT]:
        raise HTTPException(status_code=400, detail="Rôle invalide")
    
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": role_data.role}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return UserResponse(**user)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_admin)):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return {"message": "Utilisateur supprimé"}

# ============== CATEGORIES ENDPOINTS ==============

@api_router.post("/document-categories", response_model=CategoryResponse)
async def create_category(category: CategoryCreate, current_user: dict = Depends(require_admin)):
    category_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "id": category_id,
        "name": category.name,
        "description": category.description or "",
        "created_at": now
    }
    
    await db.categories.insert_one(doc)
    return CategoryResponse(**doc)

@api_router.get("/document-categories", response_model=List[CategoryResponse])
async def get_categories(current_user: dict = Depends(get_current_user)):
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    return [CategoryResponse(**c) for c in categories]

@api_router.delete("/document-categories/{category_id}")
async def delete_category(category_id: str, current_user: dict = Depends(require_admin)):
    # Check if documents use this category
    doc_count = await db.documents.count_documents({"category_id": category_id})
    if doc_count > 0:
        raise HTTPException(status_code=400, detail=f"Cette catégorie contient {doc_count} document(s). Supprimez-les d'abord.")
    
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    return {"message": "Catégorie supprimée"}

# ============== DOCUMENTS ENDPOINTS ==============

@api_router.post("/documents", response_model=DocumentResponse)
async def create_document(document: DocumentCreate, current_user: dict = Depends(get_current_user)):
    # Verify category exists
    category = await db.categories.find_one({"id": document.category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=400, detail="Catégorie non trouvée")
    
    doc_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "id": doc_id,
        "title": document.title,
        "content": document.content,
        "category_id": document.category_id,
        "visibility": document.visibility,
        "created_by": current_user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.documents.insert_one(doc)
    
    return DocumentResponse(
        **doc,
        category_name=category["name"]
    )

@api_router.get("/documents", response_model=List[DocumentResponse])
async def get_documents(
    category_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"visibility": current_user["role"]}
    if category_id:
        query["category_id"] = category_id
    
    documents = await db.documents.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Get category names
    category_ids = list(set(d["category_id"] for d in documents))
    categories = await db.categories.find({"id": {"$in": category_ids}}, {"_id": 0}).to_list(100)
    cat_map = {c["id"]: c["name"] for c in categories}
    
    return [DocumentResponse(**d, category_name=cat_map.get(d["category_id"], "")) for d in documents]

@api_router.get("/documents/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"id": doc_id, "visibility": current_user["role"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    category = await db.categories.find_one({"id": doc["category_id"]}, {"_id": 0})
    return DocumentResponse(**doc, category_name=category["name"] if category else "")

@api_router.put("/documents/{doc_id}", response_model=DocumentResponse)
async def update_document(doc_id: str, update: DocumentUpdate, current_user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    # Only creator or admin can edit
    if doc["created_by"] != current_user["id"] and current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.documents.update_one({"id": doc_id}, {"$set": update_data})
    
    updated_doc = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    category = await db.categories.find_one({"id": updated_doc["category_id"]}, {"_id": 0})
    
    return DocumentResponse(**updated_doc, category_name=category["name"] if category else "")

@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    # Only creator or admin can delete
    if doc["created_by"] != current_user["id"] and current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    await db.documents.delete_one({"id": doc_id})
    return {"message": "Document supprimé"}

# ============== AI ASSISTANT ENDPOINTS ==============

async def get_documents_for_ai(user_role: str, limit: int = 10) -> List[dict]:
    docs = await db.documents.find(
        {"visibility": user_role},
        {"_id": 0, "title": 1, "content": 1, "category_id": 1}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return docs

@api_router.get("/ai-assistant/suggestions-context", response_model=AIResponse)
async def get_context_suggestions(current_user: dict = Depends(get_current_user)):
    docs = await get_documents_for_ai(current_user["role"], 5)
    
    if not docs:
        return AIResponse(response="Aucun document disponible pour générer des suggestions.", sources=[])
    
    context = "\n\n".join([f"Document: {d['title']}\nContenu: {d['content'][:500]}" for d in docs])
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"context-{current_user['id']}-{uuid.uuid4()}",
            system_message="Tu es un assistant médical IA. Tu analyses les documents et fournis des suggestions contextuelles utiles pour le personnel médical. Réponds toujours en français."
        ).with_model("openai", "gpt-5.2")
        
        message = UserMessage(text=f"Analyse ces documents récents et fournis 3-5 suggestions pratiques basées sur leur contenu:\n\n{context}")
        response = await chat.send_message(message)
        
        return AIResponse(response=response, sources=[d["title"] for d in docs])
    except Exception as e:
        logger.error(f"AI Error: {e}")
        return AIResponse(response="Erreur lors de la génération des suggestions. Veuillez réessayer.", sources=[])

@api_router.get("/ai-assistant/suggestions-enhanced", response_model=AIResponse)
async def get_enhanced_suggestions(current_user: dict = Depends(get_current_user)):
    docs = await get_documents_for_ai(current_user["role"], 10)
    
    if not docs:
        return AIResponse(response="Aucun document disponible pour générer des suggestions avancées.", sources=[])
    
    context = "\n\n".join([f"### {d['title']}\n{d['content']}" for d in docs])
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"enhanced-{current_user['id']}-{uuid.uuid4()}",
            system_message="Tu es un assistant médical IA expert. Tu fournis des analyses approfondies avec points clés, résumés et recommandations. Réponds toujours en français de manière structurée."
        ).with_model("openai", "gpt-5.2")
        
        message = UserMessage(text=f"""Analyse ces documents et fournis:
1. Un résumé exécutif (3-4 lignes)
2. Les points clés importants (liste)
3. Des recommandations pratiques
4. Des alertes ou points d'attention si nécessaire

Documents:
{context}""")
        response = await chat.send_message(message)
        
        return AIResponse(response=response, sources=[d["title"] for d in docs])
    except Exception as e:
        logger.error(f"AI Error: {e}")
        return AIResponse(response="Erreur lors de la génération des suggestions avancées. Veuillez réessayer.", sources=[])

@api_router.post("/ai-assistant/qa", response_model=AIResponse)
async def ask_question(request: AIQuestionRequest, current_user: dict = Depends(get_current_user)):
    docs = await get_documents_for_ai(current_user["role"], 15)
    
    if not docs:
        return AIResponse(response="Aucun document disponible pour répondre à votre question.", sources=[])
    
    context = "\n\n".join([f"### {d['title']}\n{d['content']}" for d in docs])
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"qa-{current_user['id']}-{uuid.uuid4()}",
            system_message="""Tu es un assistant médical IA spécialisé dans l'analyse de documents administratifs et médicaux.
Tu réponds aux questions en te basant UNIQUEMENT sur les documents fournis.
Si la réponse n'est pas dans les documents, dis-le clairement.
Réponds toujours en français de manière professionnelle et précise."""
        ).with_model("openai", "gpt-5.2")
        
        message = UserMessage(text=f"""Documents de référence:
{context}

Question de l'utilisateur: {request.question}

Réponds à cette question en te basant sur les documents ci-dessus.""")
        response = await chat.send_message(message)
        
        # Save Q&A to history
        await db.qa_history.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "question": request.question,
            "response": response,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return AIResponse(response=response, sources=[d["title"] for d in docs])
    except Exception as e:
        logger.error(f"AI Error: {e}")
        return AIResponse(response="Erreur lors du traitement de votre question. Veuillez réessayer.", sources=[])

@api_router.get("/ai-assistant/qa-history", response_model=List[dict])
async def get_qa_history(current_user: dict = Depends(get_current_user)):
    history = await db.qa_history.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    return history

# ============== DASHBOARD ENDPOINTS ==============

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    # Total documents accessible to user
    total_docs = await db.documents.count_documents({"visibility": current_user["role"]})
    
    # Total users (admin only sees all)
    if current_user["role"] == UserRole.ADMIN:
        total_users = await db.users.count_documents({})
    else:
        total_users = 0
    
    # Documents by category
    pipeline = [
        {"$match": {"visibility": current_user["role"]}},
        {"$group": {"_id": "$category_id", "count": {"$sum": 1}}}
    ]
    docs_by_cat = await db.documents.aggregate(pipeline).to_list(100)
    
    # Get category names
    cat_ids = [d["_id"] for d in docs_by_cat]
    categories = await db.categories.find({"id": {"$in": cat_ids}}, {"_id": 0}).to_list(100)
    cat_map = {c["id"]: c["name"] for c in categories}
    
    docs_by_category = [{"name": cat_map.get(d["_id"], "Sans catégorie"), "count": d["count"]} for d in docs_by_cat]
    
    # Users by role (admin only)
    users_by_role = []
    if current_user["role"] == UserRole.ADMIN:
        role_pipeline = [{"$group": {"_id": "$role", "count": {"$sum": 1}}}]
        users_agg = await db.users.aggregate(role_pipeline).to_list(10)
        role_names = {"admin": "Admin", "direction": "Direction", "personnel_soignant": "Personnel Soignant"}
        users_by_role = [{"name": role_names.get(u["_id"], u["_id"]), "count": u["count"]} for u in users_agg]
    
    # Recent documents
    recent_docs = await db.documents.find(
        {"visibility": current_user["role"]},
        {"_id": 0, "id": 1, "title": 1, "created_at": 1, "category_id": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    recent_documents = [{"id": d["id"], "title": d["title"], "date": d["created_at"], "category": cat_map.get(d.get("category_id"), "")} for d in recent_docs]
    
    return DashboardStats(
        total_documents=total_docs,
        total_users=total_users,
        documents_by_category=docs_by_category,
        users_by_role=users_by_role,
        recent_documents=recent_documents
    )

# ============== SEED DATA ==============

@api_router.post("/seed-data")
async def seed_demo_data(current_user: dict = Depends(require_admin)):
    """Seed demo categories and documents"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if already seeded
    cat_count = await db.categories.count_documents({})
    if cat_count > 0:
        return {"message": "Données déjà initialisées"}
    
    # Create categories
    categories = [
        {"id": str(uuid.uuid4()), "name": "Protocoles Médicaux", "description": "Protocoles et procédures médicales", "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Ressources Humaines", "description": "Documents RH et administratifs", "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Formations", "description": "Supports et programmes de formation", "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Réglementations", "description": "Textes réglementaires et conformité", "created_at": now},
    ]
    
    await db.categories.insert_many(categories)
    
    # Create documents
    documents = [
        {
            "id": str(uuid.uuid4()),
            "title": "Protocole d'hygiène des mains",
            "content": """Protocole standardisé pour l'hygiène des mains dans l'établissement.

1. Se mouiller les mains
2. Appliquer le savon
3. Frotter pendant 30 secondes minimum
4. Rincer abondamment
5. Sécher avec une serviette à usage unique

Ce protocole doit être appliqué avant et après chaque contact patient.""",
            "category_id": categories[0]["id"],
            "visibility": [UserRole.ADMIN, UserRole.DIRECTION, UserRole.PERSONNEL_SOIGNANT],
            "created_by": current_user["id"],
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Guide d'accueil des nouveaux employés",
            "content": """Guide complet pour l'intégration des nouveaux membres de l'équipe.

• Jour 1: Présentation des locaux et de l'équipe
• Semaine 1: Formation aux outils et procédures
• Mois 1: Évaluation et ajustements

Contact RH: rh@hopital.fr""",
            "category_id": categories[1]["id"],
            "visibility": [UserRole.ADMIN, UserRole.DIRECTION],
            "created_by": current_user["id"],
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Formation gestes d'urgence",
            "content": """Programme de formation continue aux gestes d'urgence.

Sessions prévues:
- Réanimation cardio-pulmonaire: Tous les trimestres
- Utilisation du défibrillateur: Mensuel
- Gestion des voies aériennes: Bimensuel

Inscription obligatoire via le portail RH.""",
            "category_id": categories[2]["id"],
            "visibility": [UserRole.ADMIN, UserRole.DIRECTION, UserRole.PERSONNEL_SOIGNANT],
            "created_by": current_user["id"],
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Conformité RGPD - Données patients",
            "content": """Réglementation sur la protection des données patients.

Points clés:
• Consentement explicite requis
• Droit d'accès et de rectification
• Durée de conservation limitée
• Notification en cas de violation

Référent DPO: dpo@hopital.fr""",
            "category_id": categories[3]["id"],
            "visibility": [UserRole.ADMIN, UserRole.DIRECTION],
            "created_by": current_user["id"],
            "created_at": now,
            "updated_at": now
        },
    ]
    
    await db.documents.insert_many(documents)
    
    return {"message": "Données de démonstration créées avec succès", "categories": len(categories), "documents": len(documents)}

# ============== ROOT ==============

@api_router.get("/")
async def root():
    return {"message": "API Assistant IA Médical", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
