import React, { useState, useEffect } from 'react';
import { favoritesAPI, documentsAPI } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  Star,
  StarOff,
  FileText,
  Download,
  Eye,
  Calendar,
  FolderOpen,
  FileImage,
  FileSpreadsheet,
  File,
} from 'lucide-react';

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const getFileIcon = (fileType) => {
    if (!fileType) return FileText;
    if (['.png', '.jpg', '.jpeg', '.gif'].includes(fileType)) return FileImage;
    if (['.xlsx', '.xls'].includes(fileType)) return FileSpreadsheet;
    if (['.pdf'].includes(fileType)) return FileText;
    return File;
  };

  const fetchFavorites = async () => {
    try {
      const response = await favoritesAPI.getAll();
      setFavorites(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des favoris');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleRemoveFavorite = async (docId) => {
    try {
      await favoritesAPI.remove(docId);
      toast.success('Retiré des favoris');
      fetchFavorites();
    } catch (error) {
      toast.error('Erreur lors de la suppression du favori');
    }
  };

  const openView = (doc) => {
    setSelectedDoc(doc);
    setIsViewOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="favorites-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
          Mes Favoris
        </h1>
        <p className="text-muted-foreground mt-1">
          Accès rapide à vos documents importants ({favorites.length} document{favorites.length > 1 ? 's' : ''})
        </p>
      </div>

      {/* Favorites List */}
      {favorites.length > 0 ? (
        <div className="grid gap-4">
          {favorites.map((doc) => {
            const FileIcon = getFileIcon(doc.file_type);
            
            return (
              <Card key={doc.id} className="card-hover" data-testid={`favorite-${doc.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        doc.file_type ? 'bg-chart-2/10' : 'bg-primary/10'
                      }`}>
                        <FileIcon className={`w-6 h-6 ${doc.file_type ? 'text-chart-2' : 'text-primary'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{doc.title}</h3>
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {doc.content?.substring(0, 150)}...
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <FolderOpen className="w-3 h-3" />
                            {doc.category_name}
                          </Badge>
                          {doc.file_type && (
                            <Badge variant="outline" className="uppercase text-xs">
                              {doc.file_type.replace('.', '')}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openView(doc)}>
                        <Eye className="w-4 h-4 mr-1" />
                        Voir
                      </Button>
                      {doc.file_url && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(documentsAPI.getFile(doc.id), '_blank')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFavorite(doc.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <StarOff className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Aucun favori</p>
            <p className="text-sm text-muted-foreground mt-1">
              Marquez des documents comme favoris pour y accéder rapidement
            </p>
          </CardContent>
        </Card>
      )}

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDoc?.title}
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{selectedDoc?.category_name}</Badge>
              {selectedDoc?.file_type && (
                <Badge variant="outline" className="uppercase">{selectedDoc.file_type.replace('.', '')}</Badge>
              )}
              <span>{selectedDoc?.created_at && new Date(selectedDoc.created_at).toLocaleDateString('fr-FR')}</span>
            </DialogDescription>
          </DialogHeader>
          
          {selectedDoc?.file_url && (
            <div className="mb-4">
              <Button variant="outline" onClick={() => window.open(documentsAPI.getFile(selectedDoc.id), '_blank')}>
                <Download className="w-4 h-4 mr-2" />
                Télécharger le fichier
              </Button>
            </div>
          )}
          
          <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap bg-muted/30 p-4 rounded-lg">
            {selectedDoc?.content}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Favorites;
