#!/usr/bin/env python3
"""
Skimly Backend API Test Suite
Tests all core functionality including auth, analysis, knowledge management
"""

import requests
import sys
import json
import time
from datetime import datetime

class SkimlyAPITester:
    def __init__(self, base_url="https://mvp-maker-2.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.session = requests.Session()

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                self.log(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    'test': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}")
            self.failed_tests.append({
                'test': name,
                'error': str(e)
            })
            return False, {}

    def test_health_check(self):
        """Test basic health endpoints"""
        self.log("\n=== HEALTH CHECK TESTS ===")
        self.run_test("API Root", "GET", "", 200)
        self.run_test("Health Check", "GET", "health", 200)

    def test_auth_flow(self):
        """Test complete authentication flow"""
        self.log("\n=== AUTHENTICATION TESTS ===")
        
        # Generate unique test user
        timestamp = int(time.time())
        test_email = f"test_{timestamp}@example.com"
        test_password = "TestPass123!"
        test_name = f"Test User {timestamp}"

        # Test registration
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": test_password,
                "name": test_name
            }
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['user_id']
            self.log(f"   Registered user: {test_email}")
        else:
            self.log("❌ Registration failed, cannot continue with auth tests")
            return False

        # Test login with same credentials
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": test_email,
                "password": test_password
            }
        )
        
        if success and 'token' in response:
            self.token = response['token']  # Update token
            self.log(f"   Login successful")
        
        # Test get current user
        self.run_test("Get Current User", "GET", "auth/me", 200)
        
        # Test invalid credentials
        self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data={
                "email": test_email,
                "password": "wrongpassword"
            }
        )
        
        return True

    def test_analysis_flow(self):
        """Test text analysis functionality"""
        self.log("\n=== ANALYSIS TESTS ===")
        
        if not self.token:
            self.log("❌ No auth token, skipping analysis tests")
            return False

        # Test text analysis
        sample_text = """
        Artificial Intelligence is transforming how businesses operate. Companies that adopt AI see 
        significant productivity gains, but implementation requires careful planning and cultural change. 
        The key is to start small and scale gradually while ensuring employee buy-in.
        """
        
        success, response = self.run_test(
            "Text Analysis",
            "POST",
            "analyze",
            200,
            data={
                "text": sample_text,
                "source_url": "https://example.com/ai-article",
                "source_title": "AI in Business"
            }
        )
        
        if success and 'analysis' in response:
            analysis = response['analysis']
            required_fields = ['key_points', 'implications', 'actions', 'questions', 'personal_relevance']
            
            for field in required_fields:
                if field not in analysis:
                    self.log(f"❌ Missing analysis field: {field}")
                    return False
                elif not isinstance(analysis[field], list):
                    self.log(f"❌ Analysis field {field} should be a list")
                    return False
            
            self.log(f"   Analysis contains {len(analysis['key_points'])} key points")
            return response
        
        # Test empty text
        self.run_test(
            "Empty Text Analysis",
            "POST",
            "analyze",
            400,
            data={"text": ""}
        )
        
        return False

    def test_knowledge_management(self):
        """Test knowledge saving and retrieval"""
        self.log("\n=== KNOWLEDGE MANAGEMENT TESTS ===")
        
        if not self.token:
            self.log("❌ No auth token, skipping knowledge tests")
            return False

        # First analyze some text
        sample_text = "Machine learning models require large datasets and computational resources."
        
        success, analysis_response = self.run_test(
            "Analysis for Save",
            "POST",
            "analyze",
            200,
            data={"text": sample_text}
        )
        
        if not success:
            self.log("❌ Cannot test knowledge management without analysis")
            return False

        # Save the analysis
        success, save_response = self.run_test(
            "Save Knowledge",
            "POST",
            "save",
            200,
            data={
                "original_text": sample_text,
                "analysis": analysis_response['analysis'],
                "tags": ["ai", "machine-learning"]
            }
        )
        
        if success and 'item_id' in save_response:
            item_id = save_response['item_id']
            self.log(f"   Saved item: {item_id}")
            
            # Test retrieval
            self.run_test("Get History", "GET", "history", 200)
            self.run_test("Get Specific Item", "GET", f"knowledge/{item_id}", 200)
            
            # Test tags
            self.run_test("Get All Tags", "GET", "tags", 200)
            
            # Test deletion
            self.run_test("Delete Item", "DELETE", f"knowledge/{item_id}", 200)
            
            # Verify deletion
            self.run_test("Get Deleted Item", "GET", f"knowledge/{item_id}", 404)
            
            return True
        
        return False

    def test_stats_and_limits(self):
        """Test user statistics and free tier limits"""
        self.log("\n=== STATS AND LIMITS TESTS ===")
        
        if not self.token:
            self.log("❌ No auth token, skipping stats tests")
            return False

        # Test stats endpoint
        success, stats = self.run_test("Get User Stats", "GET", "stats", 200)
        
        if success:
            required_stats = ['total_items', 'today_count', 'week_count', 'tier']
            for stat in required_stats:
                if stat not in stats:
                    self.log(f"❌ Missing stat: {stat}")
                    return False
            
            self.log(f"   User tier: {stats['tier']}")
            self.log(f"   Total items: {stats['total_items']}")
            
            # Test free tier limits (if user is on free tier)
            if stats['tier'] == 'free':
                self.log(f"   Daily limit: {stats.get('daily_limit', 'N/A')}")
                self.log(f"   Remaining today: {stats.get('remaining_today', 'N/A')}")
        
        return success

    def test_pro_features(self):
        """Test Pro-only features (should return 403 for free users)"""
        self.log("\n=== PRO FEATURES TESTS ===")
        
        if not self.token:
            self.log("❌ No auth token, skipping pro features tests")
            return False

        # Test Ask Your Brain (Pro feature)
        self.run_test(
            "Ask Your Brain (Free User)",
            "POST",
            "ask",
            403,
            data={"question": "What do I know about AI?"}
        )
        
        # Test Weekly Digest (Pro feature)
        self.run_test(
            "Weekly Digest (Free User)",
            "GET",
            "digest",
            403
        )

    def test_profile_management(self):
        """Test profile update functionality"""
        self.log("\n=== PROFILE MANAGEMENT TESTS ===")
        
        if not self.token:
            self.log("❌ No auth token, skipping profile tests")
            return False

        # Test profile update
        success, response = self.run_test(
            "Update Profile",
            "PUT",
            "profile",
            200,
            data={
                "interests": ["AI", "Machine Learning", "Technology"],
                "goals": ["Learn more about AI", "Build better products"],
                "projects": ["Skimly Testing"]
            }
        )
        
        if success:
            self.log("   Profile updated successfully")
        
        return success

    def test_export_functionality(self):
        """Test knowledge export"""
        self.log("\n=== EXPORT TESTS ===")
        
        if not self.token:
            self.log("❌ No auth token, skipping export tests")
            return False

        success, response = self.run_test("Export Knowledge", "GET", "export", 200)
        
        if success and 'items' in response:
            self.log(f"   Export contains {len(response['items'])} items")
        
        return success

    def test_password_reset_flow(self):
        """Test password reset functionality"""
        self.log("\n=== PASSWORD RESET TESTS ===")
        
        # Test forgot password endpoint
        success, response = self.run_test(
            "Forgot Password",
            "POST",
            "auth/forgot-password",
            200,
            data={"email": "test@example.com"}
        )
        
        if success:
            self.log("   Forgot password request processed")
        
        # Test reset password with invalid token
        self.run_test(
            "Reset Password (Invalid Token)",
            "POST",
            "auth/reset-password",
            400,
            data={
                "token": "invalid_token_12345",
                "new_password": "NewPassword123!"
            }
        )
        
        return success

    def test_payment_endpoints(self):
        """Test Stripe payment integration"""
        self.log("\n=== PAYMENT TESTS ===")
        
        if not self.token:
            self.log("❌ No auth token, skipping payment tests")
            return False

        # Test checkout creation
        success, response = self.run_test(
            "Create Checkout Session",
            "POST",
            "payments/checkout",
            200,
            data={"origin_url": "https://example.com"}
        )
        
        session_id = None
        if success and 'session_id' in response:
            session_id = response['session_id']
            self.log(f"   Created checkout session: {session_id}")
        
        # Test payment status check
        if session_id:
            success, status_response = self.run_test(
                "Check Payment Status",
                "GET",
                f"payments/status/{session_id}",
                200
            )
            
            if success:
                self.log(f"   Payment status: {status_response.get('status', 'unknown')}")
        
        return success

    def test_recommendations_endpoint(self):
        """Test recommendations engine"""
        self.log("\n=== RECOMMENDATIONS TESTS ===")
        
        if not self.token:
            self.log("❌ No auth token, skipping recommendations tests")
            return False

        success, response = self.run_test("Get Recommendations", "GET", "recommendations", 200)
        
        if success:
            if isinstance(response, list):
                self.log(f"   Received {len(response)} recommendations")
                
                # Check recommendation structure
                for i, rec in enumerate(response[:3]):  # Check first 3
                    required_fields = ['type', 'title', 'description']
                    for field in required_fields:
                        if field not in rec:
                            self.log(f"❌ Recommendation {i} missing field: {field}")
                            return False
                
                self.log("   Recommendations have correct structure")
            else:
                self.log("❌ Recommendations should be a list")
                return False
        
        return success

    def run_all_tests(self):
        """Run complete test suite"""
        self.log("🚀 Starting Skimly API Test Suite")
        self.log(f"Testing against: {self.base_url}")
        
        start_time = time.time()
        
        # Run all test categories
        self.test_health_check()
        auth_success = self.test_auth_flow()
        
        if auth_success:
            self.test_analysis_flow()
            self.test_knowledge_management()
            self.test_stats_and_limits()
            self.test_pro_features()
            self.test_profile_management()
            self.test_export_functionality()
        
        # Test logout
        if self.token:
            self.run_test("Logout", "POST", "auth/logout", 200)
        
        end_time = time.time()
        
        # Print summary
        self.log(f"\n{'='*50}")
        self.log(f"📊 TEST SUMMARY")
        self.log(f"{'='*50}")
        self.log(f"Tests run: {self.tests_run}")
        self.log(f"Tests passed: {self.tests_passed}")
        self.log(f"Tests failed: {len(self.failed_tests)}")
        self.log(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        self.log(f"Duration: {end_time - start_time:.2f}s")
        
        if self.failed_tests:
            self.log(f"\n❌ FAILED TESTS:")
            for failure in self.failed_tests:
                error_msg = failure.get('error', f"Expected {failure.get('expected')}, got {failure.get('actual')}")
                self.log(f"   - {failure['test']}: {error_msg}")
        
        return len(self.failed_tests) == 0

def main():
    tester = SkimlyAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())