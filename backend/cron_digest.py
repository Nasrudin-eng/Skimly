#!/usr/bin/env python3
"""
Skimly Cron Job - Weekly Digest Email Sender
Run this script weekly (e.g., every Monday at 9 AM) via cron or systemd timer

Crontab entry example:
0 9 * * 1 /usr/bin/python3 /app/backend/cron_digest.py >> /var/log/skimly_digest.log 2>&1
"""

import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Add backend to path
ROOT_DIR = Path(__file__).parent
sys.path.insert(0, str(ROOT_DIR))

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / '.env')

from motor.motor_asyncio import AsyncIOMotorClient
from email_service import email_service
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('skimly_digest_cron')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


async def send_weekly_digests():
    """Send weekly digest emails to all Pro users"""
    logger.info("Starting weekly digest job...")
    
    # Get all Pro users
    pro_users = await db.users.find(
        {"tier": "pro"},
        {"_id": 0}
    ).to_list(10000)
    
    logger.info(f"Found {len(pro_users)} Pro users")
    
    sent_count = 0
    error_count = 0
    
    for user in pro_users:
        try:
            # Get last 7 days of knowledge
            week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
            
            items = await db.knowledge_items.find(
                {"user_id": user["user_id"], "created_at": {"$gte": week_ago}},
                {"_id": 0, "embedding": 0}
            ).to_list(100)
            
            # Skip users with no activity
            if not items:
                logger.info(f"Skipping {user['email']} - no activity this week")
                continue
            
            # Aggregate insights
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
            
            # Send email
            success = email_service.send_weekly_digest(
                user["email"],
                user["name"],
                digest_data
            )
            
            if success:
                sent_count += 1
                logger.info(f"Sent digest to {user['email']}")
                
                # Record that we sent a digest
                await db.digest_logs.insert_one({
                    "user_id": user["user_id"],
                    "email": user["email"],
                    "items_count": len(items),
                    "sent_at": datetime.now(timezone.utc).isoformat()
                })
            else:
                error_count += 1
                logger.error(f"Failed to send digest to {user['email']}")
                
        except Exception as e:
            error_count += 1
            logger.error(f"Error processing {user.get('email', 'unknown')}: {e}")
    
    logger.info(f"Weekly digest job complete: {sent_count} sent, {error_count} errors")
    return sent_count, error_count


async def main():
    try:
        sent, errors = await send_weekly_digests()
        print(f"Digest job complete: {sent} sent, {errors} errors")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
