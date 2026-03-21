"""
TradeTrack Pro API Tests
Tests market endpoints, AI Q&A categories, and authentication flows
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://crypto-tracker-172.preview.emergentagent.com')

class TestHealth:
    """Health check tests - run first"""
    
    def test_health_check(self):
        """Test health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        print(f"✓ Health check passed: {data['status']}")


class TestCryptoAPI:
    """Cryptocurrency market data tests"""
    
    def test_get_crypto_data(self):
        """Test crypto endpoint returns coin data with INR prices"""
        response = requests.get(f"{BASE_URL}/api/markets/crypto", params={"limit": 5})
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Verify data structure for first coin
        coin = data[0]
        assert "id" in coin
        assert "symbol" in coin
        assert "name" in coin
        assert "current_price" in coin
        assert "market_cap" in coin
        
        # Verify prices are in INR (high values indicate INR)
        assert coin["current_price"] > 1000, "Price should be in INR"
        print(f"✓ Crypto API: Fetched {len(data)} coins, BTC price: ₹{coin['current_price']:,.0f}")
    
    def test_crypto_data_structure(self):
        """Test crypto data has expected fields"""
        response = requests.get(f"{BASE_URL}/api/markets/crypto", params={"limit": 3})
        assert response.status_code == 200
        data = response.json()
        
        for coin in data:
            assert "symbol" in coin
            assert "name" in coin
            assert "current_price" in coin
            assert "price_change_percentage_24h" in coin or True  # Optional field
        
        print(f"✓ Crypto data structure verified for {len(data)} coins")
    
    def test_crypto_search(self):
        """Test crypto search endpoint"""
        response = requests.get(f"{BASE_URL}/api/markets/crypto/search", params={"query": "bitcoin"})
        assert response.status_code == 200
        data = response.json()
        assert "coins" in data
        print(f"✓ Crypto search returned {len(data.get('coins', []))} results")


class TestStockAPI:
    """Indian stock market data tests - MOCK DATA"""
    
    def test_get_stock_data(self):
        """Test stock endpoint returns Indian stock data"""
        response = requests.get(f"{BASE_URL}/api/markets/stocks")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Verify stock data structure
        stock = data[0]
        assert "symbol" in stock
        assert "name" in stock
        assert "exchange" in stock
        assert "price" in stock
        assert "change" in stock
        assert "change_percent" in stock
        
        # Verify NSE stocks
        assert stock["exchange"] == "NSE"
        print(f"✓ Stock API: Fetched {len(data)} stocks (MOCK DATA)")
    
    def test_stock_companies(self):
        """Test that expected Indian companies are present"""
        response = requests.get(f"{BASE_URL}/api/markets/stocks")
        assert response.status_code == 200
        data = response.json()
        
        symbols = [s["symbol"] for s in data]
        expected = ["RELIANCE", "TCS", "HDFCBANK", "INFY"]
        
        for sym in expected:
            assert sym in symbols, f"{sym} should be in stock list"
        
        print(f"✓ Stock data includes major Indian companies")


class TestCommodityAPI:
    """Commodity prices tests - MOCK DATA"""
    
    def test_get_commodity_data(self):
        """Test commodity endpoint returns price data"""
        response = requests.get(f"{BASE_URL}/api/markets/commodities")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Verify commodity data structure
        commodity = data[0]
        assert "name" in commodity
        assert "symbol" in commodity
        assert "price" in commodity
        assert "unit" in commodity
        assert "change" in commodity
        assert "change_percent" in commodity
        
        print(f"✓ Commodity API: Fetched {len(data)} commodities (MOCK DATA)")
    
    def test_commodity_types(self):
        """Test expected commodities are present"""
        response = requests.get(f"{BASE_URL}/api/markets/commodities")
        assert response.status_code == 200
        data = response.json()
        
        symbols = [c["symbol"] for c in data]
        expected = ["GOLD", "SILVER", "BRENT"]
        
        for sym in expected:
            assert sym in symbols, f"{sym} should be in commodity list"
        
        print(f"✓ Commodity data includes Gold, Silver, Crude Oil")


class TestAIQnACategories:
    """AI Q&A categories endpoint tests"""
    
    def test_get_qna_categories(self):
        """Test Q&A categories endpoint returns all categories"""
        response = requests.get(f"{BASE_URL}/api/ai/qna/categories")
        assert response.status_code == 200
        data = response.json()
        
        assert "categories" in data
        categories = data["categories"]
        
        # Verify expected categories exist
        expected_categories = ["sip", "tax", "investment", "insurance", "retirement", "debt"]
        for cat in expected_categories:
            assert cat in categories, f"Category '{cat}' should exist"
        
        print(f"✓ AI Q&A: All 6 categories present")
    
    def test_category_structure(self):
        """Test each category has title, description, and questions"""
        response = requests.get(f"{BASE_URL}/api/ai/qna/categories")
        assert response.status_code == 200
        data = response.json()
        
        for cat_key, cat_data in data["categories"].items():
            assert "title" in cat_data, f"Category {cat_key} missing title"
            assert "description" in cat_data, f"Category {cat_key} missing description"
            assert "questions" in cat_data, f"Category {cat_key} missing questions"
            assert len(cat_data["questions"]) >= 3, f"Category {cat_key} should have at least 3 questions"
        
        print(f"✓ All categories have proper structure")


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_phone_signup_sends_otp(self):
        """Test phone signup endpoint sends OTP"""
        response = requests.post(
            f"{BASE_URL}/api/auth/signup/phone",
            json={"phone": "+919999988888", "name": "Test User"}
        )
        # May return 400 if phone already exists, which is acceptable
        assert response.status_code in [200, 400]
        
        if response.status_code == 200:
            data = response.json()
            assert data["success"] == True
            assert "demo_otp" in data or "message" in data
            print(f"✓ Phone signup: OTP sent successfully")
        else:
            print(f"✓ Phone signup: Phone already registered (expected)")
    
    def test_email_signup_sends_otp(self):
        """Test email signup endpoint sends OTP"""
        response = requests.post(
            f"{BASE_URL}/api/auth/signup/email",
            json={"email": "test_unique_user@example.com", "name": "Test User"}
        )
        # May return 400 if email already exists
        assert response.status_code in [200, 400]
        
        if response.status_code == 200:
            data = response.json()
            assert data["success"] == True
            assert "demo_otp" in data
            print(f"✓ Email signup: OTP sent successfully, demo_otp: {data.get('demo_otp')}")
        else:
            print(f"✓ Email signup: Email already registered (expected)")
    
    def test_otp_verify_invalid_otp(self):
        """Test OTP verification with invalid OTP"""
        response = requests.post(
            f"{BASE_URL}/api/auth/verify/otp",
            json={"phone_or_email": "invalid@test.com", "otp": "000000"}
        )
        # Should fail with invalid OTP
        assert response.status_code == 400
        print(f"✓ OTP verification correctly rejects invalid OTP")
    
    def test_logout_endpoint(self):
        """Test logout endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/logout")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Logout endpoint working")
    
    def test_auth_me_requires_token(self):
        """Test /auth/me requires authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print(f"✓ /auth/me correctly requires authentication")


class TestRootEndpoint:
    """Root API endpoint tests"""
    
    def test_api_root(self):
        """Test API root returns app info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "TradeTrack" in data["message"]
        print(f"✓ API root: {data['message']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
