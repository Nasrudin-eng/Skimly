"""
Skimly Email Service - SendGrid Integration
Handles email verification, password reset, and weekly digests
"""
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
import logging

logger = logging.getLogger(__name__)

SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@skimly.ai')

class EmailService:
    def __init__(self):
        self.api_key = SENDGRID_API_KEY
        self.sender = SENDER_EMAIL
        self.client = SendGridAPIClient(self.api_key) if self.api_key else None
    
    def _send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send an email via SendGrid"""
        if not self.client:
            logger.warning("SendGrid not configured - email not sent")
            # Return True in dev mode to not block functionality
            return True
        
        try:
            message = Mail(
                from_email=self.sender,
                to_emails=to_email,
                subject=subject,
                html_content=html_content
            )
            response = self.client.send(message)
            return response.status_code == 202
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False
    
    def send_verification_email(self, to_email: str, name: str, verification_token: str, base_url: str) -> bool:
        """Send email verification link"""
        verification_link = f"{base_url}/verify-email?token={verification_token}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Inter', -apple-system, sans-serif; background: #FDFCF8; padding: 40px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; border: 1px solid #E6E4DC; }}
                .logo {{ color: #2E5C55; font-size: 24px; font-weight: bold; margin-bottom: 24px; }}
                h1 {{ font-family: 'Georgia', serif; color: #2D2D2D; font-weight: 400; }}
                p {{ color: #666660; line-height: 1.6; }}
                .button {{ display: inline-block; background: #2E5C55; color: white; padding: 14px 32px; border-radius: 24px; text-decoration: none; font-weight: 500; margin: 24px 0; }}
                .footer {{ margin-top: 32px; padding-top: 24px; border-top: 1px solid #E6E4DC; font-size: 13px; color: #999; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">🧠 Skimly</div>
                <h1>Verify your email</h1>
                <p>Hi {name},</p>
                <p>Welcome to Skimly! Please verify your email address to start building your second brain.</p>
                <a href="{verification_link}" class="button">Verify Email</a>
                <p>Or copy this link: {verification_link}</p>
                <p>This link expires in 24 hours.</p>
                <div class="footer">
                    <p>Everything you read makes you smarter forever.</p>
                    <p>© 2026 Skimly</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self._send_email(to_email, "Verify your Skimly email", html_content)
    
    def send_password_reset_email(self, to_email: str, name: str, reset_token: str, base_url: str) -> bool:
        """Send password reset link"""
        reset_link = f"{base_url}/reset-password?token={reset_token}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Inter', -apple-system, sans-serif; background: #FDFCF8; padding: 40px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; border: 1px solid #E6E4DC; }}
                .logo {{ color: #2E5C55; font-size: 24px; font-weight: bold; margin-bottom: 24px; }}
                h1 {{ font-family: 'Georgia', serif; color: #2D2D2D; font-weight: 400; }}
                p {{ color: #666660; line-height: 1.6; }}
                .button {{ display: inline-block; background: #2E5C55; color: white; padding: 14px 32px; border-radius: 24px; text-decoration: none; font-weight: 500; margin: 24px 0; }}
                .warning {{ background: #FFF8E6; border: 1px solid #FFE0B2; padding: 12px; border-radius: 8px; color: #E65100; }}
                .footer {{ margin-top: 32px; padding-top: 24px; border-top: 1px solid #E6E4DC; font-size: 13px; color: #999; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">🧠 Skimly</div>
                <h1>Reset your password</h1>
                <p>Hi {name},</p>
                <p>We received a request to reset your password. Click the button below to create a new password.</p>
                <a href="{reset_link}" class="button">Reset Password</a>
                <p>Or copy this link: {reset_link}</p>
                <div class="warning">
                    ⚠️ This link expires in 1 hour. If you didn't request this, please ignore this email.
                </div>
                <div class="footer">
                    <p>© 2026 Skimly</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self._send_email(to_email, "Reset your Skimly password", html_content)
    
    def send_weekly_digest(self, to_email: str, name: str, digest_data: dict) -> bool:
        """Send weekly intelligence digest"""
        insights_html = ""
        for i, insight in enumerate(digest_data.get('top_insights', [])[:5], 1):
            insights_html += f"<li style='margin-bottom: 12px;'>{insight}</li>"
        
        actions_html = ""
        for action in digest_data.get('pending_actions', [])[:5]:
            actions_html += f"<li style='margin-bottom: 8px;'>{action}</li>"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Inter', -apple-system, sans-serif; background: #FDFCF8; padding: 40px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; border: 1px solid #E6E4DC; }}
                .logo {{ color: #2E5C55; font-size: 24px; font-weight: bold; margin-bottom: 24px; }}
                h1 {{ font-family: 'Georgia', serif; color: #2D2D2D; font-weight: 400; }}
                h2 {{ font-family: 'Georgia', serif; color: #2E5C55; font-size: 18px; margin-top: 32px; }}
                p {{ color: #666660; line-height: 1.6; }}
                .stat-box {{ background: #F5F5F0; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }}
                .stat-number {{ font-size: 48px; font-weight: 300; color: #2E5C55; }}
                .stat-label {{ font-size: 14px; color: #666660; }}
                ul {{ padding-left: 20px; color: #2D2D2D; }}
                .button {{ display: inline-block; background: #2E5C55; color: white; padding: 14px 32px; border-radius: 24px; text-decoration: none; font-weight: 500; margin: 24px 0; }}
                .footer {{ margin-top: 32px; padding-top: 24px; border-top: 1px solid #E6E4DC; font-size: 13px; color: #999; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">🧠 Skimly</div>
                <h1>Your Weekly Intelligence Digest</h1>
                <p>Hi {name}, here's what you learned this week.</p>
                
                <div class="stat-box">
                    <div class="stat-number">{digest_data.get('item_count', 0)}</div>
                    <div class="stat-label">Knowledge items captured</div>
                </div>
                
                <h2>💡 Top Insights</h2>
                <ul>{insights_html if insights_html else "<li>No insights captured this week</li>"}</ul>
                
                <h2>🎯 Pending Actions</h2>
                <ul>{actions_html if actions_html else "<li>No actions pending</li>"}</ul>
                
                <a href="#" class="button">View Full Dashboard</a>
                
                <div class="footer">
                    <p>Everything you read makes you smarter forever.</p>
                    <p>© 2026 Skimly</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self._send_email(to_email, f"🧠 Your Skimly Weekly Digest - {digest_data.get('item_count', 0)} insights", html_content)
    
    def send_upgrade_confirmation(self, to_email: str, name: str) -> bool:
        """Send Pro upgrade confirmation"""
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Inter', -apple-system, sans-serif; background: #FDFCF8; padding: 40px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; border: 1px solid #E6E4DC; }}
                .logo {{ color: #2E5C55; font-size: 24px; font-weight: bold; margin-bottom: 24px; }}
                h1 {{ font-family: 'Georgia', serif; color: #2D2D2D; font-weight: 400; }}
                p {{ color: #666660; line-height: 1.6; }}
                .pro-badge {{ display: inline-block; background: #D97757; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }}
                .feature {{ display: flex; align-items: center; margin: 12px 0; }}
                .feature-icon {{ margin-right: 12px; font-size: 20px; }}
                .button {{ display: inline-block; background: #2E5C55; color: white; padding: 14px 32px; border-radius: 24px; text-decoration: none; font-weight: 500; margin: 24px 0; }}
                .footer {{ margin-top: 32px; padding-top: 24px; border-top: 1px solid #E6E4DC; font-size: 13px; color: #999; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">🧠 Skimly <span class="pro-badge">PRO</span></div>
                <h1>Welcome to Skimly Pro! 🎉</h1>
                <p>Hi {name},</p>
                <p>Thank you for upgrading to Skimly Pro. You now have access to all premium features:</p>
                
                <div class="feature"><span class="feature-icon">♾️</span> Unlimited analyses</div>
                <div class="feature"><span class="feature-icon">🧠</span> Ask Your Brain - query your knowledge</div>
                <div class="feature"><span class="feature-icon">📬</span> Weekly Intelligence Digests</div>
                <div class="feature"><span class="feature-icon">💾</span> Full knowledge base with export</div>
                <div class="feature"><span class="feature-icon">🚀</span> Priority support</div>
                
                <a href="#" class="button">Start Exploring</a>
                
                <div class="footer">
                    <p>Everything you read makes you smarter forever.</p>
                    <p>© 2026 Skimly</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self._send_email(to_email, "🎉 Welcome to Skimly Pro!", html_content)

# Singleton instance
email_service = EmailService()
