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

// Icons
const Icons = {
    Users: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    Files: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
        </svg>
    ),
    Folder: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
    ),
    Database: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
    ),
    HardDrive: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="12" x2="2" y2="12" />
            <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
            <line x1="6" y1="16" x2="6.01" y2="16" />
            <line x1="10" y1="16" x2="10.01" y2="16" />
        </svg>
    ),
    BarChart: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
        </svg>
    ),
    User: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    ),
    Mail: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
        </svg>
    ),
    Shield: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    ),
};

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
    useAuth(); // Ensure user is authenticated
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

    const renderUsersContent = () => (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
        }}>
            {/* Table Header Info */}
            <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div>
                    <h3 style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: '16px',
                        fontWeight: 600,
                        color: '#111827',
                        margin: 0,
                    }}>
                        Registered Users
                    </h3>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                        {users.length} total users in the system
                    </p>
                </div>
                <div style={{
                    padding: '6px 12px',
                    backgroundColor: '#eff6ff',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#2563eb',
                }}>
                    {users.filter(u => u.role === 'admin').length} Admin · {users.filter(u => u.role !== 'admin').length} Users
                </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f9fafb' }}>
                            <th style={{
                                padding: '12px 24px',
                                textAlign: 'left',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Icons.User />
                                    User
                                </div>
                            </th>
                            <th style={{
                                padding: '12px 24px',
                                textAlign: 'left',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Icons.Mail />
                                    Email
                                </div>
                            </th>
                            <th style={{
                                padding: '12px 24px',
                                textAlign: 'left',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Icons.Shield />
                                    Role
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u, index) => (
                            <tr
                                key={u.id}
                                style={{
                                    borderBottom: index < users.length - 1 ? '1px solid #e5e7eb' : 'none',
                                    transition: 'background-color 0.15s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <td style={{ padding: '14px 24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            backgroundColor: u.role === 'admin' ? '#eff6ff' : '#f3f4f6',
                                            color: u.role === 'admin' ? '#2563eb' : '#6b7280',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                        }}>
                                            {u.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p style={{
                                                fontSize: '14px',
                                                fontWeight: 500,
                                                color: '#111827',
                                                margin: 0,
                                            }}>
                                                {u.username}
                                            </p>
                                            <p style={{
                                                fontSize: '12px',
                                                color: '#9ca3af',
                                                margin: 0,
                                            }}>
                                                ID: {u.id}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '14px 24px', fontSize: '14px', color: '#6b7280' }}>
                                    {u.email}
                                </td>
                                <td style={{ padding: '14px 24px' }}>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '4px 12px',
                                        borderRadius: '9999px',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        backgroundColor: u.role === 'admin' ? '#fef3c7' : '#dbeafe',
                                        color: u.role === 'admin' ? '#92400e' : '#1e40af',
                                    }}>
                                        {u.role === 'admin' ? 'Administrator' : 'User'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {users.length === 0 && (
                    <div style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        color: '#6b7280',
                    }}>
                        <Icons.Users />
                        <p style={{ marginTop: '8px', fontSize: '14px' }}>No users found</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderFilesContent = () => (
        <div>
            {/* Statistics Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                marginBottom: '20px',
            }}>
                {/* Total Files Card */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    padding: '20px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{
                                fontSize: '12px',
                                fontWeight: 500,
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                margin: '0 0 8px 0',
                            }}>
                                Total Files
                            </p>
                            <p style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                fontSize: '28px',
                                fontWeight: 700,
                                color: '#111827',
                                margin: 0,
                            }}>
                                {logFiles.total_files}
                            </p>
                        </div>
                        <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '10px',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Icons.Folder />
                        </div>
                    </div>
                </div>

                {/* Total Size (MB) Card */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    padding: '20px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{
                                fontSize: '12px',
                                fontWeight: 500,
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                margin: '0 0 8px 0',
                            }}>
                                Storage Used
                            </p>
                            <p style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                fontSize: '28px',
                                fontWeight: 700,
                                color: '#111827',
                                margin: 0,
                            }}>
                                {logFiles.total_size_mb.toFixed(2)}
                                <span style={{ fontSize: '14px', fontWeight: 500, color: '#6b7280', marginLeft: '4px' }}>MB</span>
                            </p>
                        </div>
                        <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '10px',
                            backgroundColor: '#f0fdf4',
                            color: '#16a34a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Icons.Database />
                        </div>
                    </div>
                </div>

                {/* Average File Size Card */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    padding: '20px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{
                                fontSize: '12px',
                                fontWeight: 500,
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                margin: '0 0 8px 0',
                            }}>
                                Avg File Size
                            </p>
                            <p style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                fontSize: '28px',
                                fontWeight: 700,
                                color: '#111827',
                                margin: 0,
                            }}>
                                {logFiles.total_files > 0
                                    ? (logFiles.total_size_mb / logFiles.total_files).toFixed(2)
                                    : '0'}
                                <span style={{ fontSize: '14px', fontWeight: 500, color: '#6b7280', marginLeft: '4px' }}>MB</span>
                            </p>
                        </div>
                        <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '10px',
                            backgroundColor: '#fef3c7',
                            color: '#d97706',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Icons.Files />
                        </div>
                    </div>
                </div>
            </div>

            {/* Storage Overview */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                padding: '20px',
                marginBottom: '20px',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px',
                }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: '#f3f4f6',
                        color: '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <Icons.HardDrive />
                    </div>
                    <h3 style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: '15px',
                        fontWeight: 600,
                        color: '#111827',
                        margin: 0,
                    }}>
                        Storage Details
                    </h3>
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 14px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                    }}>
                        <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>Total Size (Bytes)</span>
                        <span style={{ fontSize: '13px', color: '#111827', fontWeight: 600, fontFamily: 'monospace' }}>
                            {logFiles.total_size_bytes.toLocaleString()}
                        </span>
                    </div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 14px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                    }}>
                        <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>Formatted Size</span>
                        <span style={{ fontSize: '13px', color: '#111827', fontWeight: 600 }}>
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

            {/* Upload Activity Chart */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                padding: '20px',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '20px',
                }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <Icons.BarChart />
                    </div>
                    <div>
                        <h3 style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: '15px',
                            fontWeight: 600,
                            color: '#111827',
                            margin: 0,
                        }}>
                            Upload Activity
                        </h3>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>
                            Last 30 days
                        </p>
                    </div>
                </div>

                <div style={{ height: '280px' }}>
                    <Bar
                        data={{
                            labels: uploadsByDate.map(item => {
                                const date = new Date(item.date);
                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            }),
                            datasets: [
                                {
                                    label: 'Files Uploaded',
                                    data: uploadsByDate.map(item => item.count),
                                    backgroundColor: 'rgba(37, 99, 235, 0.8)',
                                    borderColor: 'rgba(37, 99, 235, 1)',
                                    borderWidth: 0,
                                    borderRadius: 4,
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
                                    backgroundColor: '#111827',
                                    padding: 12,
                                    titleFont: {
                                        size: 13,
                                        weight: 'bold',
                                    },
                                    bodyFont: {
                                        size: 12,
                                    },
                                    cornerRadius: 8,
                                },
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        stepSize: 1,
                                        font: {
                                            size: 11,
                                        },
                                        color: '#6b7280',
                                    },
                                    grid: {
                                        color: 'rgba(0, 0, 0, 0.04)',
                                    },
                                },
                                x: {
                                    ticks: {
                                        font: {
                                            size: 11,
                                        },
                                        color: '#6b7280',
                                        maxRotation: 45,
                                        minRotation: 45,
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
    );

    const navItems = [
        { id: 'users' as ActiveTab, label: 'User Management', icon: <Icons.Users /> },
        { id: 'files' as ActiveTab, label: 'File Management', icon: <Icons.Files /> },
    ];

    return (
        <div style={{
            display: 'flex',
            minHeight: 'calc(100vh - 56px)',
            backgroundColor: '#f9fafb',
            fontFamily: "'DM Sans', sans-serif",
        }}>
            {/* Sidebar */}
            <div style={{
                width: '240px',
                backgroundColor: 'white',
                borderRight: '1px solid #e5e7eb',
                padding: '20px 0',
                flexShrink: 0,
            }}>
                {/* Sidebar Header */}
                <div style={{ padding: '0 20px', marginBottom: '20px' }}>
                    <h2 style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: '16px',
                        fontWeight: 700,
                        color: '#111827',
                        margin: '0 0 4px 0',
                    }}>
                        Admin Panel
                    </h2>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                        System management
                    </p>
                </div>

                {/* Navigation */}
                <nav style={{ padding: '0 12px' }}>
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 12px',
                                marginBottom: '4px',
                                border: 'none',
                                backgroundColor: activeTab === item.id ? '#eff6ff' : 'transparent',
                                color: activeTab === item.id ? '#2563eb' : '#374151',
                                fontSize: '13px',
                                fontWeight: activeTab === item.id ? 600 : 500,
                                textAlign: 'left',
                                cursor: 'pointer',
                                borderRadius: '8px',
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => {
                                if (activeTab !== item.id) {
                                    e.currentTarget.style.backgroundColor = '#f9fafb';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== item.id) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }
                            }}
                        >
                            <span style={{ display: 'flex' }}>{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    {/* Page Header */}
                    <div style={{ marginBottom: '24px' }}>
                        <h1 style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: '22px',
                            fontWeight: 700,
                            color: '#111827',
                            margin: '0 0 6px 0',
                        }}>
                            {activeTab === 'users' ? 'User Management' : 'File Management'}
                        </h1>
                        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                            {activeTab === 'users'
                                ? 'View and manage registered users'
                                : 'Monitor storage usage and upload activity'}
                        </p>
                    </div>

                    {/* Content */}
                    {activeTab === 'users' ? renderUsersContent() : renderFilesContent()}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;