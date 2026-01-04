#!/usr/bin/env python3
"""
Test new features for Medical AI Assistant v2.0
Tests favorites, notifications, file upload, search, and PDF export
"""

import requests
import sys
import json
import io
from datetime import datetime

class NewFeaturesTester:
    def __init__(self, base_url="https://medical-ai-assist-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_document_id = None
        self.category_id = None

    def log_test(self, name: str, success: bool, details: str = ""):
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
            "details": details
        })

    def make_request(self, method: str, endpoint: str, data=None, token: str = None, expected_status: int = 200, files=None):
        """Make HTTP request"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        if files is None and data is not None:
            headers['Content-Type'] = 'application/json'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, headers=headers, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text[:200]}

            return success, response_data

        except Exception as e:
            return False, {"error": str(e)}

    def test_login(self):
        """Test login with existing admin credentials"""
        print("🔐 Testing Login with existing admin...")
        
        login_data = {
            "email": "admin@hopital.fr",
            "password": "admin123456"
        }
        
        success, data = self.make_request('POST', 'auth/login', login_data)
        if success and 'token' in data:
            self.admin_token = data['token']
            self.log_test("Admin login", True, f"Role: {data['user']['role']}")
            return True
        else:
            self.log_test("Admin login", False, f"Failed: {data}")
            return False

    def test_dashboard_with_new_stats(self):
        """Test dashboard with new stats (favorites, notifications)"""
        print("\n📊 Testing Enhanced Dashboard...")
        
        success, data = self.make_request('GET', 'dashboard/stats', token=self.admin_token)
        expected_fields = ['total_documents', 'total_users', 'total_favorites', 'unread_notifications']
        has_new_fields = all(field in data for field in expected_fields) if success else False
        
        self.log_test("Dashboard with new stats (favorites, notifications)", 
                     success and has_new_fields,
                     "" if success else f"Failed: {data}")
        return success

    def test_get_categories(self):
        """Get existing categories for document creation"""
        success, data = self.make_request('GET', 'document-categories', token=self.admin_token)
        if success and isinstance(data, list) and len(data) > 0:
            self.category_id = data[0]['id']
            self.log_test("Get categories for testing", True, f"Found {len(data)} categories")
            return True
        else:
            self.log_test("Get categories for testing", False, "No categories found")
            return False

    def test_file_upload(self):
        """Test multi-format file upload"""
        print("\n📁 Testing File Upload...")
        
        if not self.category_id:
            self.log_test("File upload test", False, "No category available")
            return False

        # Create a simple text file for testing
        test_content = "Ceci est un document de test pour l'upload de fichiers.\nContenu de test pour la recherche full-text."
        
        # Prepare form data
        form_data = {
            'title': 'Document Test Upload',
            'content': 'Description du document uploadé',
            'category_id': self.category_id,
            'visibility': 'admin,direction,personnel_soignant'
        }
        
        # Create file-like object
        files = {
            'file': ('test_document.txt', io.StringIO(test_content), 'text/plain')
        }
        
        success, data = self.make_request('POST', 'documents', form_data, 
                                        token=self.admin_token, files=files)
        if success and 'id' in data:
            self.created_document_id = data['id']
            self.log_test("Upload document with file", True, f"File type: {data.get('file_type')}")
            return True
        else:
            self.log_test("Upload document with file", False, f"Failed: {data}")
            return False

    def test_full_text_search(self):
        """Test full-text search in documents"""
        print("\n🔍 Testing Full-Text Search...")
        
        # Search for content from uploaded file
        search_params = {'search': 'recherche full-text'}
        
        url = f"{self.base_url}/api/documents"
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            response = requests.get(url, params=search_params, headers=headers, timeout=30)
            success = response.status_code == 200
            data = response.json() if success else {}
            
            found_results = len(data) > 0 if success else False
            self.log_test("Full-text search in documents", success and found_results,
                         "" if success else f"Failed: {data}")
            return success
        except Exception as e:
            self.log_test("Full-text search in documents", False, f"Exception: {str(e)}")
            return False

    def test_favorites_workflow(self):
        """Test complete favorites workflow"""
        print("\n⭐ Testing Favorites Workflow...")
        
        if not self.created_document_id:
            self.log_test("Favorites workflow", False, "No document available")
            return False

        # Add to favorites
        success, data = self.make_request('POST', f'favorites/{self.created_document_id}', 
                                        token=self.admin_token)
        self.log_test("Add document to favorites", success and 'message' in data,
                     "" if success else f"Failed: {data}")

        # Get favorites list
        success, data = self.make_request('GET', 'favorites', token=self.admin_token)
        has_favorite = any(doc['id'] == self.created_document_id for doc in data) if success and isinstance(data, list) else False
        self.log_test("Get favorites list", success and has_favorite,
                     "" if success else f"Failed: {data}")

        # Remove from favorites
        success, data = self.make_request('DELETE', f'favorites/{self.created_document_id}', 
                                        token=self.admin_token)
        self.log_test("Remove document from favorites", success and 'message' in data,
                     "" if success else f"Failed: {data}")

        return True

    def test_notifications_workflow(self):
        """Test notifications workflow"""
        print("\n🔔 Testing Notifications Workflow...")
        
        # Get notifications
        success, data = self.make_request('GET', 'notifications', token=self.admin_token)
        self.log_test("Get notifications list", success and isinstance(data, list),
                     "" if success else f"Failed: {data}")

        # Get unread count
        success, data = self.make_request('GET', 'notifications/unread-count', token=self.admin_token)
        self.log_test("Get unread notifications count", success and 'count' in data,
                     "" if success else f"Failed: {data}")

        # Mark all as read
        success, data = self.make_request('PUT', 'notifications/read-all', token=self.admin_token)
        self.log_test("Mark all notifications as read", success and 'message' in data,
                     "" if success else f"Failed: {data}")

        return True

    def test_pdf_export(self):
        """Test PDF export functionality"""
        print("\n📄 Testing PDF Export...")
        
        if not self.created_document_id:
            self.log_test("PDF export", False, "No document available")
            return False

        export_data = {"document_ids": [self.created_document_id]}
        
        url = f"{self.base_url}/api/documents/export-pdf"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.admin_token}'
        }

        try:
            response = requests.post(url, json=export_data, headers=headers, timeout=30)
            success = response.status_code == 200 and 'application/pdf' in response.headers.get('content-type', '')
            
            self.log_test("Export documents to PDF", success,
                         "" if success else f"Status: {response.status_code}, Content-Type: {response.headers.get('content-type')}")
            return success
        except Exception as e:
            self.log_test("Export documents to PDF", False, f"Exception: {str(e)}")
            return False

    def cleanup(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up...")
        
        if self.created_document_id:
            success, _ = self.make_request('DELETE', f'documents/{self.created_document_id}', 
                                         token=self.admin_token)
            self.log_test("Delete test document", success)

    def run_all_tests(self):
        """Run all new feature tests"""
        print("🏥 Testing Medical AI Assistant v2.0 New Features")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 60)

        # Test sequence
        tests = [
            self.test_login,
            self.test_dashboard_with_new_stats,
            self.test_get_categories,
            self.test_file_upload,
            self.test_full_text_search,
            self.test_favorites_workflow,
            self.test_notifications_workflow,
            self.test_pdf_export,
        ]

        for test in tests:
            try:
                result = test()
                if not result and test == self.test_login:
                    print("❌ Cannot continue without admin login")
                    break
            except Exception as e:
                self.log_test(f"Exception in {test.__name__}", False, str(e))

        # Cleanup
        self.cleanup()

        # Results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All new features working!")
            return 0
        else:
            print("❌ Some tests failed")
            failed_tests = [r for r in self.test_results if not r['success']]
            print("\nFailed tests:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
            return 1

def main():
    tester = NewFeaturesTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())