#!/usr/bin/env python3
"""
Backend API Testing for Medical AI Assistant
Tests all endpoints with proper authentication and role-based access
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class MedicalAITester:
    def __init__(self, base_url="https://medical-ai-assist-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.regular_token = None
        self.admin_user = None
        self.regular_user = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_category_id = None
        self.created_document_id = None

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def make_request(self, method: str, endpoint: str, data: Dict = None, token: str = None, expected_status: int = 200) -> tuple:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}

            return success, response_data

        except Exception as e:
            return False, {"error": str(e)}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, data = self.make_request('GET', '')
        self.log_test("Root API endpoint", success, 
                     "" if success else f"Failed: {data}", data)
        return success

    def test_user_registration(self):
        """Test user registration - first user becomes admin"""
        print("\n🔐 Testing Authentication...")
        
        # Register admin user (first user)
        admin_data = {
            "email": f"admin.test.{datetime.now().strftime('%H%M%S')}@hopital.fr",
            "password": "AdminPass123!",
            "name": "Admin Test"
        }
        
        success, data = self.make_request('POST', 'auth/register', admin_data, expected_status=200)
        if success and 'token' in data:
            self.admin_token = data['token']
            self.admin_user = data['user']
            self.log_test("Admin user registration", True, f"Role: {data['user']['role']}")
        else:
            self.log_test("Admin user registration", False, f"Failed: {data}")
            return False

        # Register regular user
        regular_data = {
            "email": f"user.test.{datetime.now().strftime('%H%M%S')}@hopital.fr",
            "password": "UserPass123!",
            "name": "User Test"
        }
        
        success, data = self.make_request('POST', 'auth/register', regular_data, expected_status=200)
        if success and 'token' in data:
            self.regular_token = data['token']
            self.regular_user = data['user']
            self.log_test("Regular user registration", True, f"Role: {data['user']['role']}")
        else:
            self.log_test("Regular user registration", False, f"Failed: {data}")
            return False

        return True

    def test_user_login(self):
        """Test user login"""
        if not self.admin_user:
            self.log_test("Login test", False, "No admin user to test login")
            return False

        login_data = {
            "email": self.admin_user['email'],
            "password": "AdminPass123!"
        }
        
        success, data = self.make_request('POST', 'auth/login', login_data, expected_status=200)
        self.log_test("User login", success and 'token' in data, 
                     "" if success else f"Failed: {data}")
        return success

    def test_get_current_user(self):
        """Test get current user endpoint"""
        success, data = self.make_request('GET', 'auth/me', token=self.admin_token)
        self.log_test("Get current user", success and 'email' in data,
                     "" if success else f"Failed: {data}")
        return success

    def test_categories_crud(self):
        """Test categories CRUD operations"""
        print("\n📁 Testing Categories...")
        
        # Create category (admin only)
        category_data = {
            "name": "Test Category",
            "description": "Test category for automated testing"
        }
        
        success, data = self.make_request('POST', 'document-categories', category_data, 
                                        token=self.admin_token, expected_status=200)
        if success and 'id' in data:
            self.created_category_id = data['id']
            self.log_test("Create category (admin)", True)
        else:
            self.log_test("Create category (admin)", False, f"Failed: {data}")

        # Try to create category with regular user (should fail)
        success, data = self.make_request('POST', 'document-categories', category_data, 
                                        token=self.regular_token, expected_status=403)
        self.log_test("Create category (regular user - should fail)", success)

        # Get categories
        success, data = self.make_request('GET', 'document-categories', token=self.admin_token)
        self.log_test("Get categories", success and isinstance(data, list),
                     "" if success else f"Failed: {data}")

        return self.created_category_id is not None

    def test_documents_crud(self):
        """Test documents CRUD operations"""
        print("\n📄 Testing Documents...")
        
        if not self.created_category_id:
            self.log_test("Documents test", False, "No category available for testing")
            return False

        # Create document
        document_data = {
            "title": "Test Document",
            "content": "This is a test document for automated testing.",
            "category_id": self.created_category_id,
            "visibility": ["admin", "direction", "personnel_soignant"]
        }
        
        success, data = self.make_request('POST', 'documents', document_data, 
                                        token=self.admin_token, expected_status=200)
        if success and 'id' in data:
            self.created_document_id = data['id']
            self.log_test("Create document", True)
        else:
            self.log_test("Create document", False, f"Failed: {data}")
            return False

        # Get documents
        success, data = self.make_request('GET', 'documents', token=self.admin_token)
        self.log_test("Get documents", success and isinstance(data, list),
                     "" if success else f"Failed: {data}")

        # Get specific document
        success, data = self.make_request('GET', f'documents/{self.created_document_id}', 
                                        token=self.admin_token)
        self.log_test("Get specific document", success and 'title' in data,
                     "" if success else f"Failed: {data}")

        # Update document
        update_data = {
            "title": "Updated Test Document",
            "content": "This document has been updated."
        }
        success, data = self.make_request('PUT', f'documents/{self.created_document_id}', 
                                        update_data, token=self.admin_token)
        self.log_test("Update document", success and data.get('title') == update_data['title'],
                     "" if success else f"Failed: {data}")

        return True

    def test_users_management(self):
        """Test user management (admin only)"""
        print("\n👥 Testing User Management...")
        
        # Get users (admin only)
        success, data = self.make_request('GET', 'users', token=self.admin_token)
        self.log_test("Get users (admin)", success and isinstance(data, list),
                     "" if success else f"Failed: {data}")

        # Try to get users with regular user (should fail)
        success, data = self.make_request('GET', 'users', token=self.regular_token, expected_status=403)
        self.log_test("Get users (regular user - should fail)", success)

        # Update user role
        if self.regular_user:
            role_data = {"role": "direction"}
            success, data = self.make_request('PUT', f'users/{self.regular_user["id"]}/role', 
                                            role_data, token=self.admin_token)
            self.log_test("Update user role", success and data.get('role') == 'direction',
                         "" if success else f"Failed: {data}")

        return True

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n📊 Testing Dashboard...")
        
        success, data = self.make_request('GET', 'dashboard/stats', token=self.admin_token)
        expected_fields = ['total_documents', 'total_users', 'documents_by_category', 'users_by_role']
        has_fields = all(field in data for field in expected_fields) if success else False
        
        self.log_test("Get dashboard stats", success and has_fields,
                     "" if success else f"Failed: {data}")
        return success

    def test_seed_data(self):
        """Test seed data creation"""
        print("\n🌱 Testing Seed Data...")
        
        success, data = self.make_request('POST', 'seed-data', token=self.admin_token)
        self.log_test("Create seed data", success and 'categories' in data,
                     "" if success else f"Failed: {data}")
        return success

    def test_ai_assistant(self):
        """Test AI assistant endpoints"""
        print("\n🤖 Testing AI Assistant...")
        
        # Test context suggestions
        success, data = self.make_request('GET', 'ai-assistant/suggestions-context', 
                                        token=self.admin_token)
        self.log_test("AI context suggestions", success and 'response' in data,
                     "" if success else f"Failed: {data}")

        # Test enhanced suggestions
        success, data = self.make_request('GET', 'ai-assistant/suggestions-enhanced', 
                                        token=self.admin_token)
        self.log_test("AI enhanced suggestions", success and 'response' in data,
                     "" if success else f"Failed: {data}")

        # Test Q&A
        qa_data = {"question": "Quel est le protocole d'hygiène ?"}
        success, data = self.make_request('POST', 'ai-assistant/qa', qa_data, 
                                        token=self.admin_token)
        self.log_test("AI Q&A", success and 'response' in data,
                     "" if success else f"Failed: {data}")

        # Test Q&A history
        success, data = self.make_request('GET', 'ai-assistant/qa-history', 
                                        token=self.admin_token)
        self.log_test("AI Q&A history", success and isinstance(data, list),
                     "" if success else f"Failed: {data}")

        return True

    def cleanup(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up...")
        
        # Delete test document
        if self.created_document_id:
            success, _ = self.make_request('DELETE', f'documents/{self.created_document_id}', 
                                         token=self.admin_token)
            self.log_test("Delete test document", success)

        # Delete test category
        if self.created_category_id:
            success, _ = self.make_request('DELETE', f'document-categories/{self.created_category_id}', 
                                         token=self.admin_token)
            self.log_test("Delete test category", success)

        # Delete test users
        if self.regular_user:
            success, _ = self.make_request('DELETE', f'users/{self.regular_user["id"]}', 
                                         token=self.admin_token)
            self.log_test("Delete regular test user", success)

    def run_all_tests(self):
        """Run all tests"""
        print("🏥 Starting Medical AI Assistant Backend Tests")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 60)

        # Test sequence
        tests = [
            self.test_root_endpoint,
            self.test_user_registration,
            self.test_user_login,
            self.test_get_current_user,
            self.test_categories_crud,
            self.test_documents_crud,
            self.test_users_management,
            self.test_dashboard_stats,
            self.test_seed_data,
            self.test_ai_assistant,
        ]

        for test in tests:
            try:
                test()
            except Exception as e:
                self.log_test(f"Exception in {test.__name__}", False, str(e))

        # Cleanup
        self.cleanup()

        # Results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("❌ Some tests failed")
            failed_tests = [r for r in self.test_results if not r['success']]
            print("\nFailed tests:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
            return 1

def main():
    tester = MedicalAITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())