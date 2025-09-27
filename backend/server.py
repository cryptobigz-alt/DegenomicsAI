from fastapi import FastAPI, APIRouter, HTTPException, Request, BackgroundTasks
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import json
import io
import base64
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.lib import colors
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns

# Import Emergent integrations
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Pydantic Models
class TokenomicsRequest(BaseModel):
    project_type: str  # NFT, DeFi, L2 infra, GameFi, DAO, Web3 Social, AI/ML Protocol, etc.
    target_audience: str  # retail, institutional, both
    funding_goals: str
    planned_raise_size: Optional[str] = None
    desired_utility: List[str]  # staking, governance, marketplace currency, etc.
    project_name: Optional[str] = None
    additional_info: Optional[str] = None
    initial_supply: Optional[str] = "100M"
    distribution_focus: Optional[str] = "balanced"
    launch_strategy: Optional[str] = "gradual"
    economic_model: Optional[str] = "standard"

class TokenAllocation(BaseModel):
    category: str
    percentage: float
    tokens: int
    description: str
    vesting_schedule: str
    cliff_months: int
    linear_unlock_months: int

class TokenomicsProject(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_name: str
    request_data: TokenomicsRequest
    allocations: List[TokenAllocation]
    total_supply: int
    narrative: str
    risks: List[str]
    comparable_projects: List[str]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    pdf_generated: bool = False
    payment_status: str = "pending"  # pending, paid, expired
    
class TokenomicsResponse(BaseModel):
    project: TokenomicsProject
    chart_data: List[Dict[str, Any]]

# Payment Models
class PaymentTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    amount: float
    currency: str = "usd"
    payment_status: str = "pending"
    project_id: Optional[str] = None
    metadata: Dict[str, str] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Pricing packages
PRICING_PACKAGES = {
    "basic": {"amount": 79.0, "name": "Basic Tokenomics", "description": "Standard tokenomics design with PDF and charts"},
    "pro": {"amount": 199.0, "name": "Pro Tokenomics", "description": "Advanced tokenomics with multiple iterations and comparisons"},
    "premium": {"amount": 499.0, "name": "Premium Package", "description": "Complete tokenomics suite with investor deck"}
}

async def generate_tokenomics_with_claude(request: TokenomicsRequest) -> TokenomicsProject:
    """Generate comprehensive tokenomics using Claude AI"""
    try:
        # Initialize Claude chat
        chat = LlmChat(
            api_key=os.environ['EMERGENT_LLM_KEY'],
            session_id=f"tokenomics_{uuid.uuid4().hex[:8]}",
            system_message="""You are an expert tokenomics consultant with deep knowledge of DeFi, NFTs, gaming tokens, and crypto economics. 
            Your task is to create comprehensive, investor-ready tokenomics designs based on project requirements."""
        ).with_model("anthropic", "claude-3-7-sonnet-20250219")

        # Create detailed prompt
        prompt = f"""
        Design comprehensive tokenomics for a {request.project_type} project with the following requirements:
        
        Project Details:
        - Type: {request.project_type}
        - Target Audience: {request.target_audience}
        - Funding Goals: {request.funding_goals}
        - Planned Raise: {request.planned_raise_size or "Not specified"}
        - Initial Supply: {request.initial_supply or "100M"}
        - Distribution Focus: {request.distribution_focus or "balanced"}
        - Launch Strategy: {request.launch_strategy or "gradual"}
        - Economic Model: {request.economic_model or "standard"}
        - Utility Requirements: {', '.join(request.desired_utility)}
        - Additional Info: {request.additional_info or "None"}
        
        Based on these parameters, create a sophisticated tokenomics design that:
        1. Reflects the {request.distribution_focus} distribution preference
        2. Incorporates the {request.economic_model} economic model
        3. Aligns with the {request.launch_strategy} launch strategy
        4. Optimizes for the {request.target_audience} target audience
        
        Please provide a detailed tokenomics design in the following JSON format:
        
        {{
            "total_supply": <integer based on initial_supply>,
            "allocations": [
                {{
                    "category": "Team",
                    "percentage": <float>,
                    "tokens": <integer>,
                    "description": "<detailed description>",
                    "vesting_schedule": "<vesting description>",
                    "cliff_months": <integer>,
                    "linear_unlock_months": <integer>
                }},
                // ... more allocations optimized for the distribution_focus
            ],
            "narrative": "<comprehensive narrative explaining the tokenomics design, utility, economic model, and how it addresses the specific parameters>",
            "risks": ["<risk 1>", "<risk 2>", "<risk 3>"],
            "comparable_projects": ["<project 1>", "<project 2>", "<project 3>"]
        }}
        
        Requirements:
        - Adjust allocation percentages based on distribution_focus (community-heavy = more community allocation, etc.)
        - Include economic model mechanisms (deflationary = token burn, inflationary = staking rewards, etc.)
        - Tailor launch strategy implications in vesting schedules
        - Design 6-8 allocation categories appropriate for the project type
        - Create compelling narrative that explains how parameters influence the design
        - Consider the specific project type and target audience in recommendations
        
        Focus on creating a professional, investor-ready tokenomics design that clearly reflects the chosen parameters.
        """

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse the JSON response
        response_text = response.strip()
        if response_text.startswith('```json'):
            response_text = response_text[7:-3]
        elif response_text.startswith('```'):
            response_text = response_text[3:-3]
            
        tokenomics_data = json.loads(response_text)
        
        # Create TokenomicsProject
        allocations = [TokenAllocation(**alloc) for alloc in tokenomics_data['allocations']]
        
        project = TokenomicsProject(
            project_name=request.project_name or f"{request.project_type} Project",
            request_data=request,
            allocations=allocations,
            total_supply=tokenomics_data['total_supply'],
            narrative=tokenomics_data['narrative'],
            risks=tokenomics_data['risks'],
            comparable_projects=tokenomics_data['comparable_projects']
        )
        
        return project
        
    except Exception as e:
        logger.error(f"Error generating tokenomics: {str(e)}")
        # Fallback tokenomics if AI fails
        return create_fallback_tokenomics(request)

def create_fallback_tokenomics(request: TokenomicsRequest) -> TokenomicsProject:
    """Create fallback tokenomics if AI generation fails"""
    allocations = [
        TokenAllocation(
            category="Team",
            percentage=15.0,
            tokens=15000000,
            description="Core team allocation with long vesting",
            vesting_schedule="4-year linear vesting with 12-month cliff",
            cliff_months=12,
            linear_unlock_months=36
        ),
        TokenAllocation(
            category="Investors",
            percentage=20.0,
            tokens=20000000,
            description="Private and seed investor allocation",
            vesting_schedule="2-year linear vesting with 6-month cliff",
            cliff_months=6,
            linear_unlock_months=18
        ),
        TokenAllocation(
            category="Community",
            percentage=30.0,
            tokens=30000000,
            description="Community rewards and ecosystem growth",
            vesting_schedule="5-year emission schedule",
            cliff_months=0,
            linear_unlock_months=60
        ),
        TokenAllocation(
            category="Treasury",
            percentage=25.0,
            tokens=25000000,
            description="Treasury for development and partnerships",
            vesting_schedule="On-demand unlocking via governance",
            cliff_months=0,
            linear_unlock_months=0
        ),
        TokenAllocation(
            category="Liquidity",
            percentage=10.0,
            tokens=10000000,
            description="DEX liquidity and market making",
            vesting_schedule="Immediate unlock for liquidity provision",
            cliff_months=0,
            linear_unlock_months=0
        )
    ]
    
    return TokenomicsProject(
        project_name=request.project_name or f"{request.project_type} Project",
        request_data=request,
        allocations=allocations,
        total_supply=100000000,
        narrative=f"This {request.project_type} project features a balanced tokenomics model designed for {request.target_audience} audience. The distribution ensures proper incentive alignment between stakeholders while maintaining healthy token circulation.",
        risks=["Market volatility", "Regulatory uncertainty", "Adoption challenges"],
        comparable_projects=["Uniswap", "AAVE", "Compound"]
    )

def generate_pdf_report(project: TokenomicsProject) -> bytes:
    """Generate PDF report for tokenomics project"""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Colors
    primary_color = HexColor('#DC1FFF')  # Purple
    accent_color = HexColor('#00FFA3')   # Neon green
    
    # Title
    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(primary_color)
    c.drawCentredString(width/2, height-50, f"{project.project_name}")
    c.drawCentredString(width/2, height-75, "Tokenomics Design")
    
    # Project details
    y_pos = height - 120
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(colors.black)
    c.drawString(50, y_pos, "Project Overview")
    
    y_pos -= 30
    c.setFont("Helvetica", 11)
    c.drawString(70, y_pos, f"Type: {project.request_data.project_type}")
    y_pos -= 20
    c.drawString(70, y_pos, f"Target Audience: {project.request_data.target_audience}")
    y_pos -= 20
    c.drawString(70, y_pos, f"Total Supply: {project.total_supply:,} tokens")
    
    # Token Allocations
    y_pos -= 40
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y_pos, "Token Allocations")
    
    y_pos -= 20
    for allocation in project.allocations:
        if y_pos < 100:  # New page if needed
            c.showPage()
            y_pos = height - 50
            
        c.setFont("Helvetica-Bold", 11)
        c.drawString(70, y_pos, f"{allocation.category}: {allocation.percentage}%")
        y_pos -= 15
        c.setFont("Helvetica", 9)
        c.drawString(90, y_pos, f"{allocation.tokens:,} tokens - {allocation.description}")
        y_pos -= 12
        c.drawString(90, y_pos, f"Vesting: {allocation.vesting_schedule}")
        y_pos -= 25
    
    # Narrative (new page)
    c.showPage()
    y_pos = height - 50
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(primary_color)
    c.drawString(50, y_pos, "Economic Model & Narrative")
    
    y_pos -= 40
    c.setFont("Helvetica", 11)
    c.setFillColor(colors.black)
    
    # Split narrative into lines
    words = project.narrative.split()
    lines = []
    current_line = ""
    for word in words:
        if len(current_line + " " + word) < 90:
            current_line += " " + word if current_line else word
        else:
            lines.append(current_line)
            current_line = word
    if current_line:
        lines.append(current_line)
    
    for line in lines:
        if y_pos < 100:
            c.showPage()
            y_pos = height - 50
        c.drawString(50, y_pos, line)
        y_pos -= 15
    
    # Risks
    y_pos -= 30
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(accent_color)
    c.drawString(50, y_pos, "Key Risks")
    
    y_pos -= 20
    c.setFont("Helvetica", 11)
    c.setFillColor(colors.black)
    for i, risk in enumerate(project.risks, 1):
        if y_pos < 100:
            c.showPage()
            y_pos = height - 50
        c.drawString(70, y_pos, f"{i}. {risk}")
        y_pos -= 20
    
    # Comparable projects
    y_pos -= 20
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(accent_color)
    c.drawString(50, y_pos, "Comparable Projects")
    
    y_pos -= 20
    c.setFont("Helvetica", 11)
    c.setFillColor(colors.black)
    c.drawString(70, y_pos, ", ".join(project.comparable_projects))
    
    c.save()
    buffer.seek(0)
    return buffer.getvalue()

# API Routes
@api_router.post("/tokenomics/generate", response_model=TokenomicsResponse)
async def generate_tokenomics(request: TokenomicsRequest):
    """Generate tokenomics design using Claude AI"""
    try:
        project = await generate_tokenomics_with_claude(request)
        
        # Save to database
        project_dict = project.dict()
        project_dict['created_at'] = project_dict['created_at'].isoformat()
        await db.tokenomics_projects.insert_one(project_dict)
        
        # Create chart data for frontend
        chart_data = [
            {
                "name": alloc.category,
                "value": alloc.percentage,
                "tokens": alloc.tokens,
                "color": ["#DC1FFF", "#00FFA3", "#FF6B35", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"][i % 7]
            }
            for i, alloc in enumerate(project.allocations)
        ]
        
        return TokenomicsResponse(project=project, chart_data=chart_data)
        
    except Exception as e:
        logger.error(f"Error in generate_tokenomics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating tokenomics: {str(e)}")

@api_router.get("/tokenomics/{project_id}")
async def get_tokenomics_project(project_id: str):
    """Get specific tokenomics project"""
    project = await db.tokenomics_projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@api_router.get("/tokenomics/{project_id}/pdf")
async def download_pdf(project_id: str):
    """Download PDF report for tokenomics project"""
    project_data = await db.tokenomics_projects.find_one({"id": project_id})
    if not project_data:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Convert back to Pydantic model
    project_data['created_at'] = datetime.fromisoformat(project_data['created_at'])
    project = TokenomicsProject(**project_data)
    
    # Generate PDF
    pdf_bytes = generate_pdf_report(project)
    
    # Save PDF to temporary file
    pdf_path = f"/tmp/{project_id}_tokenomics.pdf"
    with open(pdf_path, 'wb') as f:
        f.write(pdf_bytes)
    
    return FileResponse(
        pdf_path, 
        media_type='application/pdf',
        filename=f"{project.project_name}_Tokenomics.pdf"
    )

# Payment Routes
@api_router.post("/payments/checkout/session", response_model=CheckoutSessionResponse)
async def create_checkout_session(request: Request, package_id: str, origin_url: str):
    """Create Stripe checkout session"""
    try:
        if package_id not in PRICING_PACKAGES:
            raise HTTPException(status_code=400, detail="Invalid package ID")
        
        package = PRICING_PACKAGES[package_id]
        amount = package["amount"]
        
        # Initialize Stripe
        host_url = origin_url
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(
            api_key=os.environ['STRIPE_API_KEY'],
            webhook_url=webhook_url
        )
        
        # Create success and cancel URLs
        success_url = f"{origin_url}/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin_url}/pricing"
        
        # Create checkout session
        checkout_request = CheckoutSessionRequest(
            amount=amount,
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "package_id": package_id,
                "package_name": package["name"]
            }
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Save transaction to database
        transaction = PaymentTransaction(
            session_id=session.session_id,
            amount=amount,
            currency="usd",
            metadata=checkout_request.metadata
        )
        
        transaction_dict = transaction.dict()
        transaction_dict['created_at'] = transaction_dict['created_at'].isoformat()
        transaction_dict['updated_at'] = transaction_dict['updated_at'].isoformat()
        await db.payment_transactions.insert_one(transaction_dict)
        
        return session
        
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating checkout session: {str(e)}")

@api_router.get("/payments/checkout/status/{session_id}", response_model=CheckoutStatusResponse)
async def get_checkout_status(session_id: str):
    """Get checkout session status"""
    try:
        stripe_checkout = StripeCheckout(
            api_key=os.environ['STRIPE_API_KEY'],
            webhook_url="dummy"
        )
        
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction in database
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "payment_status": status.payment_status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return status
        
    except Exception as e:
        logger.error(f"Error getting checkout status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting checkout status: {str(e)}")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    try:
        body = await request.body()
        stripe_signature = request.headers.get("Stripe-Signature")
        
        stripe_checkout = StripeCheckout(
            api_key=os.environ['STRIPE_API_KEY'],
            webhook_url="dummy"
        )
        
        webhook_response = await stripe_checkout.handle_webhook(body, stripe_signature)
        
        # Update database based on webhook
        await db.payment_transactions.update_one(
            {"session_id": webhook_response.session_id},
            {
                "$set": {
                    "payment_status": webhook_response.payment_status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Error handling webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error handling webhook: {str(e)}")

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