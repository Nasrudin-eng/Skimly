"""
Skimly Background Scheduler
Handles periodic tasks like weekly digest emails
"""
import asyncio
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import logging

logger = logging.getLogger(__name__)

scheduler = None

async def send_weekly_digests_job(db, email_service):
    """Job to send weekly digest emails to all Pro users"""
    logger.info("Running weekly digest job...")
    
    try:
        # Get all Pro users
        pro_users = await db.users.find(
            {"tier": "pro"},
            {"_id": 0}
        ).to_list(10000)
        
        logger.info(f"Found {len(pro_users)} Pro users for digest")
        
        sent_count = 0
        
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
                    # Log the digest
                    await db.digest_logs.insert_one({
                        "user_id": user["user_id"],
                        "email": user["email"],
                        "items_count": len(items),
                        "sent_at": datetime.now(timezone.utc).isoformat()
                    })
                    
            except Exception as e:
                logger.error(f"Error sending digest to {user.get('email')}: {e}")
        
        logger.info(f"Weekly digest job complete: sent {sent_count} emails")
        
    except Exception as e:
        logger.error(f"Weekly digest job failed: {e}")


def init_scheduler(db, email_service):
    """Initialize the background scheduler"""
    global scheduler
    
    scheduler = AsyncIOScheduler()
    
    # Schedule weekly digest - Every Monday at 9:00 AM UTC
    scheduler.add_job(
        send_weekly_digests_job,
        CronTrigger(day_of_week='mon', hour=9, minute=0),
        args=[db, email_service],
        id='weekly_digest',
        name='Send weekly digest emails',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Background scheduler initialized - Weekly digest scheduled for Mondays at 9:00 AM UTC")
    
    return scheduler


def shutdown_scheduler():
    """Shutdown the scheduler gracefully"""
    global scheduler
    if scheduler:
        scheduler.shutdown()
        logger.info("Background scheduler shut down")
