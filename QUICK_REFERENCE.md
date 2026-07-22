# ProQuote Zambia Marketplace - Developer Quick Reference Card

## 🚀 Commands Cheat Sheet

### Setup (First Time)
```bash
# Install
npm install && cd backend && npm install && cd ..

# Environment
cp backend/.env.example backend/.env
# Edit: JWT_SECRET, ENCRYPTION_KEY

# Database
docker-compose up -d
cd backend && npm run migrations:run && cd ..
```

### Daily Development
```bash
# Start backend (Terminal 1)
cd backend && npm run start:dev

# Start frontend (Terminal 2)
npm run dev

# Both running = http://localhost:5173 (frontend) & http://localhost:3000 (backend)
```

### Code Quality
```bash
npm run lint              # Check errors
npm run lint:fix          # Fix errors
npm run type-check        # Check TypeScript
npm run test              # Run tests
npm run test:watch        # Watch mode
```

---

## 📁 Import Paths Quick Reference

### Backend Imports
```typescript
// Utilities
import { PaginationHelper, DateHelper } from '@/utils/helpers';
import { validateEmail, validatePrice } from '@/utils/validators';
import { ROLES, STATUSES } from '@/utils/constants';

// Services & Entities
import { AuthService } from '@/modules/auth/auth.service';
import { User } from '@/modules/users/user.entity';
import { EncryptionService } from '@/common/services/encryption.service';

// DTOs
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
```

### Frontend Imports
```typescript
// Components
import { Button, Card, Modal, Input } from '@/components/common';
import { InquiryList, InquiryCard } from '@/components/inquiry';

// Types
import type { User, UserRole } from '@/types/user.types';
import type { ApiResponse } from '@/types/api.types';

// Utilities
import { formatCurrency, formatDate } from '@/lib/formatters';
import { validateEmail, validatePassword } from '@/lib/validators';
import { API_BASE_URL, ROLES, ORDER_STATUSES } from '@/lib/constants';

// Hooks & Services
import { useAuth } from '@/hooks/useAuth';
import { useFetch } from '@/hooks/useFetch';
import { authService } from '@/services/auth/authService';
```

---

## 🏗️ Module Structure Template

```typescript
// Step 1: Create DTO (dto/create-modulename.dto.ts)
export class CreateModuleDto {
  @IsString() name: string;
  @IsEmail() email: string;
}

// Step 2: Create Entity (modulename.entity.ts)
@Entity('modulenames')
export class ModuleName { ... }

// Step 3: Create Service (services/modulename.service.ts)
@Injectable()
export class ModuleNameService {
  constructor(
    @InjectRepository(ModuleName)
    private repo: Repository<ModuleName>,
  ) {}
  async create(dto) { return this.repo.save(dto); }
}

// Step 4: Create Controller (controllers/modulename.controller.ts)
@Controller('modulenames')
export class ModuleNameController {
  constructor(private service: ModuleNameService) {}
  @Post() create(@Body() dto: CreateModuleDto) { 
    return this.service.create(dto); 
  }
}

// Step 5: Register in Module (modulename.module.ts)
@Module({
  imports: [TypeOrmModule.forFeature([ModuleName])],
  providers: [ModuleNameService],
  controllers: [ModuleNameController],
})
export class ModuleNameModule {}
```

---

## 🎯 Frontend Component Template

```typescript
// Step 1: Create Component (Component.tsx)
import { FC } from 'react';
import type { DataType } from '@/types';
import { Button, Card } from '@/components/common';

interface ComponentProps {
  data: DataType;
  onAction: () => void;
}

const Component: FC<ComponentProps> = ({ data, onAction }) => {
  return (
    <Card>
      <h2>{data.name}</h2>
      <Button onClick={onAction}>Action</Button>
    </Card>
  );
};

export default Component;

// Step 2: Export (index.ts in folder)
export { default as Component } from './Component';

// Step 3: Use in Parent
import { Component } from '@/components/featurename';
const MyPage = () => <Component data={someData} onAction={handler} />;
```

---

## 🔐 Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://tonse_user:tonse_pass@localhost:5432/tonse_db

# JWT Keys (Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your-32-char-secret
JWT_REFRESH_SECRET=your-32-char-refresh-secret

# Encryption (Must be 32 chars)
ENCRYPTION_KEY=your-32-character-key

# Server
NODE_ENV=development
APP_PORT=3000
```

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=ProQuote Zambia Marketplace
```

### Generate Keys
```bash
# JWT secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 32-char encryption key
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

---

## 🗄️ Database Tricks

### Connect to Database
```bash
# Via Docker
docker exec -it tonse-postgres psql -U tonse_user tonse_db

# Useful commands once connected
\dt                    # List tables
\d tablename           # Describe table
SELECT * FROM users;   # Query
\q                     # Quit
```

### Useful Queries
```sql
-- Count records
SELECT COUNT(*) as total FROM inquiries;

-- Find slow queries
EXPLAIN ANALYZE SELECT * FROM quotes WHERE status = 'PENDING';

-- Check index usage
SELECT * FROM pg_stat_user_indexes;

-- Recent records
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;
```

---

## 🧪 Testing Quick Reference

### Backend Test Example
```typescript
describe('QuotesService', () => {
  let service: QuotesService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [QuotesService],
    }).compile();
    service = module.get<QuotesService>(QuotesService);
  });

  it('should create a quote', async () => {
    const dto = { inquiryId: '123', price: 500 };
    const result = await service.create(dto);
    expect(result).toHaveProperty('id');
  });
});
```

### Frontend Test Example
```typescript
import { render, screen } from '@testing-library/react';
import QuoteCard from '@/components/quote/QuoteCard';

it('should display quote price', () => {
  render(<QuoteCard quote={{ ...mockQuote, price: 500 }} />);
  expect(screen.getByText('500')).toBeInTheDocument();
});
```

---

## 🐛 Quick Debugging

### Issue: Port in Use
```bash
# Find process
lsof -i :3000
# Kill it
kill -9 <PID>
```

### Issue: Module Not Found
```bash
# Clear & reinstall
rm -rf node_modules
npm install
```

### Issue: TypeScript Errors
```bash
# Type check
npm run type-check
# Fix errors
npm run lint:fix
```

### Issue: Database Connection
```bash
# Check Docker
docker ps
# View logs
docker logs tonse-postgres
```

---

## 📊 Database Pagination

### Backend Service
```typescript
async findAll(page = 1, limit = 20) {
  const [items, total] = await this.repo.findAndCount({
    skip: (page - 1) * limit,
    take: limit,
    order: { createdAt: 'DESC' },
  });
  return {
    data: items,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  };
}
```

### Frontend Hook
```typescript
const { data: items, meta } = useFetch(`/api/items?page=${page}&limit=${20}`);

return (
  <>
    {items?.map(item => <Item key={item.id} data={item} />)}
    <Pagination 
      current={meta?.page} 
      total={meta?.pages} 
      onChange={setPage}
    />
  </>
);
```

---

## 🔄 Async Data Patterns

### Pattern 1: useFetch Hook
```typescript
const { data, loading, error } = useFetch('/api/inquiries');

if (loading) return <Loading />;
if (error) return <Error msg={error} />;
return <List items={data} />;
```

### Pattern 2: Service + State
```typescript
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(false);

const load = async () => {
  setLoading(true);
  try {
    const data = await inquiryService.getAll();
    setItems(data);
  } finally {
    setLoading(false);
  }
};

useEffect(() => load(), []);
```

---

## 🎨 Common Component Props

### Button Component
```typescript
<Button 
  variant="primary" | "secondary" | "danger"
  size="small" | "medium" | "large"
  loading={boolean}
  disabled={boolean}
  onClick={handler}
>
  Label
</Button>
```

### Card Component
```typescript
<Card 
  title="Title"
  subtitle="Subtitle"
  icon={React.ReactNode}
  footer={React.ReactNode}
>
  Content
</Card>
```

### Modal Component
```typescript
<Modal 
  isOpen={boolean}
  title="Title"
  onClose={handler}
  actions={[
    { label: 'Cancel', onClick: onCancel },
    { label: 'Save', onClick: onSave },
  ]}
>
  Content
</Modal>
```

### Input Component
```typescript
<Input 
  type="text" | "email" | "password" | "number"
  value={string}
  onChange={handler}
  placeholder="Text"
  error={string}
  disabled={boolean}
/>
```

---

## 🔑 Global State Patterns

### Using Context Hook
```typescript
// In component
const { user, login, logout } = useAuth();

if (user) {
  return <p>Welcome {user.name} <button onClick={logout}>Logout</button></p>;
}
return <LoginForm onSubmit={login} />;
```

### Access & Refresh Tokens
```typescript
// Login response
{ accessToken, refreshToken, user }

// Store
localStorage.setItem('token', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// Use in API calls
Authorization: `Bearer ${token}`

// Auto-refresh
if (error.status === 401) {
  const newToken = await authService.refresh();
  localStorage.setItem('token', newToken);
  // Retry request
}
```

---

## ⚠️ Common Mistakes to Avoid

```typescript
// ❌ Bad: Unmemoized component re-renders on parent update
export const QuoteCard = ({ quote }) => ...;

// ✅ Good: Memoized to prevent unnecessary re-renders
export const QuoteCard = memo(({ quote }) => ...);

// ❌ Bad: Async operation without cleanup
useEffect(() => {
  fetchData(); // Memory leak!
}, []);

// ✅ Good: Cleanup on unmount
useEffect(() => {
  let mounted = true;
  fetchData().then(data => mounted && setData(data));
  return () => { mounted = false; };
}, []);

// ❌ Bad: Direct mutation
state.items[0].name = 'new';

// ✅ Good: Immutable update
setState(prev => [
  { ...prev[0], name: 'new' },
  ...prev.slice(1),
]);
```

---

## 📞 Documentation Links

| Topic | File |
|-------|------|
| Getting Started | [QUICK_START.md](QUICK_START.md) |
| Imports & Setup | [SETUP_AND_IMPORTS.md](SETUP_AND_IMPORTS.md) |
| Architecture | [ARCHITECTURE_AND_DEPENDENCIES.md](ARCHITECTURE_AND_DEPENDENCIES.md) |
| Workflows | [DEVELOPER_WORKFLOW.md](DEVELOPER_WORKFLOW.md) |
| Database | [DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md) |
| Testing | [API_TESTING.md](API_TESTING.md) |
| Folders | [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md) |

---

## ✅ Pre-Commit Checklist

- [ ] npm run lint:fix (format code)
- [ ] npm run type-check (no TS errors)
- [ ] npm run test (tests pass)
- [ ] Changes documented
- [ ] No console.log() left
- [ ] No TODO comments
- [ ] Commit message is clear

---

**Remember**: When stuck, check the documentation files or search the codebase for similar patterns!

**Last Updated**: 2024 | **Version**: 1.0.0

