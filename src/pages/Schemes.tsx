import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, Timestamp, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { Scheme, Application } from '../types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, Filter, Calendar, IndianRupee, GraduationCap, ArrowRight, Heart, SortAsc, SortDesc, Copy } from 'lucide-react';
import { format } from 'date-fns';

export default function Schemes() {
  const { profile } = useAuth();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const [compareList, setCompareList] = useState<Scheme[]>([]);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'schemes'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Scheme[];
      setSchemes(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredSchemes = schemes
    .filter(scheme => {
      const matchesSearch = scheme.title.toLowerCase().includes(search.toLowerCase()) || 
                           scheme.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || scheme.category === categoryFilter;
      
      const isBookmarked = profile?.bookmarks?.includes(scheme.id);
      const matchesBookmark = !showBookmarksOnly || isBookmarked;

      // Auto-filter based on user qualifications if profile exists
      const matchesQualification = !profile || profile.qualifications.length === 0 || 
                                  scheme.eligibility.minQualification === 'None' ||
                                  profile.qualifications.includes(scheme.eligibility.minQualification);
      
      const matchesIncome = !profile || profile.income === 0 || 
                           scheme.eligibility.maxIncome === 0 ||
                           profile.income <= scheme.eligibility.maxIncome;

      return matchesSearch && matchesCategory && matchesQualification && matchesIncome && matchesBookmark;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt?.toMillis() - a.createdAt?.toMillis();
      if (sortBy === 'oldest') return a.createdAt?.toMillis() - b.createdAt?.toMillis();
      if (sortBy === 'deadline') return a.deadline?.toMillis() - b.deadline?.toMillis();
      if (sortBy === 'income-desc') return b.eligibility.maxIncome - a.eligibility.maxIncome;
      if (sortBy === 'income-asc') return a.eligibility.maxIncome - b.eligibility.maxIncome;
      return 0;
    });

  const handleToggleBookmark = async (e: React.MouseEvent, schemeId: string) => {
    e.stopPropagation();
    if (!profile) {
      toast.error('Please login to bookmark schemes');
      return;
    }

    const isBookmarked = profile.bookmarks?.includes(schemeId);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        bookmarks: isBookmarked ? arrayRemove(schemeId) : arrayUnion(schemeId)
      });
      toast.success(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
    } catch (error) {
      toast.error('Failed to update bookmarks');
    }
  };

  const handleToggleCompare = (scheme: Scheme) => {
    if (compareList.find(s => s.id === scheme.id)) {
      setCompareList(compareList.filter(s => s.id !== scheme.id));
    } else {
      if (compareList.length >= 2) {
        toast.error('You can only compare up to 2 schemes at a time.');
        return;
      }
      setCompareList([...compareList, scheme]);
    }
  };

  const handleApply = async (scheme: Scheme) => {
    if (!profile) return;
    setApplying(true);
    try {
      const application: Omit<Application, 'id'> = {
        userId: profile.uid,
        schemeId: scheme.id,
        status: 'pending',
        submittedAt: Timestamp.now(),
        remarks: '',
        formData: {
          userName: profile.displayName,
          userEmail: profile.email,
          userIncome: profile.income,
          userQualifications: profile.qualifications,
        }
      };
      await addDoc(collection(db, 'applications'), application);
      
      // Add notification
      await addDoc(collection(db, 'notifications'), {
        userId: profile.uid,
        title: 'Application Submitted',
        message: `Your application for ${scheme.title} has been submitted successfully.`,
        read: false,
        createdAt: Timestamp.now(),
      });

      toast.success('Application submitted successfully!');
      setSelectedScheme(null);
    } catch (error: any) {
      console.error('Apply error:', error);
      toast.error('Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  const categories = Array.from(new Set(schemes.map(s => s.category)));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Government Schemes</h1>
          <p className="text-muted-foreground">Discover and apply for schemes you are eligible for</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search schemes, events, or keywords..." 
            className="pl-10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="deadline">Deadline First</SelectItem>
              <SelectItem value="income-desc">Income (High to Low)</SelectItem>
              <SelectItem value="income-asc">Income (Low to High)</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant={showBookmarksOnly ? "default" : "outline"}
            onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
            className="gap-2"
          >
            <Heart className={`h-4 w-4 ${showBookmarksOnly ? 'fill-current' : ''}`} />
            Bookmarks
          </Button>
        </div>
      </div>

      {compareList.length > 0 && (
        <Card className="bg-primary/5 border-primary/20 sticky top-4 z-20 shadow-lg">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-primary text-primary-foreground">
                {compareList.length} Selected
              </Badge>
              <div className="flex -space-x-2">
                {compareList.map(s => (
                  <div key={s.id} className="h-8 w-8 rounded-full bg-background border-2 border-primary flex items-center justify-center text-[10px] font-bold overflow-hidden">
                    {s.title.charAt(0)}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setCompareList([])}>Clear</Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={compareList.length < 2}>Compare Now</Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Scheme Comparison</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-8 py-6">
                    {compareList.map(s => (
                      <div key={s.id} className="space-y-6">
                        <div>
                          <Badge className="mb-2">{s.category}</Badge>
                          <h3 className="text-xl font-bold">{s.title}</h3>
                        </div>
                        <div className="space-y-4">
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Eligibility</p>
                            <p className="text-sm">{s.eligibility.minQualification}</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Income Limit</p>
                            <p className="text-sm">₹{s.eligibility.maxIncome.toLocaleString()}</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Benefits</p>
                            <p className="text-sm">{s.salary}</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Deadline</p>
                            <p className="text-sm">{format(s.deadline.toDate(), 'MMM dd, yyyy')}</p>
                          </div>
                        </div>
                        <Button className="w-full" onClick={() => handleApply(s)}>Apply for this</Button>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-muted rounded-t-lg" />
              <CardHeader><div className="h-6 bg-muted rounded w-3/4" /></CardHeader>
              <CardContent><div className="h-4 bg-muted rounded w-full mb-2" /><div className="h-4 bg-muted rounded w-2/3" /></CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSchemes.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-2xl">
          <div className="bg-muted h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">No schemes found</h3>
          <p className="text-muted-foreground">Try adjusting your filters or search terms</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSchemes.map((scheme) => (
            <Card key={scheme.id} className="flex flex-col hover:shadow-lg transition-all border-l-4 border-l-primary relative group">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleToggleBookmark(e, scheme.id)}
              >
                <Heart className={`h-5 w-5 ${profile?.bookmarks?.includes(scheme.id) ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-12 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleToggleCompare(scheme)}
              >
                <Copy className={`h-5 w-5 ${compareList.find(s => s.id === scheme.id) ? 'text-primary' : 'text-muted-foreground'}`} />
              </Button>
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary">{scheme.category}</Badge>
                  {scheme.deadline && (
                    <div className="flex items-center text-xs text-destructive font-medium">
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(scheme.deadline.toDate(), 'MMM dd, yyyy')}
                    </div>
                  )}
                </div>
                <CardTitle className="line-clamp-1">{scheme.title}</CardTitle>
                <CardDescription className="line-clamp-2">{scheme.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
                    <span>{scheme.eligibility.minQualification}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <IndianRupee className="h-4 w-4" />
                    <span>Max ₹{scheme.eligibility.maxIncome / 100000}L</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full group" onClick={() => setSelectedScheme(scheme)}>
                      View Details
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>{scheme.category}</Badge>
                        <span className="text-sm text-muted-foreground">ID: {scheme.id}</span>
                      </div>
                      <DialogTitle className="text-2xl">{scheme.title}</DialogTitle>
                      <DialogDescription className="text-base pt-2">
                        {scheme.description}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid md:grid-cols-2 gap-6 py-4">
                      <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Filter className="h-4 w-4 text-primary" />
                          Eligibility Criteria
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li className="flex justify-between border-b pb-1">
                            <span className="text-muted-foreground">Qualification:</span>
                            <span className="font-medium">{scheme.eligibility.minQualification}</span>
                          </li>
                          <li className="flex justify-between border-b pb-1">
                            <span className="text-muted-foreground">Income Limit:</span>
                            <span className="font-medium">₹{scheme.eligibility.maxIncome.toLocaleString()}</span>
                          </li>
                          <li className="flex justify-between border-b pb-1">
                            <span className="text-muted-foreground">States:</span>
                            <span className="font-medium">{scheme.eligibility.states.join(', ') || 'All India'}</span>
                          </li>
                        </ul>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <IndianRupee className="h-4 w-4 text-primary" />
                          Benefits
                        </h4>
                        <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                          <p className="text-sm font-medium text-primary">{scheme.salary || 'Varies based on eligibility'}</p>
                        </div>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button 
                        className="w-full md:w-auto" 
                        size="lg"
                        onClick={() => handleApply(scheme)}
                        disabled={applying}
                      >
                        {applying ? 'Submitting...' : 'Apply Now'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
