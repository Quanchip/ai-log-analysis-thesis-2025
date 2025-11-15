import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface User {
    id: number;
    username: string;
    email: string;
    role: string;
}

interface LogFilesStats {
    total_files: number;
    total_size_bytes: number;
    total_size_mb: number;
}

interface UploadsByDate {
    date: string;
    count: number;
}

type ActiveTab = 'users' | 'files';


const AdminDashboard = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([])
    const [activeTab, setActiveTab] = useState<ActiveTab>('users');
    const [logFiles, setLogFiles] = useState<LogFilesStats>({
        total_files: 0,
        total_size_bytes: 0,
        total_size_mb: 0
    });
    const [uploadsByDate, setUploadsByDate] = useState<UploadsByDate[]>([]);


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
                console.log(error)
            }
        }
        fetchUsers();
    }, [])

    useEffect(() => {
        const fetchLogStats = async () => {
            try {
                const token = localStorage.getItem("access_token");
                const response = await fetch("http://localhost:8000/api/logs/logs-size", {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    }
                });
                if (!response.ok) {
                    throw new Error("Failed to fetch log files");
                }
                const data: LogFilesStats = await response.json();
                setLogFiles(data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchLogStats();
    }, [])

    useEffect(() => {
        const fetchUploadsByDate = async () => {
            try {
                const token = localStorage.getItem("access_token");
                const response = await fetch("http://localhost:8000/api/logs/uploads-by-date?days=30", {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    }
                });
                if (!response.ok) {
                    throw new Error("Failed to fetch uploads by date");
                }
                const data: UploadsByDate[] = await response.json();
                setUploadsByDate(data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchUploadsByDate();
    }, [])

    const renderContent = () => {
        switch (activeTab) {
            case 'users':
                return (
                    <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
                            <h3 style={{ margin: '0', fontSize: '18px', fontWeight: '600' }}>User Information</h3>
                            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>Total users: {users.length}</p>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f9fafb' }}>
                                        <th style={{ padding: "12px 16px", textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>ID</th>
                                        <th style={{ padding: "12px 16px", textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Username</th>
                                        <th style={{ padding: "12px 16px", textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Email</th>
                                        <th style={{ padding: "12px 16px", textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Role</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr key={u.id} style={{ borderBottom: '1px solid #e5e7eb', transition: 'background-color 0.15s' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                            <td style={{ padding: "12px 16px", fontSize: '14px', color: '#6b7280' }}>{u.id}</td>
                                            <td style={{ padding: "12px 16px", fontSize: '14px', color: '#111827', fontWeight: '500' }}>{u.username}</td>
                                            <td style={{ padding: "12px 16px", fontSize: '14px', color: '#6b7280' }}>{u.email}</td>
                                            <td style={{ padding: "12px 16px" }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    backgroundColor: u.role === 'admin' ? '#dbeafe' : '#f3f4f6',
                                                    color: u.role === 'admin' ? '#1e40af' : '#374151'
                                                }}>
                                                    {u.role}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'files':
                return (
                    <div>
                        {/* Statistics Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                            {/* Total Files Card */}
                            <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Total Files</p>
                                        <h3 style={{ margin: '0', fontSize: '32px', fontWeight: '700', color: '#111827' }}>{logFiles.total_files}</h3>
                                    </div>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px',
                                        backgroundColor: '#dbeafe',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '24px'
                                    }}>
                                        📁
                                    </div>
                                </div>
                            </div>

                            {/* Total Size (MB) Card */}
                            <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Total Size</p>
                                        <h3 style={{ margin: '0', fontSize: '32px', fontWeight: '700', color: '#111827' }}>{logFiles.total_size_mb.toFixed(2)}</h3>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>MB</p>
                                    </div>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px',
                                        backgroundColor: '#dcfce7',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '24px'
                                    }}>
                                        💾
                                    </div>
                                </div>
                            </div>

                            {/* Total Size (Bytes) Card */}
                            <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Total Size</p>
                                        <h3 style={{ margin: '0', fontSize: '32px', fontWeight: '700', color: '#111827' }}>{logFiles.total_size_bytes.toLocaleString()}</h3>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>Bytes</p>
                                    </div>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px',
                                        backgroundColor: '#fef3c7',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '24px'
                                    }}>
                                        📊
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* File Management Info Panel */}
                        <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '24px' }}>
                            <div style={{ padding: '20px' }}>
                                <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '600' }}>Storage Overview</h3>
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                                        <span style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>Average File Size</span>
                                        <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '600' }}>
                                            {logFiles.total_files > 0
                                                ? `${(logFiles.total_size_mb / logFiles.total_files).toFixed(2)} MB`
                                                : '0 MB'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                                        <span style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>Storage Format</span>
                                        <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '600' }}>
                                            {logFiles.total_size_bytes >= 1073741824
                                                ? `${(logFiles.total_size_bytes / 1073741824).toFixed(2)} GB`
                                                : logFiles.total_size_bytes >= 1048576
                                                    ? `${(logFiles.total_size_bytes / 1048576).toFixed(2)} MB`
                                                    : logFiles.total_size_bytes >= 1024
                                                        ? `${(logFiles.total_size_bytes / 1024).toFixed(2)} KB`
                                                        : `${logFiles.total_size_bytes} Bytes`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Upload Activity Chart */}
                        <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                            <div style={{ padding: '20px' }}>
                                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>Upload Activity</h3>
                                <div style={{ height: '300px' }}>
                                    <Bar
                                        data={{
                                            labels: uploadsByDate.map(item => item.date),
                                            datasets: [
                                                {
                                                    label: 'Files Uploaded',
                                                    data: uploadsByDate.map(item => item.count),
                                                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                                                    borderColor: 'rgba(59, 130, 246, 1)',
                                                    borderWidth: 1,
                                                },
                                            ],
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: {
                                                    display: false,
                                                },
                                                tooltip: {
                                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                                    padding: 12,
                                                    titleFont: {
                                                        size: 14,
                                                    },
                                                    bodyFont: {
                                                        size: 13,
                                                    },
                                                },
                                            },
                                            scales: {
                                                y: {
                                                    beginAtZero: true,
                                                    ticks: {
                                                        stepSize: 1,
                                                        font: {
                                                            size: 12,
                                                        },
                                                    },
                                                    grid: {
                                                        color: 'rgba(0, 0, 0, 0.05)',
                                                    },
                                                },
                                                x: {
                                                    ticks: {
                                                        font: {
                                                            size: 12,
                                                        },
                                                    },
                                                    grid: {
                                                        display: false,
                                                    },
                                                },
                                            },
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
            {/* Sidebar */}
            <div style={{
                width: '250px',
                backgroundColor: '#d4d4d4ff',
                borderRight: '1px solid #e5e7eb',
                padding: '20px 0'
            }}>
                {/* <div style={{ padding: '0 20px', marginBottom: '24px' }}>
                    <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '700' }}>Admin Panel</h2>
                    <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>{user?.username}</p>
                </div> */}

                <nav>
                    <button
                        onClick={() => setActiveTab('users')}
                        style={{
                            width: '100%',
                            padding: '12px 20px',
                            border: 'none',
                            backgroundColor: activeTab === 'users' ? '#eff6ff' : 'transparent',
                            color: activeTab === 'users' ? '#1e40af' : '#374151',
                            fontSize: '14px',
                            fontWeight: activeTab === 'users' ? '600' : '500',
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderLeft: activeTab === 'users' ? '3px solid #1e40af' : '3px solid transparent',
                            transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => {
                            if (activeTab !== 'users') {
                                e.currentTarget.style.backgroundColor = '#f9fafb';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (activeTab !== 'users') {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        }}
                    >
                        User Management
                    </button>
                    <button
                        onClick={() => setActiveTab('files')}
                        style={{
                            width: '100%',
                            padding: '12px 20px',
                            border: 'none',
                            backgroundColor: activeTab === 'files' ? '#eff6ff' : 'transparent',
                            color: activeTab === 'files' ? '#1e40af' : '#374151',
                            fontSize: '14px',
                            fontWeight: activeTab === 'files' ? '600' : '500',
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderLeft: activeTab === 'files' ? '3px solid #1e40af' : '3px solid transparent',
                            transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => {
                            if (activeTab !== 'files') {
                                e.currentTarget.style.backgroundColor = '#f9fafb';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (activeTab !== 'files') {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        }}
                    >
                        File Management
                    </button>
                </nav>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, padding: '20px' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ marginBottom: '24px' }}>
                        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600' }}>
                            {activeTab === 'users' ? 'User Management' : 'File Management'}
                        </h2>
                        {/* <p style={{ margin: '0', color: '#666' }}>Welcome, {user?.username} ({user?.role})</p> */}
                    </div>

                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;