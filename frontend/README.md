# AI Log Analysis Frontend

React frontend for the AI Log Analysis application with authentication integration.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v8 or higher)
- Running backend server on http://localhost:8000

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   - Navigate to http://localhost:3000
   - You should see the AI Log Analysis homepage

### Building for Production

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── Dashboard.jsx    # Main dashboard
│   │   ├── Home.jsx         # Landing page
│   │   ├── Login.jsx        # Login form
│   │   ├── Register.jsx     # Registration form
│   │   ├── Navbar.jsx       # Navigation bar
│   │   └── ProtectedRoute.jsx # Route protection
│   ├── contexts/
│   │   └── AuthContext.jsx  # Authentication state management
│   ├── services/
│   │   └── api.js           # API service for backend communication
│   ├── App.jsx              # Main app component with routing
│   ├── main.jsx             # React entry point
│   └── index.css            # Global styles
├── index.html               # HTML template
├── vite.config.js           # Vite configuration
└── package.json             # Dependencies and scripts
```

## 🔧 Features

### Authentication
- **User Registration:** Create new accounts with username, email, password
- **User Login:** Secure login with JWT tokens
- **Protected Routes:** Dashboard access requires authentication
- **Auto-logout:** Handles token expiration automatically

### UI Components
- **Responsive Design:** Mobile-friendly interface
- **Modern Styling:** Clean, professional appearance
- **Loading States:** User feedback during API calls
- **Error Handling:** Clear error messages for users

### API Integration
- **Axios HTTP Client:** Configured for backend communication
- **Token Management:** Automatic token inclusion in requests
- **Error Interceptors:** Handles authentication failures gracefully

## 🎯 React Concepts Used

### State Management
- **React Context:** Global authentication state
- **useState Hook:** Local component state
- **useEffect Hook:** Side effects and lifecycle management

### Routing
- **React Router:** Client-side routing
- **Protected Routes:** Authentication-based navigation
- **Navigation:** Programmatic route changes

### Components
- **Functional Components:** Modern React approach
- **Custom Hooks:** Reusable state logic
- **Props and Children:** Component composition

## 🔗 API Endpoints

The frontend integrates with these backend endpoints:

- `POST /auth/token` - User login
- `POST /auth/users` - User registration
- `GET /auth/user` - Get current user info
- `GET /auth/users` - Get all users

## 🎨 Styling

- **CSS Custom Properties:** Consistent design system
- **Flexbox & Grid:** Modern layout techniques
- **Responsive Design:** Mobile-first approach
- **Component-based Styles:** Scoped styling patterns

## 🔒 Security Features

- **JWT Token Storage:** Secure token management
- **Protected Routes:** Authentication-required pages
- **CORS Configuration:** Cross-origin request handling
- **Input Validation:** Form validation and sanitization

## 🛠️ Development Tips

### For React Beginners:

1. **Start with Components:** Each .jsx file is a reusable component
2. **Understand State:** React re-renders when state changes
3. **Learn Hooks:** useState and useEffect are essential
4. **Practice Routing:** Understanding navigation between pages
5. **API Integration:** How frontend communicates with backend

### Common Patterns:

- **Conditional Rendering:** Show different UI based on state
- **Event Handling:** Responding to user interactions
- **Form Management:** Handling user input and validation
- **Loading States:** Providing feedback during async operations

## 🚨 Troubleshooting

### Common Issues:

1. **Backend Connection:** Ensure backend is running on port 8000
2. **CORS Errors:** Check vite.config.js proxy settings
3. **Token Issues:** Clear localStorage if authentication fails
4. **Dependencies:** Run `npm install` if modules are missing

### Development Commands:

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎉 Next Steps

1. **Test the Authentication:** Register a new user and login
2. **Explore the Dashboard:** See the main application interface
3. **Customize Styling:** Modify CSS to match your preferences
4. **Add Features:** Extend functionality as needed
5. **Deploy:** Prepare for production deployment

Happy coding! 🚀