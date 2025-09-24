#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class TokenomicsAPITester:
    def __init__(self, base_url="https://tokenomics-ai.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details="", response_data=None):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test_name": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if data:
            print(f"   Data: {json.dumps(data, indent=2)}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=timeout)

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            response_data = None
            
            try:
                response_data = response.json()
                if success:
                    print(f"   Response: {json.dumps(response_data, indent=2)[:500]}...")
                else:
                    print(f"   Error Response: {json.dumps(response_data, indent=2)}")
            except:
                if not success:
                    print(f"   Raw Response: {response.text[:500]}...")

            self.log_test(name, success, 
                         f"Expected {expected_status}, got {response.status_code}" if not success else "",
                         response_data)
            
            return success, response_data

        except requests.exceptions.Timeout:
            self.log_test(name, False, f"Request timeout after {timeout}s")
            return False, {}
        except Exception as e:
            self.log_test(name, False, f"Request error: {str(e)}")
            return False, {}

    def test_tokenomics_generation(self):
        """Test the main tokenomics generation endpoint"""
        test_data = {
            "project_name": "Test DeFi Project",
            "project_type": "DeFi",
            "target_audience": "retail",
            "funding_goals": "Seed round for protocol development",
            "planned_raise_size": "$2M",
            "desired_utility": ["staking", "governance", "fee discounts"],
            "additional_info": "Focus on yield farming and liquidity provision"
        }
        
        # Test with longer timeout since AI generation can take time
        success, response = self.run_test(
            "Tokenomics Generation",
            "POST",
            "tokenomics/generate",
            200,
            data=test_data,
            timeout=60  # Increased timeout for AI generation
        )
        
        if success and response:
            # Validate response structure
            required_fields = ['project', 'chart_data']
            project_fields = ['id', 'project_name', 'allocations', 'total_supply', 'narrative']
            
            missing_fields = []
            for field in required_fields:
                if field not in response:
                    missing_fields.append(field)
            
            if 'project' in response:
                for field in project_fields:
                    if field not in response['project']:
                        missing_fields.append(f"project.{field}")
            
            if missing_fields:
                self.log_test("Response Structure Validation", False, 
                             f"Missing fields: {', '.join(missing_fields)}")
                return None
            else:
                self.log_test("Response Structure Validation", True)
                return response['project']['id']
        
        return None

    def test_project_retrieval(self, project_id):
        """Test retrieving a specific project"""
        if not project_id:
            self.log_test("Project Retrieval", False, "No project ID available")
            return False
            
        success, response = self.run_test(
            "Project Retrieval",
            "GET",
            f"tokenomics/{project_id}",
            200
        )
        return success

    def test_pdf_generation(self, project_id):
        """Test PDF generation endpoint"""
        if not project_id:
            self.log_test("PDF Generation", False, "No project ID available")
            return False
            
        url = f"{self.api_url}/tokenomics/{project_id}/pdf"
        print(f"\n🔍 Testing PDF Generation...")
        print(f"   URL: {url}")
        
        try:
            response = requests.get(url, timeout=30)
            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == 200
            if success:
                # Check if response is actually a PDF
                content_type = response.headers.get('content-type', '')
                if 'application/pdf' in content_type:
                    print(f"   Content-Type: {content_type}")
                    print(f"   Content-Length: {len(response.content)} bytes")
                    self.log_test("PDF Generation", True, f"PDF generated successfully ({len(response.content)} bytes)")
                else:
                    self.log_test("PDF Generation", False, f"Invalid content type: {content_type}")
                    success = False
            else:
                try:
                    error_data = response.json()
                    self.log_test("PDF Generation", False, f"Status {response.status_code}: {error_data}")
                except:
                    self.log_test("PDF Generation", False, f"Status {response.status_code}: {response.text[:200]}")
            
            return success
            
        except Exception as e:
            self.log_test("PDF Generation", False, f"Request error: {str(e)}")
            return False

    def test_payment_endpoints(self):
        """Test payment-related endpoints"""
        # Test checkout session creation
        try:
            url = f"{self.api_url}/payments/checkout/session"
            params = {
                'package_id': 'basic',
                'origin_url': 'https://tokenomics-ai.preview.emergentagent.com'
            }
            
            print(f"\n🔍 Testing Payment Checkout Session...")
            print(f"   URL: {url}")
            print(f"   Params: {params}")
            
            response = requests.post(url, params=params, timeout=30)
            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == 200
            if success:
                try:
                    data = response.json()
                    if 'session_id' in data and 'url' in data:
                        print(f"   Session ID: {data.get('session_id', 'N/A')}")
                        print(f"   Checkout URL: {data.get('url', 'N/A')[:100]}...")
                        self.log_test("Payment Checkout Session", True)
                    else:
                        self.log_test("Payment Checkout Session", False, "Missing session_id or url in response")
                except:
                    self.log_test("Payment Checkout Session", False, "Invalid JSON response")
            else:
                try:
                    error_data = response.json()
                    self.log_test("Payment Checkout Session", False, f"Status {response.status_code}: {error_data}")
                except:
                    self.log_test("Payment Checkout Session", False, f"Status {response.status_code}: {response.text[:200]}")
                    
        except Exception as e:
            self.log_test("Payment Checkout Session", False, f"Request error: {str(e)}")

    def test_cors_and_connectivity(self):
        """Test basic connectivity and CORS"""
        try:
            # Test basic connectivity
            response = requests.get(self.base_url, timeout=10)
            if response.status_code in [200, 404]:  # 404 is fine, means server is responding
                self.log_test("Server Connectivity", True)
            else:
                self.log_test("Server Connectivity", False, f"Unexpected status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Server Connectivity", False, f"Connection error: {str(e)}")

    def run_all_tests(self):
        """Run all tests"""
        print("=" * 60)
        print("🚀 TOKENOMICS AI BACKEND API TESTING")
        print("=" * 60)
        print(f"Testing against: {self.base_url}")
        print(f"API Base URL: {self.api_url}")
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)

        # Test basic connectivity first
        self.test_cors_and_connectivity()
        
        # Test main tokenomics generation
        project_id = self.test_tokenomics_generation()
        
        # Test project retrieval if we have a project ID
        if project_id:
            time.sleep(1)  # Brief pause between tests
            self.test_project_retrieval(project_id)
            
            # Test PDF generation
            time.sleep(1)
            self.test_pdf_generation(project_id)
        
        # Test payment endpoints
        time.sleep(1)
        self.test_payment_endpoints()

        # Print final results
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.tests_passed < self.tests_run:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   • {result['test_name']}: {result['details']}")
        
        print("=" * 60)
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = TokenomicsAPITester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n\n💥 Unexpected error during testing: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())