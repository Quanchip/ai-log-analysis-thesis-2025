import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

const AdminDashboard = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([])

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const token = localStorage.getItem("access_token");
                const response = await fetch("http://localhost:8000/auth/admin/users", {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    }
                });
                if (!response.ok) {
                    throw new Error("Failed to fetch users");
                }
                const data: User[] = await response.json();
                setUsers(data);
                console.log(data)
            } catch (error) {
                console.log (error)
            }
        }
        fetchUsers();
    } ,[])

    return (
        <div style={{ padding: '20px' }}>
            <p>Welcome Admin: {user?.username}</p>
            <p>Role: {user?.role}</p>

            <table style={{ marginTop: "1rem", borderCollapse: "collapse", width: "100%" }}>
                <thead>
                    <tr>
                        <th style={{ border: "1px solid #ddd", padding: "8px" }}>ID</th>
                        <th style={{ border: "1px solid #ddd", padding: "8px" }}>Username</th>
                        <th style={{ border: "1px solid #ddd", padding: "8px" }}>Email</th>
                        <th style={{ border: "1px solid #ddd", padding: "8px" }}>Role</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((u) => (
                        <tr key={u.id}>
                            <td style={{ border: "1px solid #ddd", padding: "8px" }}>{u.id}</td>
                            <td style={{ border: "1px solid #ddd", padding: "8px" }}>{u.username}</td>
                            <td style={{ border: "1px solid #ddd", padding: "8px" }}>{u.email}</td>
                            <td style={{ border: "1px solid #ddd", padding: "8px" }}>{u.role}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminDashboard;