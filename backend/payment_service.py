"""
Skimly Payment Service - Stripe Integration
Handles Pro tier subscriptions and payment processing
"""
import os
import logging
from datetime import datetime, timezone
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionRequest, 
    CheckoutSessionResponse,
    CheckoutStatusResponse
)

logger = logging.getLogger(__name__)

STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')

# Fixed pricing - Pro tier $12/month
PRO_PRICE = 12.00
PRO_CURRENCY = "usd"

class PaymentService:
    def __init__(self):
        self.api_key = STRIPE_API_KEY
        self.checkout = None
    
    def _get_checkout(self, webhook_url: str):
        """Get or create StripeCheckout instance"""
        if not self.api_key:
            raise ValueError("Stripe API key not configured")
        return StripeCheckout(api_key=self.api_key, webhook_url=webhook_url)
    
    async def create_pro_checkout_session(
        self, 
        user_id: str, 
        user_email: str,
        host_url: str
    ) -> CheckoutSessionResponse:
        """Create a checkout session for Pro subscription"""
        webhook_url = f"{host_url}api/webhook/stripe"
        checkout = self._get_checkout(webhook_url)
        
        success_url = f"{host_url}settings?payment=success&session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{host_url}settings?payment=cancelled"
        
        request = CheckoutSessionRequest(
            amount=PRO_PRICE,
            currency=PRO_CURRENCY,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user_id,
                "user_email": user_email,
                "plan": "pro",
                "type": "subscription"
            }
        )
        
        session = await checkout.create_checkout_session(request)
        return session
    
    async def get_checkout_status(self, session_id: str, host_url: str) -> CheckoutStatusResponse:
        """Get the status of a checkout session"""
        webhook_url = f"{host_url}api/webhook/stripe"
        checkout = self._get_checkout(webhook_url)
        return await checkout.get_checkout_status(session_id)
    
    async def handle_webhook(self, body: bytes, signature: str, host_url: str):
        """Handle Stripe webhook events"""
        webhook_url = f"{host_url}api/webhook/stripe"
        checkout = self._get_checkout(webhook_url)
        return await checkout.handle_webhook(body, signature)

# Singleton instance
payment_service = PaymentService()
