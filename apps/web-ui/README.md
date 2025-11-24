# FarmTrace Web UI

Modern, responsive web interface for FarmTrace Supply Chain Blockchain system.

## 🎨 Tech Stack

- **React 18** - UI framework
- **Vite 5** - Build tool and dev server
- **Tailwind CSS 3** - Utility-first CSS framework
- **React Router v6** - Client-side routing
- **React Query** - Server state management
- **Zustand** - Client state management
- **Axios** - HTTP client
- **Recharts** - Data visualization
- **Lucide React** - Icon library
- **date-fns** - Date utilities
- **QRCode.react** - QR code generation
- **react-hot-toast** - Toast notifications

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- FarmTrace blockchain network running on `localhost:3000` (API Gateway)

### Installation

```bash
# Navigate to web-ui directory
cd apps/web-ui

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

The application will be available at `http://localhost:3001`

### Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=FarmTrace Supply Chain
VITE_ENABLE_MOCK=false
```

## 📁 Project Structure

```
src/
├── components/
│   ├── layouts/          # Layout components (AuthLayout, MainLayout)
│   └── navigation/       # Navigation components (Sidebar, Header)
├── pages/
│   ├── auth/            # Authentication pages (SelectOrganization)
│   ├── manufacturer/    # Manufacturer dashboard
│   ├── shipper/         # Shipper dashboard
│   ├── warehouse/       # Warehouse dashboard
│   ├── retailer/        # Retailer dashboard
│   ├── products/        # Product pages (List, Detail, Create)
│   └── handovers/       # Handover pages (List, Detail)
├── lib/
│   └── api.js           # API client and endpoints
├── store/
│   └── index.js         # Zustand stores (org, notifications, UI, filters)
├── App.jsx              # Main app component with routing
├── main.jsx             # App entry point
└── index.css            # Global styles and Tailwind imports
```

## 🎭 Organization Roles

The system supports 4 organizations with role-based access:

### 1. Manufacturer (Green Theme)
- Create new products
- Initiate handovers to shippers
- View product history
- Track pending handovers

### 2. Shipper (Blue Theme)
- Accept/reject handover requests
- Manage shipments in transit
- Update shipment status
- Track deliveries

### 3. Warehouse (Orange Theme)
- Receive products from shippers
- Manage inventory
- Confirm product receipt
- Track warehouse operations

### 4. Retailer (Purple Theme)
- Receive products from warehouse
- Mark products as sold
- View product traceability
- Manage retail inventory

## 🔑 Key Features

### Dashboard
- Organization-specific metrics and KPIs
- Real-time pending handover alerts
- Recent products list
- Quick action buttons

### Product Management
- Create products (Manufacturer only)
- View product details with full history
- QR code generation for each product
- Product status tracking (Created → InTransit → Received → Sold)
- Blockchain history timeline

### Handover Workflow
- Two-step approval process:
  1. Sender initiates handover
  2. Receiver accepts/rejects with signature
- Status tracking (PENDING/ACCEPTED/REJECTED)
- Digital signature capture
- Rejection reason documentation
- Real-time status updates

### Product Traceability
- Complete ownership transfer history
- Approval trail with signatures
- Timestamps for all transactions
- Visual timeline of product journey

### Search & Filtering
- Search products by ID or name
- Filter by status (Created, InTransit, Received, Sold)
- Filter handovers by status (PENDING, ACCEPTED, REJECTED)
- Advanced search capabilities

### Responsive Design
- Mobile-first approach
- Works on tablets, phones, and desktops
- Collapsible sidebar
- Touch-friendly UI elements

## 🎨 Color Scheme

Each organization has a distinct color theme:

```javascript
manufacturer: '#10b981' // Green
shipper:      '#3b82f6' // Blue
warehouse:    '#f59e0b' // Orange
retailer:     '#8b5cf6' // Purple
```

## 🔌 API Integration

The UI connects to the Node.js API Gateway (`localhost:3000`) with the following endpoints:

### Products API
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get product by ID
- `GET /api/products` - List all products
- `GET /api/products/:id/history` - Get product history
- `PATCH /api/products/:id/status` - Update status

### Handovers API
- `POST /api/handovers/request-shipper` - Request handover
- `GET /api/handovers/pending?organization={org}` - Get pending handovers
- `POST /api/handovers/:id/accept` - Accept handover
- `POST /api/handovers/:id/reject` - Reject handover
- `GET /api/handovers/:id` - Get handover details
- `GET /api/handovers` - List all handovers

### Health Check
- `GET /api/health` - API health status

## 🛠️ Development

### Available Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Format code
npm run format
```

### Adding New Pages

1. Create component in `src/pages/{section}/{PageName}.jsx`
2. Add route in `src/App.jsx`
3. Update navigation in `src/components/navigation/Sidebar.jsx`

### State Management

**Zustand Stores:**
- `useOrgStore` - Selected organization and role
- `useNotificationStore` - Toast notifications and alerts
- `useUIStore` - UI state (sidebar, theme)
- `useProductFilterStore` - Product filter state

**React Query:**
- Server state caching
- Automatic refetching
- Optimistic updates
- Error handling

## 🔒 Security Features

1. **Organization-based Access Control**
   - Role selection at login
   - Organization context in API headers
   - Protected routes by organization

2. **Digital Signatures**
   - Required for handover approval/rejection
   - Stored in blockchain for audit trail

3. **Blockchain Verification**
   - All transactions verified by blockchain
   - Immutable audit trail
   - Cryptographic proof of ownership

## 📱 Responsive Breakpoints

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## 🧪 Testing

```bash
# Run unit tests (when implemented)
npm run test

# Run E2E tests (when implemented)
npm run test:e2e
```

## 🚢 Production Build

```bash
# Build optimized production bundle
npm run build

# Output directory: dist/

# Deploy with any static hosting:
# - Vercel
# - Netlify
# - AWS S3 + CloudFront
# - Nginx
```

## 📊 Performance Optimizations

- Code splitting with React.lazy
- Route-based code splitting
- Image optimization
- Lazy loading of components
- React Query caching
- Tailwind CSS purging in production

## 🔧 Configuration

### Vite Config (`vite.config.js`)
- Port: 3001
- API Proxy: `/api` → `http://localhost:3000`
- Path alias: `@/` → `src/`

### Tailwind Config (`tailwind.config.js`)
- Custom colors for 4 organizations
- Custom animation (pulse-slow)
- Extended color palette

## 📄 License

Part of FarmTrace Supply Chain Blockchain System

## 🤝 Contributing

1. Follow React best practices
2. Use functional components with hooks
3. Follow Tailwind CSS conventions
4. Write descriptive commit messages
5. Test thoroughly before committing

## 📞 Support

For issues or questions:
- Check API Gateway logs: `docker logs <gateway-container>`
- Check blockchain network status: `docker ps`
- Review browser console for errors
- Verify API connectivity at `http://localhost:3000/api/health`

---

**Built with ❤️ for transparent supply chains**
