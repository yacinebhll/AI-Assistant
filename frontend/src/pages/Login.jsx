import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Stethoscope, Mail, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Connexion réussie');
      navigate('/dashboard');
    } catch (err) {
      const message = err.response?.data?.detail || 'Erreur de connexion';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left - Form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary flex items-center justify-center mb-4">
              <Stethoscope className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Assistant IA Médical</h1>
            <p className="text-muted-foreground mt-2">Connectez-vous à votre compte</p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">Connexion</CardTitle>
              <CardDescription>
                Entrez vos identifiants pour accéder à l'application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="vous@hopital.fr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      data-testid="login-email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      data-testid="login-password"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  data-testid="login-submit"
                >
                  {loading ? 'Connexion...' : 'Se connecter'}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Pas encore de compte ? </span>
                <Link to="/register" className="text-primary hover:underline font-medium">
                  S'inscrire
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right - Image */}
      <div
        className="hidden lg:block bg-cover bg-center relative"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1682684123154-c21854fd90cf?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwzfHxtZWRpY2FsJTIwdGVjaG5vbG9neSUyMGFic3RyYWN0JTIwbWluaW1hbGlzdHxlbnwwfHx8fDE3Njc1MzI2MTl8MA&ixlib=rb-4.1.0&q=85')`,
        }}
      >
        <div className="absolute inset-0 bg-primary/80 flex items-center justify-center p-12">
          <div className="text-white max-w-lg text-center">
            <h2 className="text-3xl font-bold mb-4">
              Bienvenue sur l'Assistant IA Médical
            </h2>
            <p className="text-white/90 text-lg leading-relaxed">
              Une solution intelligente pour gérer vos documents administratifs,
              obtenir des suggestions contextuelles et améliorer l'efficacité de votre équipe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
