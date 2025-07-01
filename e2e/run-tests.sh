#!/bin/bash

# Helper script to run Playwright tests

echo "🎭 Playwright Test Runner"
echo "========================"

# Check if Playwright is installed
if ! npx playwright --version > /dev/null 2>&1; then
    echo "⚠️  Playwright not found. Installing..."
    npm install -D @playwright/test
    npx playwright install
fi

# Parse command line arguments
TEST_SUITE=$1
HEADED=${2:-false}

# Function to run tests
run_tests() {
    local pattern=$1
    local name=$2
    
    echo ""
    echo "🧪 Running $name tests..."
    
    if [ "$HEADED" == "headed" ]; then
        npx playwright test "$pattern" --headed
    else
        npx playwright test "$pattern"
    fi
}

# Run specific test suite or all tests
case $TEST_SUITE in
    "auth")
        run_tests "01-authentication.spec.ts" "Authentication"
        ;;
    "onboarding")
        run_tests "02-onboarding.spec.ts" "Onboarding"
        ;;
    "dashboard")
        run_tests "03-dashboard.spec.ts" "Dashboard"
        ;;
    "team")
        run_tests "04-team-management.spec.ts" "Team Management"
        ;;
    "settings")
        run_tests "05-settings.spec.ts" "Settings"
        ;;
    "tenancy")
        run_tests "06-multi-tenancy.spec.ts" "Multi-tenancy"
        ;;
    "security")
        run_tests "07-security.spec.ts" "Security"
        ;;
    "journey")
        run_tests "08-user-journey.spec.ts" "User Journey"
        ;;
    "performance")
        run_tests "09-performance.spec.ts" "Performance"
        ;;
    "all")
        echo "Running all tests..."
        if [ "$HEADED" == "headed" ]; then
            npx playwright test --headed
        else
            npx playwright test
        fi
        ;;
    *)
        echo "Usage: ./e2e/run-tests.sh [suite] [headed]"
        echo ""
        echo "Available suites:"
        echo "  auth        - Authentication tests"
        echo "  onboarding  - Onboarding flow tests"
        echo "  dashboard   - Dashboard tests"
        echo "  team        - Team management tests"
        echo "  settings    - Settings management tests"
        echo "  tenancy     - Multi-tenancy tests"
        echo "  security    - Security tests"
        echo "  journey     - Complete user journey tests"
        echo "  performance - Performance tests"
        echo "  all         - Run all tests"
        echo ""
        echo "Options:"
        echo "  headed      - Run tests in headed mode (show browser)"
        echo ""
        echo "Examples:"
        echo "  ./e2e/run-tests.sh auth"
        echo "  ./e2e/run-tests.sh settings headed"
        echo "  ./e2e/run-tests.sh all"
        exit 1
        ;;
esac

echo ""
echo "✅ Test run complete!"
echo ""
echo "📊 View test report: npx playwright show-report"