import React, { useState, useEffect } from 'react';
import { aiAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import {
  Bot,
  RefreshCw,
  Send,
  Sparkles,
  MessageSquare,
  FileText,
  Clock,
} from 'lucide-react';

const AIAssistant = () => {
  const [activeTab, setActiveTab] = useState('context');
  const [contextSuggestions, setContextSuggestions] = useState(null);
  const [enhancedSuggestions, setEnhancedSuggestions] = useState(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [loadingEnhanced, setLoadingEnhanced] = useState(false);
  const [question, setQuestion] = useState('');
  const [qaResponse, setQaResponse] = useState(null);
  const [loadingQA, setLoadingQA] = useState(false);
  const [qaHistory, setQaHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchContextSuggestions = async () => {
    setLoadingContext(true);
    try {
      const response = await aiAPI.getContextSuggestions();
      setContextSuggestions(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des suggestions contextuelles');
    } finally {
      setLoadingContext(false);
    }
  };

  const fetchEnhancedSuggestions = async () => {
    setLoadingEnhanced(true);
    try {
      const response = await aiAPI.getEnhancedSuggestions();
      setEnhancedSuggestions(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des suggestions avancées');
    } finally {
      setLoadingEnhanced(false);
    }
  };

  const fetchQAHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await aiAPI.getQAHistory();
      setQaHistory(response.data);
    } catch (error) {
      console.error('Error fetching QA history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoadingQA(true);
    try {
      const response = await aiAPI.askQuestion(question);
      setQaResponse(response.data);
      setQuestion('');
      fetchQAHistory();
    } catch (error) {
      toast.error('Erreur lors du traitement de votre question');
    } finally {
      setLoadingQA(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'context' && !contextSuggestions) {
      fetchContextSuggestions();
    } else if (activeTab === 'enhanced' && !enhancedSuggestions) {
      fetchEnhancedSuggestions();
    } else if (activeTab === 'qa') {
      fetchQAHistory();
    }
  }, [activeTab]);

  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (line.startsWith('### ')) {
        return <h3 key={i} className="font-semibold text-lg mt-4 mb-2">{line.slice(4)}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="font-bold text-xl mt-4 mb-2">{line.slice(3)}</h2>;
      }
      if (line.startsWith('# ')) {
        return <h1 key={i} className="font-bold text-2xl mt-4 mb-2">{line.slice(2)}</h1>;
      }
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return <li key={i} className="ml-4 mb-1">{line.slice(2)}</li>;
      }
      if (line.match(/^\d+\. /)) {
        return <li key={i} className="ml-4 mb-1 list-decimal">{line.replace(/^\d+\. /, '')}</li>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-semibold mb-2">{line.slice(2, -2)}</p>;
      }
      if (line.trim() === '') {
        return <br key={i} />;
      }
      return <p key={i} className="mb-2">{line}</p>;
    });
  };

  return (
    <div className="space-y-6" data-testid="ai-assistant">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Bot className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assistant IA</h1>
          <p className="text-muted-foreground">Suggestions intelligentes basées sur vos documents</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="context" data-testid="tab-context">
            <MessageSquare className="w-4 h-4 mr-2" />
            Contextuel
          </TabsTrigger>
          <TabsTrigger value="enhanced" data-testid="tab-enhanced">
            <Sparkles className="w-4 h-4 mr-2" />
            Avancé
          </TabsTrigger>
          <TabsTrigger value="qa" data-testid="tab-qa">
            <Bot className="w-4 h-4 mr-2" />
            Q&A
          </TabsTrigger>
        </TabsList>

        {/* Contextual Suggestions */}
        <TabsContent value="context" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Suggestions Contextuelles</CardTitle>
                <CardDescription>
                  Suggestions basées sur vos documents récents
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchContextSuggestions}
                disabled={loadingContext}
                data-testid="refresh-context"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingContext ? 'animate-spin' : ''}`} />
                Rafraîchir
              </Button>
            </CardHeader>
            <CardContent>
              {loadingContext ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : contextSuggestions ? (
                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {renderMarkdown(contextSuggestions.response)}
                  </div>
                  {contextSuggestions.sources?.length > 0 && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Sources utilisées:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {contextSuggestions.sources.map((source, i) => (
                          <Badge key={i} variant="secondary">{source}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Cliquez sur "Rafraîchir" pour obtenir des suggestions
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enhanced Suggestions */}
        <TabsContent value="enhanced" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Analyse Avancée</CardTitle>
                <CardDescription>
                  Analyse approfondie avec points clés et recommandations
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchEnhancedSuggestions}
                disabled={loadingEnhanced}
                data-testid="refresh-enhanced"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingEnhanced ? 'animate-spin' : ''}`} />
                Rafraîchir
              </Button>
            </CardHeader>
            <CardContent>
              {loadingEnhanced ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : enhancedSuggestions ? (
                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {renderMarkdown(enhancedSuggestions.response)}
                  </div>
                  {enhancedSuggestions.sources?.length > 0 && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Sources analysées:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {enhancedSuggestions.sources.map((source, i) => (
                          <Badge key={i} variant="secondary">{source}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Cliquez sur "Rafraîchir" pour obtenir une analyse avancée
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Q&A */}
        <TabsContent value="qa" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Question Form */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Posez votre question</CardTitle>
                  <CardDescription>
                    L'IA répondra en se basant sur vos documents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAskQuestion} className="space-y-4">
                    <Textarea
                      placeholder="Ex: Quel est le protocole d'hygiène des mains ?"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      className="min-h-[100px] resize-none"
                      data-testid="qa-input"
                    />
                    <Button
                      type="submit"
                      disabled={loadingQA || !question.trim()}
                      className="w-full"
                      data-testid="qa-submit"
                    >
                      {loadingQA ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Traitement...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Envoyer
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Response */}
              {qaResponse && (
                <Card data-testid="qa-response">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-primary" />
                      Réponse de l'Assistant
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      {renderMarkdown(qaResponse.response)}
                    </div>
                    {qaResponse.sources?.length > 0 && (
                      <div className="pt-4 mt-4 border-t">
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Documents consultés:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {qaResponse.sources.map((source, i) => (
                            <Badge key={i} variant="secondary">{source}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* History */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Historique
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  {loadingHistory ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-16" />
                      ))}
                    </div>
                  ) : qaHistory.length > 0 ? (
                    <div className="space-y-4">
                      {qaHistory.map((item, index) => (
                        <div
                          key={item.id || index}
                          className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                          onClick={() => setQuestion(item.question)}
                        >
                          <p className="text-sm font-medium line-clamp-2">{item.question}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(item.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Aucune question posée
                    </p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIAssistant;
