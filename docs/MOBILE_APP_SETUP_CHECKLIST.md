# Mobile App Setup Checklist

**Project:** Financial Family Tracking Mobile  
**Repository:** `financial-family-tracking-mobile` (separate repo)  
**Date:** November 30, 2025

---

## 📋 Pre-Development Checklist

### 1. Repository Setup

- [ ] Create new GitHub repository: `financial-family-tracking-mobile`
- [ ] Set repository to Private initially
- [ ] Add README with project overview
- [ ] Add LICENSE (same as web version)
- [ ] Setup branch protection rules (main branch)
- [ ] Add .gitignore for React Native
- [ ] Setup GitHub Projects/Issues for task tracking

### 2. Account & Access Setup

- [ ] **Apple Developer Account**

  - [ ] Enroll ($99/year)
  - [ ] Create App ID
  - [ ] Setup provisioning profiles
  - [ ] Add team members

- [ ] **Google Play Console**

  - [ ] Register ($25 one-time)
  - [ ] Create app listing
  - [ ] Setup internal testing track
  - [ ] Add team members

- [ ] **Services**
  - [ ] Firebase project (Analytics, Crashlytics, FCM)
  - [ ] Sentry account (Error tracking)
  - [ ] CodeMagic/Bitrise account (CI/CD alternative)

### 3. Development Tools

- [ ] Install Node.js 18+ LTS
- [ ] Install React Native CLI: `npm install -g react-native-cli`
- [ ] Install Watchman: `brew install watchman` (macOS)
- [ ] **For iOS:**
  - [ ] Install Xcode 15+
  - [ ] Install CocoaPods: `sudo gem install cocoapods`
  - [ ] Setup Xcode Command Line Tools
- [ ] **For Android:**
  - [ ] Install Android Studio
  - [ ] Install Android SDK (API 24+)
  - [ ] Setup Android Emulator
  - [ ] Configure ANDROID_HOME environment variable

### 4. Backend Preparation

- [ ] Review existing API documentation
- [ ] Setup staging API endpoint
- [ ] Get API credentials (if separate for mobile)
- [ ] Test API endpoints with Postman
- [ ] Verify CORS settings for mobile
- [ ] Check rate limiting policies

---

## 🚀 Week 1: Project Initialization

### Day 1-2: Project Bootstrap

```bash
# 1. Create React Native project with TypeScript
npx react-native@latest init FinancialFamilyTracking \
  --template react-native-template-typescript

cd FinancialFamilyTracking

# 2. Initialize git (if not already)
git init
git remote add origin https://github.com/YOUR_ORG/financial-family-tracking-mobile.git

# 3. Create folder structure
mkdir -p src/{api,components,screens,navigation,hooks,store,utils,constants,types,assets}
mkdir -p src/components/{ui,transaction,budget,chart}
mkdir -p src/screens/{auth,dashboard,transactions,budgets,settings}
mkdir -p src/api/endpoints
```

**Checklist:**

- [ ] Project created successfully
- [ ] TypeScript configured
- [ ] Can run on iOS simulator
- [ ] Can run on Android emulator
- [ ] Git repository linked
- [ ] Folder structure created

### Day 3: Essential Dependencies

```bash
# Navigation
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context react-native-gesture-handler
cd ios && pod install && cd ..

# State Management
npm install zustand @tanstack/react-query axios

# Forms & Validation
npm install react-hook-form @hookform/resolvers zod

# Storage
npm install @react-native-async-storage/async-storage react-native-mmkv
npm install react-native-keychain

# UI Components
npm install react-native-paper react-native-vector-icons
npm install react-native-svg
```

**Checklist:**

- [ ] All dependencies installed
- [ ] iOS pods installed
- [ ] Android builds successfully
- [ ] No peer dependency warnings

### Day 4: Development Tools

```bash
# ESLint & Prettier
npm install -D eslint @react-native-community/eslint-config
npm install -D prettier eslint-config-prettier eslint-plugin-prettier

# Testing
npm install -D jest @testing-library/react-native @testing-library/jest-native
npm install -D @types/jest

# Git Hooks
npm install -D husky lint-staged
npx husky install
```

**Create Configuration Files:**

**.eslintrc.js:**

```javascript
module.exports = {
  root: true,
  extends: "@react-native-community",
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  rules: {
    "react-native/no-inline-styles": "warn",
    "@typescript-eslint/no-unused-vars": "error",
  },
};
```

**.prettierrc:**

```json
{
  "singleQuote": true,
  "trailingComma": "es5",
  "semi": true,
  "tabWidth": 2,
  "printWidth": 100
}
```

**Checklist:**

- [ ] ESLint configured
- [ ] Prettier configured
- [ ] Husky pre-commit hooks setup
- [ ] Can run tests

### Day 5: CI/CD Setup

**Create `.github/workflows/ci.yml`:**

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run lint
      - run: npm test

  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: actions/setup-java@v3
        with:
          distribution: "temurin"
          java-version: "17"
      - run: npm ci
      - run: cd android && ./gradlew assembleDebug

  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: cd ios && pod install
      - run: xcodebuild -workspace ios/FinancialFamilyTracking.xcworkspace -scheme FinancialFamilyTracking
```

**Checklist:**

- [ ] GitHub Actions configured
- [ ] Lint pipeline working
- [ ] Test pipeline working
- [ ] Build pipelines working

---

## 📱 Week 2: Core Setup

### Environment Configuration

**Create `.env.example`:**

```bash
# API Configuration
API_BASE_URL=https://api.financialfamily.com
API_STAGING_URL=https://staging-api.financialfamily.com
API_TIMEOUT=30000

# Feature Flags
ENABLE_BIOMETRIC=true
ENABLE_OFFLINE_MODE=true
ENABLE_CAMERA=true

# Analytics
FIREBASE_API_KEY=
FIREBASE_PROJECT_ID=
SENTRY_DSN=

# App Config
APP_VERSION=1.0.0
BUILD_NUMBER=1
```

**Install env support:**

```bash
npm install react-native-config
npm install -D @types/react-native-config
```

**Checklist:**

- [ ] Environment variables setup
- [ ] Separate dev/staging/prod configs
- [ ] Secrets not committed to git

### API Client Setup

**Create `src/api/client.ts`:**

```typescript
import axios from "axios";
import Config from "react-native-config";
import { getSecureToken } from "../utils/storage";

const apiClient = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: Number(Config.API_TIMEOUT),
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for auth token
apiClient.interceptors.request.use(async (config) => {
  const token = await getSecureToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh or logout
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

**Checklist:**

- [ ] API client configured
- [ ] Token management implemented
- [ ] Error interceptors setup
- [ ] Can make API calls

### Secure Storage

**Create `src/utils/storage.ts`:**

```typescript
import * as Keychain from "react-native-keychain";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export const saveSecureToken = async (token: string) => {
  await Keychain.setGenericPassword(TOKEN_KEY, token);
};

export const getSecureToken = async (): Promise<string | null> => {
  const credentials = await Keychain.getGenericPassword();
  return credentials ? credentials.password : null;
};

export const clearSecureToken = async () => {
  await Keychain.resetGenericPassword();
};

// Non-sensitive data
export const saveData = async (key: string, value: any) => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

export const getData = async (key: string) => {
  const value = await AsyncStorage.getItem(key);
  return value ? JSON.parse(value) : null;
};
```

**Checklist:**

- [ ] Keychain for tokens
- [ ] AsyncStorage for non-sensitive data
- [ ] Storage utilities tested

---

## 🎨 Week 2-3: UI Foundation

### Design System

**Create `src/constants/theme.ts`:**

```typescript
export const colors = {
  primary: "#3b82f6",
  secondary: "#8b5cf6",
  success: "#10b981",
  danger: "#ef4444",
  warning: "#f59e0b",
  info: "#06b6d4",

  background: "#ffffff",
  surface: "#f9fafb",
  text: "#1f2937",
  textSecondary: "#6b7280",
  border: "#e5e7eb",

  // Dark mode
  backgroundDark: "#111827",
  surfaceDark: "#1f2937",
  textDark: "#f9fafb",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
};
```

**Checklist:**

- [ ] Theme constants defined
- [ ] Color palette finalized
- [ ] Typography scale defined
- [ ] Spacing system defined

### Base Components

**Priority components to build:**

- [ ] Button
- [ ] Input/TextInput
- [ ] Card
- [ ] Modal
- [ ] Loading Spinner
- [ ] Empty State
- [ ] Error State
- [ ] List Item
- [ ] Badge
- [ ] Avatar

**Checklist:**

- [ ] All base components created
- [ ] Components documented
- [ ] Storybook/showcase page

---

## 📊 Progress Tracking

### Week 1 Status

- [ ] Project initialized
- [ ] Dependencies installed
- [ ] CI/CD configured
- [ ] Development environment ready

### Week 2 Status

- [ ] API client working
- [ ] Secure storage implemented
- [ ] Navigation structure defined
- [ ] Base components created

### Week 3-4 Status (Auth)

- [ ] Login screen complete
- [ ] Register screen complete
- [ ] Biometric auth working
- [ ] Token refresh implemented

### Week 5-6 Status (Dashboard)

- [ ] Dashboard layout complete
- [ ] Stats cards working
- [ ] Recent transactions list
- [ ] Navigation working

### Week 7-8 Status (Transactions)

- [ ] Transaction list with pagination
- [ ] Add transaction form
- [ ] Edit/Delete functionality
- [ ] Category/Wallet selectors

---

## 🔗 Integration Points with Web Backend

### API Endpoints to Verify

**Authentication:**

- [ ] POST `/api/auth/login`
- [ ] POST `/api/auth/register`
- [ ] POST `/api/auth/refresh`
- [ ] GET `/api/auth/me`

**Transactions:**

- [ ] GET `/api/transactions`
- [ ] POST `/api/transactions`
- [ ] PUT `/api/transactions/:id`
- [ ] DELETE `/api/transactions/:id`

**Wallets:**

- [ ] GET `/api/wallets`
- [ ] POST `/api/wallets`

**Categories:**

- [ ] GET `/api/categories`

**Budget:**

- [ ] GET `/api/budget`
- [ ] POST `/api/budget`

**Dashboard:**

- [ ] GET `/api/dashboard/stats`

---

## 🧪 Testing Strategy

### Unit Tests

- [ ] Utility functions (>90% coverage)
- [ ] Custom hooks (>80% coverage)
- [ ] Store/State management (>80% coverage)

### Integration Tests

- [ ] API client
- [ ] Navigation flows
- [ ] Form submissions

### E2E Tests (Detox)

- [ ] Login flow
- [ ] Add transaction flow
- [ ] View dashboard flow

---

## 📦 Build & Release Checklist

### iOS Release Preparation

- [ ] App icons (all sizes)
- [ ] Launch screen
- [ ] App Store listing
- [ ] Screenshots (all devices)
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] App Store Connect setup
- [ ] TestFlight beta testing

### Android Release Preparation

- [ ] App icons (all densities)
- [ ] Splash screen
- [ ] Play Store listing
- [ ] Screenshots (all devices)
- [ ] Privacy policy
- [ ] Signed APK/AAB
- [ ] Internal testing track
- [ ] Beta testing

---

## 🎯 Success Criteria

**Week 4 (MVP Checkpoint):**

- [ ] Users can login/register
- [ ] Users can view dashboard
- [ ] Users can add transactions
- [ ] App works on both iOS & Android
- [ ] No critical bugs

**Week 8 (Beta Launch):**

- [ ] All MVP features complete
- [ ] <70% test coverage
- [ ] Performance benchmarks met
- [ ] Ready for TestFlight/Internal Testing

**Week 16 (Production):**

- [ ] All features complete
- [ ] Security audit passed
- [ ] App Store approved
- [ ] Play Store approved
- [ ] Launch marketing ready

---

## 📞 Support & Resources

**Technical Support:**

- Backend Team: backend@financialfamily.com
- DevOps: devops@financialfamily.com
- Design: design@financialfamily.com

**Documentation:**

- Web API Docs: `/Users/telkom/project/financial-family-tracking/docs/`
- Mobile Docs: Will be in new repo
- Figma Designs: [Link to be added]

**Communication:**

- Daily Standup: 9:00 AM
- Sprint Planning: Every 2 weeks
- Demo: End of each sprint
- Retrospective: After each sprint

---

**Last Updated:** November 30, 2025  
**Next Review:** After Week 1 completion  
**Status:** Ready to Start 🚀
