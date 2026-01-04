import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI, seedAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import {
  FileText,
  Users,
  Star,
  Bell,
  Calendar,
  Database,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await dashboardAPI.getStats();
      setStats(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      await seedAPI.seedData();
      toast.success('Données de démonstration créées');
      fetchStats();
    } catch (error) {
      const message = error.response?.data?.detail || 'Erreur lors de la création des données';
      toast.error(message);
    } finally {
      setSeeding(false);
    }
  };

  const roleLabels = {
    admin: 'Administrateur',
    direction: 'Direction',
    personnel_soignant: 'Personnel Soignant',
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">
            Bienvenue, {user?.name} ({roleLabels[user?.role]})
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={fetchStats} data-testid="refresh-stats">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          {isAdmin && stats?.total_documents === 0 && (
            <Button size="sm" onClick={handleSeedData} disabled={seeding} data-testid="seed-data">
              <Database className="w-4 h-4 mr-2" />
              {seeding ? 'Création...' : 'Données démo'}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Documents
            </CardTitle>
            <FileText className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total_documents || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Documents accessibles</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Favoris
            </CardTitle>
            <Star className="w-5 h-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total_favorites || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Documents favoris</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Notifications
            </CardTitle>
            <Bell className="w-5 h-5 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.unread_notifications || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Non lues</p>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Utilisateurs
              </CardTitle>
              <Users className="w-5 h-5 text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.total_users || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Utilisateurs enregistrés</p>
            </CardContent>
          </Card>
        )}

        {!isAdmin && (
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Dernière mise à jour
              </CardTitle>
              <Calendar className="w-5 h-5 text-chart-4" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {stats?.recent_documents?.[0]?.date
                  ? new Date(stats.recent_documents[0].date).toLocaleDateString('fr-FR')
                  : 'Aucune'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Dernier document ajouté</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documents by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Documents par catégorie</CardTitle>
            <CardDescription>Répartition des documents</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.documents_by_category?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.documents_by_category}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    name="Documents"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users by Role (Admin only) */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs par rôle</CardTitle>
              <CardDescription>Répartition des utilisateurs</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.users_by_role?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.users_by_role} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 12 }}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--chart-2))"
                      radius={[0, 4, 4, 0]}
                      name="Utilisateurs"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Aucune donnée disponible
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Documents récents</CardTitle>
          <CardDescription>Les derniers documents ajoutés</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recent_documents?.length > 0 ? (
            <div className="space-y-4">
              {stats.recent_documents.map((doc, index) => (
                <div
                  key={doc.id || index}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-sm text-muted-foreground">{doc.category}</p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(doc.date).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun document récent</p>
              {isAdmin && (
                <p className="text-sm mt-2">
                  Cliquez sur "Données démo" pour créer des exemples
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
