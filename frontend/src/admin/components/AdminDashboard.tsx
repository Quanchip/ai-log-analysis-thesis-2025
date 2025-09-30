import { useAuth } from '../../contexts/AuthContext';

const AdminDashboard = () => {
    const { user } = useAuth();

    return (
        <div style={{ padding: '20px' }}>
            <h1>Hello World</h1>
            <p>Welcome Admin: {user?.username}</p>
            <p>Role: {user?.role}</p>
        </div>
    );
};

export default AdminDashboard;