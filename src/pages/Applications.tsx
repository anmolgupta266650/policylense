import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { Application, Scheme } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Clock, CheckCircle2, XCircle, Search } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';

export default function Applications() {
  const { profile } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [schemes, setSchemes] = useState<Record<string, Scheme>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'applications'),
      where('userId', '==', profile.uid),
      orderBy('submittedAt', 'desc')
    );

    const unsubApps = onSnapshot(q, (snap) => {
      setApplications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Application)));
      setLoading(false);
    });

    const unsubSchemes = onSnapshot(collection(db, 'schemes'), (snap) => {
      const schemeMap: Record<string, Scheme> = {};
      snap.docs.forEach(d => {
        schemeMap[d.id] = { id: d.id, ...d.data() } as Scheme;
      });
      setSchemes(schemeMap);
    });

    return () => {
      unsubApps();
      unsubSchemes();
    };
  }, [profile]);

  const filteredApps = applications.filter(app => {
    const scheme = schemes[app.schemeId];
    return scheme?.title.toLowerCase().includes(search.toLowerCase()) || 
           app.status.toLowerCase().includes(search.toLowerCase());
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Applications</h1>
        <p className="text-muted-foreground">Track the status of your submitted applications and view history.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search applications..." 
          className="pl-10"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Application History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No applications found matching your search.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scheme Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Submitted On</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApps.map((app) => {
                  const scheme = schemes[app.schemeId];
                  return (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">
                        {scheme?.title || 'Loading...'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{scheme?.category || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(app.submittedAt.toDate(), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(app.status)}
                          <span className="capitalize">{app.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground italic text-sm">
                        {app.remarks || 'No remarks yet'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
