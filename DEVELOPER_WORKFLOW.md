# Nyuwe Zambia Marketplace - Developer Workflow Guide

## 🎯 Common Development Workflows

### ✅ Workflow 1: Adding a New API Endpoint

**Scenario**: Your team needs to add a new endpoint to fetch quotes by inquiry ID.

**Step 1: Create DTO** (`backend/src/modules/quotes/dto/query-quotes.dto.ts`)
```typescript
import { IsString, IsOptional, Min, Max } from 'class-validator';

export class QueryQuotesDto {
  @IsString()
  inquiryId: string;

  @IsOptional()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

**Step 2: Update Service** (`backend/src/modules/quotes/services/quotes.service.ts`)
```typescript
async findByInquiry(inquiryId: string, page: number, limit: number) {
  const [data, total] = await this.quoteRepository.findAndCount({
    where: { inquiryId },
    skip: (page - 1) * limit,
    take: limit,
    order: { createdAt: 'DESC' },
  });

  return {
    data,
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
}
```

**Step 3: Add Controller Method** (`backend/src/modules/quotes/controllers/quotes.controller.ts`)
```typescript
@Get('inquiry/:inquiryId')
@UseGuards(JwtAuthGuard)
async findByInquiry(
  @Param('inquiryId') inquiryId: string,
  @Query() query: QueryQuotesDto,
) {
  return this.quotesService.findByInquiry(
    inquiryId,
    query.page,
    query.limit,
  );
}
```

**Step 4: Test in Postman**
```
GET http://localhost:3000/api/quotes/inquiry/inq-123?page=1&limit=20
Headers: Authorization: Bearer YOUR_JWT_TOKEN
```

---

### ✅ Workflow 2: Adding a New React Component

**Scenario**: Create a new "QuoteComparison" component to compare two quotes side-by-side.

**Step 1: Create Component** (`src/components/quote/QuoteComparison.tsx`)
```typescript
import { FC } from 'react';
import type { Quote } from '@/types/quote.types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Button, Card } from '@/components/common';

interface QuoteComparisonProps {
  quote1: Quote;
  quote2: Quote;
  onSelect: (quoteId: string) => void;
}

const QuoteComparison: FC<QuoteComparisonProps> = ({ 
  quote1, 
  quote2, 
  onSelect 
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <h3 className="font-bold">{quote1.providerName}</h3>
        <p className="text-2xl font-bold text-blue-600">
          {formatCurrency(quote1.price)}
        </p>
        <p className="text-sm text-gray-600">
          Quote on {formatDate(quote1.createdAt)}
        </p>
        <Button 
          onClick={() => onSelect(quote1.id)}
          variant="primary"
          className="mt-4 w-full"
        >
          Select Quote
        </Button>
      </Card>

      <Card>
        <h3 className="font-bold">{quote2.providerName}</h3>
        <p className="text-2xl font-bold text-blue-600">
          {formatCurrency(quote2.price)}
        </p>
        <p className="text-sm text-gray-600">
          Quote on {formatDate(quote2.createdAt)}
        </p>
        <Button 
          onClick={() => onSelect(quote2.id)}
          variant="primary"
          className="mt-4 w-full"
        >
          Select Quote
        </Button>
      </Card>
    </div>
  );
};

export default QuoteComparison;
```

**Step 2: Export from Index** (`src/components/quote/index.ts`)
```typescript
export { default as QuoteComparison } from './QuoteComparison';
```

**Step 3: Use in Page**
```typescript
import { QuoteComparison } from '@/components/quote';

// In your component
<QuoteComparison 
  quote1={quotes[0]} 
  quote2={quotes[1]} 
  onSelect={handleSelectQuote}
/>
```

---

### ✅ Workflow 3: Adding Validation

**Scenario**: Add email validation to ensure valid user emails.

**Step 1: Backend Validation** - Use `class-validator` in DTO
```typescript
import { IsEmail, MinLength, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(50)
  password: string;

  @MinLength(2)
  @MaxLength(50)
  name: string;
}
```

**Step 2: Frontend Validation** - Use custom validators
```typescript
import { validateEmail, validatePassword } from '@/lib/validators';
import { useForm } from '@/hooks/useForm';

const MyForm = () => {
  const { values, errors, handleChange, handleSubmit } = useForm({
    initialValues: { email: '', password: '' },
    validate: (values) => {
      const newErrors: Record<string, string> = {};
      
      if (!validateEmail(values.email)) {
        newErrors.email = 'Invalid email address';
      }
      
      if (!validatePassword(values.password)) {
        newErrors.password = 'Password must include uppercase, lowercase, number, and special char';
      }
      
      return newErrors;
    },
    onSubmit: async (values) => {
      await authService.register(values);
    },
  });

  return (
    <form onSubmit={handleSubmit}>
      <Input 
        name="email"
        value={values.email}
        onChange={handleChange}
        error={errors.email}
      />
      <Input 
        name="password"
        type="password"
        value={values.password}
        onChange={handleChange}
        error={errors.password}
      />
      <Button type="submit">Register</Button>
    </form>
  );
};
```

---

### ✅ Workflow 4: Async Data Fetching

**Scenario**: Fetch a list of quotes with loading and error handling.

**Method 1: Custom Hook**
```typescript
// src/hooks/useFetch.ts
import { useState, useEffect } from 'react';

export function useFetch<T>(
  url: string,
  options?: RequestInit
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error('Fetch failed');
        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url, options]);

  return { data, loading, error };
}

// Usage in component
import { useFetch } from '@/hooks/useFetch';

const QuotesList = ({ inquiryId }: { inquiryId: string }) => {
  const { data: quotes, loading, error } = useFetch(
    `/api/quotes/inquiry/${inquiryId}`
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {quotes?.map(quote => (
        <QuoteCard key={quote.id} quote={quote} />
      ))}
    </div>
  );
};
```

**Method 2: Service Layer**
```typescript
// src/services/api/quoteService.ts
import axios from 'axios';
import { API_BASE_URL } from '@/lib/constants';

export const quoteService = {
  async getByInquiry(inquiryId: string, page: number = 1) {
    const { data } = await axios.get(
      `${API_BASE_URL}/quotes/inquiry/${inquiryId}?page=${page}`
    );
    return data;
  },

  async create(dto: any) {
    const { data } = await axios.post(`${API_BASE_URL}/quotes`, dto);
    return data;
  },

  async update(id: string, dto: any) {
    const { data } = await axios.put(`${API_BASE_URL}/quotes/${id}`, dto);
    return data;
  },

  async delete(id: string) {
    await axios.delete(`${API_BASE_URL}/quotes/${id}`);
  },
};

// Usage
const handleFetchQuotes = async () => {
  try {
    const quotes = await quoteService.getByInquiry(inquiryId);
    setQuotes(quotes);
  } catch (error) {
    setError(error instanceof Error ? error.message : 'Unknown error');
  }
};
```

---

### ✅ Workflow 5: State Management with Context

**Scenario**: Manage user authentication state globally.

**Step 1: Create Context** (`src/context/auth/AuthContext.tsx`)
```typescript
import { createContext, useContext, useState, ReactNode } from 'react';
import type { User } from '@/types/user.types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);
      setUser(response.user);
      localStorage.setItem('token', response.accessToken);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  const register = async (userData: any) => {
    const response = await authService.register(userData);
    setUser(response.user);
    localStorage.setItem('token', response.accessToken);
  };

  return (
    <AuthContext.Provider 
      value={{ user, isAuthenticated: !!user, login, logout, register }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

**Step 2: Wrap App** (`src/App.tsx`)
```typescript
import { AuthProvider } from '@/context/auth/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Your routes */}
      </Routes>
    </AuthProvider>
  );
}
```

**Step 3: Use Hook** (Any component)
```typescript
import { useAuth } from '@/context/auth/AuthContext';

function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div>
      <h1>Welcome {user?.name}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

---

### ✅ Workflow 6: Database Queries with TypeORM

**Scenario**: Query inquiries with advanced filtering.

**Step 1: Build Query**
```typescript
// In InquiriesService
async findByFilters(filters: {
  category?: string;
  status?: string;
  buyerId?: string;
  page?: number;
  limit?: number;
}) {
  let query = this.inquiryRepository.createQueryBuilder('inquiry');

  if (filters.category) {
    query = query.where('inquiry.category = :category', { 
      category: filters.category 
    });
  }

  if (filters.status) {
    query = query.where('inquiry.status = :status', { 
      status: filters.status 
    });
  }

  if (filters.buyerId) {
    query = query.where('inquiry.buyerId = :buyerId', { 
      buyerId: filters.buyerId 
    });
  }

  // Pagination
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  query = query.skip((page - 1) * limit).take(limit);

  // Relations
  query = query.leftJoinAndSelect('inquiry.buyer', 'buyer');

  // Order
  query = query.orderBy('inquiry.createdAt', 'DESC');

  const [data, total] = await query.getManyAndCount();

  return {
    data,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  };
}
```

**Step 2: Use in Controller**
```typescript
@Get()
async findByFilters(@Query() filters: QueryInquiriesDto) {
  return this.inquiriesService.findByFilters({
    category: filters.category,
    status: filters.status,
    page: filters.page,
    limit: filters.limit,
  });
}
```

---

### ✅ Workflow 7: Error Handling

**Backend: Custom Exceptions**
```typescript
// src/common/exceptions/business.exception.ts
export class BusinessException extends HttpException {
  constructor(message: string, statusCode: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, statusCode);
  }
}

// Usage in service
if (!inquiry) {
  throw new BusinessException('Inquiry not found', HttpStatus.NOT_FOUND);
}

if (!user.isVerified) {
  throw new BusinessException('User not verified', HttpStatus.FORBIDDEN);
}
```

**Frontend: Error Boundaries**
```typescript
// src/components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 bg-red-100 text-red-700 rounded">
            <h2>Something went wrong</h2>
            <p>{this.state.error?.message}</p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

---

## 📋 Checklist: Launching a New Feature

- [ ] Requirement Analysis
  - [ ] Document user stories
  - [ ] Define acceptance criteria
  - [ ] Plan database schema changes

- [ ] Backend Development
  - [ ] Create DTOs for validation
  - [ ] Define/update entities
  - [ ] Implement service methods
  - [ ] Add controller routes
  - [ ] Write unit tests
  - [ ] Add API documentation

- [ ] Frontend Development
  - [ ] Design component hierarchy
  - [ ] Create components
  - [ ] Implement state management
  - [ ] Add validation
  - [ ] Write integration with API
  - [ ] Test on multiple screen sizes

- [ ] Testing
  - [ ] Unit tests (backend services)
  - [ ] Component tests (frontend)
  - [ ] Integration tests (API endpoints)
  - [ ] E2E tests (full user flow)

- [ ] Code Review
  - [ ] Backend code review
  - [ ] Frontend code review
  - [ ] Database review
  - [ ] Security review

- [ ] Deployment
  - [ ] Merge to main branch
  - [ ] Deploy to staging
  - [ ] QA testing
  - [ ] Deploy to production
  - [ ] Monitor logs

---

## 🔍 Debugging Tips

### Backend Debugging
```typescript
// Add detailed logging
import { Logger } from '@nestjs/common';

export class QuotesService {
  private logger = new Logger(QuotesService.name);

  async create(dto: CreateQuoteDto) {
    this.logger.debug('Creating quote with data:', dto);
    
    try {
      const quote = await this.quoteRepository.save(dto);
      this.logger.log(`Quote created with ID: ${quote.id}`);
      return quote;
    } catch (error) {
      this.logger.error('Error creating quote:', error);
      throw error;
    }
  }
}

// View logs
npm run dev | grep "error\|Error\|ERROR"
```

### Frontend Debugging
```typescript
// React DevTools
// 1. Install browser extension
// 2. F12 → Components tab
// 3. Inspect component state & props

// Console logging
console.log('Before:', data);
console.error('Error:', error);
console.table(arrayOfObjects);

// Debugger statement
debugger; // Code execution pauses here in DevTools
```

### Database Debugging
```bash
# Connect to PostgreSQL
docker exec -it tonse-postgres psql -U tonse_user tonse_db

# Useful commands
\dt                    # List tables
\d tablename           # Describe table
SELECT * FROM users;   # Query
EXPLAIN ANALYZE SELECT * FROM users; # Query plan
```

---

## Performance Optimization Tips

### Backend
```typescript
// ✅ Good: Select only needed fields
.select(['inquiry.id', 'inquiry.title', 'buyer.name'])

// ❌ Bad: Select all
.select('inquiry')

// ✅ Good: Use pagination
.skip((page - 1) * limit).take(limit)

// ❌ Bad: Fetch all records
// No pagination

// ✅ Good: Use indexes
WHERE status = 'OPEN' AND category = 'Electronics'

// ❌ Bad: Complex queries without indexes
WHERE EXTRACT(YEAR FROM createdAt) = 2024
```

### Frontend
```typescript
// ✅ Good: Memoize components
import { memo } from 'react';
export const QuoteCard = memo(...)

// ❌ Bad: Unnecessary re-renders
export const QuoteCard = (props) => {

// ✅ Good: Lazy load routes
const Dashboard = lazy(() => import('@/pages/Dashboard'))

// ❌ Bad: Import all pages upfront
import Dashboard from '@/pages/Dashboard'
```

---

**Last Updated**: 2024 | **Version**: 1.0.0
