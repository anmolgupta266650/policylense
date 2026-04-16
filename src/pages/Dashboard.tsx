import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { Application, Notification, Scheme } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Bell, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getSchemeRecommendations } from '../services/geminiService';
import { Sparkles } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function Dashboard() {
  const { profile } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [recentSchemes, setRecentSchemes] = useState<Scheme[]>([]);
  const [aiRecommendation, setAiRecommendation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;

    // Applications
    const appQuery = query(
      collection(db, 'applications'),
      where('userId', '==', profile.uid),
      orderBy('submittedAt', 'desc'),
      limit(5)
    );
    const unsubApps = onSnapshot(appQuery, (snap) => {
      setApplications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Application)));
    });

    // Notifications
    const notifQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsubNotifs = onSnapshot(notifQuery, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
    });

    // Recent Schemes for recommendations
    const schemeQuery = query(
      collection(db, 'schemes'),
      orderBy('createdAt', 'desc'),
      limit(3)
    );
    const unsubSchemes = onSnapshot(schemeQuery, (snap) => {
      const schemes = snap.docs.map(d => ({ id: d.id, ...d.data() } as Scheme));
      setRecentSchemes(schemes);
      setLoading(false);
      
      // Fetch AI recommendations if schemes exist
      if (schemes.length > 0 && !aiRecommendation) {
        setAiLoading(true);
        getSchemeRecommendations(profile, schemes).then(rec => {
          setAiRecommendation(rec);
          setAiLoading(false);
        });
      }
    });

    return () => {
      unsubApps();
      unsubNotifs();
      unsubSchemes();
    };
  }, [profile]);

  const stats = [
    { 
      label: 'Total Applications', 
      value: applications.length, 
      icon: FileText, 
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    { 
      label: 'Verified', 
      value: applications.filter(a => a.status === 'verified').length, 
      icon: CheckCircle2, 
      color: 'text-green-500',
      bg: 'bg-green-500/10'
    },
    { 
      label: 'Pending', 
      value: applications.filter(a => a.status === 'pending').length, 
      icon: Clock, 
      color: 'text-amber-500',
      bg: 'bg-amber-500/10'
    },
    { 
      label: 'Notifications', 
      value: notifications.filter(n => !n.read).length, 
      icon: Bell, 
      color: 'text-purple-500',
      bg: 'bg-purple-500/10'
    },
  ];

  const chartData = [
    { name: 'Jan', apps: 2 },
    { name: 'Feb', apps: 5 },
    { name: 'Mar', apps: 3 },
    { name: 'Apr', apps: applications.length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {profile?.displayName || 'User'}!</h1>
          <p className="text-muted-foreground">Here's what's happening with your applications today.</p>
        </div>
        <div className="flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
          <Award className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">
            {profile?.isVerified ? 'Verified Profile' : 'Pending Verification'}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={stat.bg + " p-2 rounded-lg"}>
                  <stat.icon className={stat.color + " h-6 w-6"} />
                </div>
                <span className="text-2xl font-bold">{stat.value}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-4">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Application Trends
            </CardTitle>
            <CardDescription>Your application activity over the last few months</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pl-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: 'hsl(var(--muted)/0.5)'}}
                  contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px'}}
                />
                <Bar dataKey="apps" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? 'hsl(var(--primary))' : 'hsl(var(--primary)/0.3)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Recent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No new notifications</p>
            ) : (
              <div className="space-y-4">
                {notifications.map((notif) => (
                  <div key={notif.id} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                    <div className={cn(
                      "h-2 w-2 mt-1.5 rounded-full shrink-0",
                      notif.read ? "bg-muted" : "bg-primary"
                    )} />
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{notif.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-muted-foreground">{format(notif.createdAt.toDate(), 'MMM dd, HH:mm')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Applications</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/applications">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No applications yet</p>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Scheme ID: {app.schemeId.slice(0, 8)}...</p>
                        <p className="text-xs text-muted-foreground">{format(app.submittedAt.toDate(), 'MMM dd, yyyy')}</p>
                      </div>
                    </div>
                    <Badge variant={
                      app.status === 'verified' ? 'default' : 
                      app.status === 'rejected' ? 'destructive' : 'secondary'
                    }>
                      {app.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aiLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-full"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-5/6"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-4/6"></div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic leading-relaxed">
                "{aiRecommendation || 'Complete your profile to get personalized AI recommendations.'}"
              </p>
            )}
          </CardContent>
          <CardHeader className="pt-0 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recommended for You</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/schemes">Explore More</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentSchemes.map((scheme) => (
              <div key={scheme.id} className="group relative rounded-lg border p-4 hover:border-primary transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="text-[10px]">{scheme.category}</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h4 className="font-medium text-sm mb-1">{scheme.title}</h4>
                <p className="text-xs text-muted-foreground line-clamp-1">{scheme.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
