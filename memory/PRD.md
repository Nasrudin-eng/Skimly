# Skimly - Product Requirements Document

## Overview
**Product Name:** Skimly  
**Tagline:** Everything you read makes you smarter forever  
**Version:** 1.0.0 MVP  
**Last Updated:** January 23, 2026

## Product Summary
Skimly is a universal AI cognition layer that transforms any digital information into structured, actionable, and personalized knowledge. It acts as:
- A real-time understanding engine
- A personal second brain  
- A long-term intelligence partner

## Core Value Proposition
Skimly reduces cognitive load and makes knowledge compound over time.

---

## User Personas

### Primary: Knowledge Worker
- **Profile:** Professional who consumes large amounts of digital content daily
- **Pain Points:** Information overload, forgetting key insights, no time to process
- **Goals:** Retain and apply knowledge efficiently

### Secondary: Student/Researcher
- **Profile:** Academic who needs to synthesize information from multiple sources
- **Pain Points:** Manual note-taking, difficulty connecting ideas
- **Goals:** Build comprehensive knowledge base for research

### Tertiary: Lifelong Learner
- **Profile:** Curious individual who reads broadly
- **Pain Points:** Losing track of insights, scattered notes
- **Goals:** Personal growth through accumulated wisdom

---

## Core Requirements (Static)

### Authentication
- [x] Email/password registration and login (JWT-based)
- [x] Google OAuth social login (via Emergent Auth)
- [x] Session management with 7-day expiry
- [x] Protected routes

### AI Analysis Engine
- [x] Text analysis using OpenAI GPT-5.2
- [x] Structured output schema:
  - Key Points
  - Implications
  - Actions
  - Questions
  - Personal Relevance
- [x] Context-aware prompting based on user profile

### Knowledge Base
- [x] Auto-save analyzed content
- [x] Full-text search
- [x] Tag management
- [x] Delete functionality
- [x] JSON export

### User Profile (Intelligence Layer)
- [x] Interests
- [x] Goals
- [x] Active projects
- [x] Learning themes

### Chrome Extension
- [x] Manifest V3 compliant
- [x] Highlight detection with floating button
- [x] Context menu integration
- [x] Keyboard shortcut (Ctrl+Shift+S)
- [x] Side panel for analysis results
- [x] Popup with stats

---

## What's Been Implemented

### Phase 1 - Core MVP ✅ (January 23, 2026)
- Full landing page with hero, features, pricing, CTA sections
- Complete authentication system (JWT + Google OAuth)
- Dashboard with Quick Analyze feature
- Real-time AI analysis using GPT-5.2
- Knowledge Base with search, filter, tags, delete
- User profile/settings page
- Statistics tracking
- Chrome Extension (manifest, popup, content script, side panel)

### Phase 2 - Memory + Ask Brain ✅
- Vector embedding generation for knowledge items
- Ask Your Brain feature (Pro only)
- Semantic search across personal knowledge

### Phase 3 - Digest ✅
- Weekly Intelligence Digest (Pro only)
- Top insights aggregation
- Pending actions compilation

---

## Pricing Tiers

### Free Tier
- 10 analyses per day
- Basic structured output
- Chrome extension
- 7-day history

### Pro Tier ($12/month)
- Unlimited analyses
- Full knowledge base
- Ask Your Brain mode
- Weekly digests
- Priority support
- Export anytime

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 19 + Tailwind CSS + Shadcn UI |
| Backend | FastAPI (Python) |
| Database | MongoDB (with vector search) |
| AI | OpenAI GPT-5.2 via emergentintegrations |
| Auth | JWT + Emergent Google OAuth |
| Extension | Chrome Manifest V3 |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | User registration |
| POST | /api/auth/login | User login |
| POST | /api/auth/google/session | Google OAuth callback |
| GET | /api/auth/me | Get current user |
| POST | /api/auth/logout | Logout |
| PUT | /api/profile | Update profile |
| POST | /api/analyze | Analyze text |
| POST | /api/save | Save to knowledge base |
| GET | /api/history | Get knowledge history |
| GET | /api/knowledge/{id} | Get single item |
| DELETE | /api/knowledge/{id} | Delete item |
| PUT | /api/knowledge/{id}/tags | Update tags |
| GET | /api/tags | Get all tags |
| POST | /api/ask | Ask Your Brain (Pro) |
| GET | /api/digest | Weekly digest (Pro) |
| GET | /api/stats | User statistics |
| GET | /api/export | Export knowledge |

---

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- [ ] Stripe payment integration for Pro tier
- [ ] Email verification for registration
- [ ] Password reset functionality

### P1 - High Priority
- [ ] Weekly digest email automation
- [ ] Recommendation engine
- [ ] Knowledge item editing
- [ ] Bulk operations (delete, tag)

### P2 - Medium Priority
- [ ] Dark mode toggle
- [ ] Mobile responsive improvements
- [ ] Knowledge sharing (public links)
- [ ] Browser extension for Firefox/Safari

### P3 - Nice to Have
- [ ] Team workspaces
- [ ] API access for developers
- [ ] Integrations (Notion, Obsidian)
- [ ] Advanced analytics dashboard

---

## Success Metrics

### North Star
- Weekly Active Users (WAU)

### Secondary Metrics
- Knowledge items captured per user
- Queries per user (Ask Brain usage)
- 7-day retention rate
- Free → Pro conversion rate

---

## Design System

### Colors
- Primary: #2E5C55 (Deep Forest Green)
- Accent: #D97757 (Terracotta)
- Background: #FDFCF8 (Warm Paper)

### Typography
- Headings: Fraunces (serif)
- Body: Inter (sans-serif)

### Visual Style
- "Intellectual Zen" - calm, focused, premium
- Paper-like textures
- Generous whitespace
- Subtle animations

---

## File Structure

```
/app/
├── backend/
│   ├── server.py          # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── .env               # Environment variables
├── frontend/
│   ├── src/
│   │   ├── App.js         # Main React app
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # Auth context
│   │   ├── services/      # API service
│   │   └── components/    # UI components
│   └── package.json
├── chrome-extension/
│   ├── manifest.json      # Extension manifest
│   ├── background.js      # Service worker
│   ├── content.js         # Content script
│   ├── popup.html/js/css  # Popup UI
│   └── sidepanel.*        # Side panel UI
└── memory/
    └── PRD.md             # This file
```

---

## Next Tasks

1. **Stripe Integration** - Enable Pro subscriptions
2. **Email Notifications** - SendGrid for digests
3. **Chrome Web Store** - Publish extension
4. **Marketing Site** - SEO optimization
5. **User Onboarding** - Tutorial flow for new users
