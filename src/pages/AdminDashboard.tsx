import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Scheme, Application, UserProfile } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Plus, 
  Users, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Edit,
  BarChart3,
  Search,
  PieChart as PieChartIcon,
  Database,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  Legend 
} from 'recharts';

export default function AdminDashboard() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const appStatusData = [
    { name: 'Pending', value: applications.filter(a => a.status === 'pending').length, color: 'hsl(var(--warning))' },
    { name: 'Verified', value: applications.filter(a => a.status === 'verified').length, color: 'hsl(var(--primary))' },
    { name: 'Rejected', value: applications.filter(a => a.status === 'rejected').length, color: 'hsl(var(--destructive))' },
  ].filter(d => d.value > 0);

  const COLORS = ['#f59e0b', '#3b82f6', '#ef4444'];
  
  // New Scheme Form State
  const [newScheme, setNewScheme] = useState({
    title: '',
    description: '',
    category: '',
    minQualification: '12th Pass',
    maxIncome: 500000,
    salary: '',
  });

  useEffect(() => {
    const unsubSchemes = onSnapshot(collection(db, 'schemes'), (snap) => {
      setSchemes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Scheme)));
    });
    const unsubApps = onSnapshot(collection(db, 'applications'), (snap) => {
      setApplications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Application)));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ ...d.data() } as UserProfile)));
      setLoading(false);
    });

    return () => {
      unsubSchemes();
      unsubApps();
      unsubUsers();
    };
  }, []);

  const handleCreateScheme = async () => {
    try {
      await addDoc(collection(db, 'schemes'), {
        ...newScheme,
        eligibility: {
          minQualification: newScheme.minQualification,
          maxIncome: Number(newScheme.maxIncome),
          states: [],
        },
        createdAt: Timestamp.now(),
      });
      toast.success('Scheme created successfully!');
      setNewScheme({
        title: '',
        description: '',
        category: '',
        minQualification: '12th Pass',
        maxIncome: 500000,
        salary: '',
      });
    } catch (error) {
      toast.error('Failed to create scheme');
    }
  };

  const handleUpdateAppStatus = async (appId: string, status: 'verified' | 'rejected', userId: string, schemeTitle: string) => {
    try {
      await updateDoc(doc(db, 'applications', appId), { status });
      
      // Add notification for user
      await addDoc(collection(db, 'notifications'), {
        userId,
        title: `Application ${status === 'verified' ? 'Approved' : 'Rejected'}`,
        message: `Your application for ${schemeTitle} has been ${status}.`,
        read: false,
        createdAt: Timestamp.now(),
      });

      toast.success(`Application ${status}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteScheme = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheme?')) return;
    try {
      await deleteDoc(doc(db, 'schemes', id));
      toast.success('Scheme deleted');
    } catch (error) {
      toast.error('Failed to delete scheme');
    }
  };

  const handleSeedData = async () => {
    setLoading(true);
    const categories = ['Education', 'Healthcare', 'Agriculture', 'Skill Development', 'Housing', 'Social Welfare'];
    const qualifications = ['10th Pass', '12th Pass', 'Graduate', 'Post Graduate', 'Diploma'];
    const states = ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'Uttar Pradesh', 'West Bengal'];
    
    try {
      const promises = [];
      for (let i = 1; i <= 100; i++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const qualification = qualifications[Math.floor(Math.random() * qualifications.length)];
        const state = states[Math.floor(Math.random() * states.length)];
        const income = Math.floor(Math.random() * 8 + 2) * 100000; // 2L to 10L
        
        const schemeData = {
          title: `${category} Support Scheme #${i}`,
          description: `This is a dummy description for ${category} support scheme number ${i}. It provides financial assistance and resources to eligible candidates.`,
          category,
          eligibility: {
            minQualification: qualification,
            maxIncome: income,
            states: Math.random() > 0.5 ? [state] : [],
          },
          salary: `₹${Math.floor(Math.random() * 50 + 10)}k per annum`,
          deadline: Timestamp.fromDate(new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000)), // Random date in next 90 days
          createdAt: Timestamp.now(),
        };
        promises.push(addDoc(collection(db, 'schemes'), schemeData));
      }
      await Promise.all(promises);
      toast.success('100 dummy schemes added successfully!');
    } catch (error) {
      console.error('Seed error:', error);
      toast.error('Failed to seed data');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSchemes = async () => {
    if (!confirm('Are you sure you want to delete ALL schemes? This cannot be undone.')) return;
    setLoading(true);
    try {
      const promises = schemes.map(s => deleteDoc(doc(db, 'schemes', s.id)));
      await Promise.all(promises);
      toast.success('All schemes cleared');
    } catch (error) {
      toast.error('Failed to clear schemes');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUser = async (userId: string, isVerified: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isVerified: !isVerified });
      toast.success(`User ${!isVerified ? 'verified' : 'unverified'}`);
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Control Panel</h1>
          <p className="text-muted-foreground">Manage schemes, verify applications, and monitor user activity.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleSeedData} disabled={loading}>
            <Database className="h-4 w-4" />
            Seed 100 Jobs
          </Button>
          <Button variant="outline" className="gap-2 text-destructive" onClick={handleClearSchemes} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Clear All
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Scheme
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Scheme</DialogTitle>
                <DialogDescription>Fill in the details for the new government scheme or event.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={newScheme.title} onChange={e => setNewScheme({...newScheme, title: e.target.value})} placeholder="e.g. PM Scholarship Scheme" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input value={newScheme.category} onChange={e => setNewScheme({...newScheme, category: e.target.value})} placeholder="e.g. Education" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={newScheme.description} onChange={e => setNewScheme({...newScheme, description: e.target.value})} placeholder="Brief description" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Min Qualification</Label>
                    <Input value={newScheme.minQualification} onChange={e => setNewScheme({...newScheme, minQualification: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Income (₹)</Label>
                    <Input type="number" value={newScheme.maxIncome} onChange={e => setNewScheme({...newScheme, maxIncome: Number(e.target.value)})} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateScheme}>Create Scheme</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Schemes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schemes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Apps</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applications.filter(a => a.status === 'pending').length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Application Distribution
            </CardTitle>
            <CardDescription>Breakdown of applications by their current status</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {appStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={appStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {appStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No application data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              User Verification Status
            </CardTitle>
            <CardDescription>Overview of verified vs unverified student profiles</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Verified', value: users.filter(u => u.isVerified).length },
                    { name: 'Unverified', value: users.filter(u => !u.isVerified).length },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="hsl(var(--primary))" />
                  <Cell fill="hsl(var(--muted))" />
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="schemes">Schemes</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Applications</CardTitle>
              <CardDescription>Review and verify user applications for various schemes.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Scheme</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => {
                    const user = users.find(u => u.uid === app.userId);
                    const scheme = schemes.find(s => s.id === app.schemeId);
                    return (
                      <TableRow key={app.id}>
                        <TableCell>
                          <div className="font-medium">{user?.displayName || 'Unknown User'}</div>
                          <div className="text-xs text-muted-foreground">{user?.email}</div>
                        </TableCell>
                        <TableCell>{scheme?.title || 'Unknown Scheme'}</TableCell>
                        <TableCell>{format(app.submittedAt.toDate(), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          <Badge variant={app.status === 'verified' ? 'default' : app.status === 'rejected' ? 'destructive' : 'secondary'}>
                            {app.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {app.status === 'pending' && (
                            <div className="flex justify-end gap-2">
                              <Button size="icon" variant="outline" className="h-8 w-8 text-green-500" onClick={() => handleUpdateAppStatus(app.id, 'verified', app.userId, scheme?.title || '')}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="outline" className="h-8 w-8 text-destructive" onClick={() => handleUpdateAppStatus(app.id, 'rejected', app.userId, scheme?.title || '')}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schemes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manage Schemes</CardTitle>
              <CardDescription>Edit or delete existing government schemes.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Eligibility</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schemes.map((scheme) => (
                    <TableRow key={scheme.id}>
                      <TableCell className="font-medium">{scheme.title}</TableCell>
                      <TableCell><Badge variant="outline">{scheme.category}</Badge></TableCell>
                      <TableCell className="text-xs">
                        {scheme.eligibility.minQualification} | ₹{scheme.eligibility.maxIncome/100000}L
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteScheme(scheme.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View and manage registered users.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell>
                        <div className="font-medium">{user.displayName}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell className="capitalize">{user.role}</TableCell>
                      <TableCell className="text-xs">{user.state || 'N/A'}, {user.area || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={user.isVerified ? 'default' : 'secondary'}>
                          {user.isVerified ? 'Verified' : 'Unverified'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleVerifyUser(user.uid, user.isVerified)}
                        >
                          {user.isVerified ? 'Unverify' : 'Verify'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
